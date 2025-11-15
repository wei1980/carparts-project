// scripts/merge_duplicate_variants.js
// 用途：合併 vehicle_variants 中 (model_id, engine_code|null->'', year_from, year_to) 重複的群組
// 策略：為每個重複群組挑一筆 keeper（優先：有 generation_id，其次 id 最小），
//       將其他重複（dups）的 part_compatibilities 搬到 keeper（避免重覆建立），最後刪除 dups。
// 參數：--dry 只列印計畫，不動資料
//       --apply 實際執行（可與 --backup 一起）
//       --backup 先備份涉及的 rows 到 *_backup_<timestamp> 表
//
// 注意：執行前請先確保已經沒有應用程式在大量寫入這幾張表（建議停用 API）

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DO_APPLY = args.includes('--apply') || args.includes('--doit');
const DO_BACKUP = args.includes('--backup');
const DRY_RUN = !DO_APPLY;

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function backupTables(dupIds) {
  if (!dupIds.length) return;
  const tag = ts();
  const vvBackup = `vehicle_variants_backup_${tag}`;
  const pcBackup = `part_compatibilities_backup_${tag}`;

  console.log(`🧰 建立備份表: ${vvBackup}, ${pcBackup}`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${vvBackup}" AS TABLE "vehicle_variants" WITH NO DATA;`);
  await prisma.$executeRawUnsafe(`INSERT INTO "${vvBackup}" SELECT * FROM "vehicle_variants" WHERE id = ANY($1::int[])`, dupIds);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${pcBackup}" AS TABLE "part_compatibilities" WITH NO DATA;`);
  await prisma.$executeRawUnsafe(`INSERT INTO "${pcBackup}" SELECT * FROM "part_compatibilities" WHERE vehicle_variant_id = ANY($1::int[])`, dupIds);

  console.log(`✅ 備份完成：variants=${dupIds.length}，compat=${(await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${pcBackup}"`))[0].count}`);
}

async function detectDuplicates() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT model_id,
           COALESCE(engine_code, '') AS engine_code,
           year_from, year_to,
           COUNT(*) AS cnt,
           ARRAY_AGG(id ORDER BY id) AS ids
    FROM vehicle_variants
    GROUP BY model_id, COALESCE(engine_code,''), year_from, year_to
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC, model_id ASC;
  `);
  return rows.map(r => ({
    model_id: Number(r.model_id),
    engine_code: r.engine_code,
    year_from: Number(r.year_from),
    year_to: Number(r.year_to),
    cnt: Number(r.cnt),
    ids: r.ids.map(Number),
  }));
}

async function pickKeeper(group) {
  // 優先選：有 generation_id 的；若多筆皆有，取 id 最小；否則取全體中 id 最小
  const vv = await prisma.vehicle_variants.findMany({
    where: {
      model_id: group.model_id,
      year_from: group.year_from,
      year_to: group.year_to,
      OR: [{ engine_code: group.engine_code || null }, { engine_code: group.engine_code }],
      id: { in: group.ids },
    },
    select: { id: true, generation_id: true }
  });
  const withGen = vv.filter(v => v.generation_id != null).sort((a,b)=>a.id-b.id);
  if (withGen.length) return withGen[0].id;
  return Math.min(...group.ids);
}

async function bestGenerationId(group) {
  // 取該群組內非空的 generation_id，若有多個不同，以「出現次數最多」→「id 最小」為準
  const vv = await prisma.vehicle_variants.findMany({
    where: {
      id: { in: group.ids }
    },
    select: { generation_id: true }
  });
  const counts = new Map();
  for (const v of vv) {
    if (v.generation_id == null) continue;
    counts.set(v.generation_id, (counts.get(v.generation_id) || 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a,b)=> (b[1]-a[1]) || (a[0]-b[0]))[0][0];
}

async function moveCompat(fromId, toId) {
  const comps = await prisma.part_compatibilities.findMany({
    where: { vehicle_variant_id: fromId },
    select: { id: true, part_id: true, note: true }
  });
  let created = 0, skipped = 0;
  for (const c of comps) {
    // 避免依賴 DB 上的複合唯一（有些環境還沒建好），先查再建
    const exists = await prisma.part_compatibilities.findFirst({
      where: { part_id: c.part_id, vehicle_variant_id: toId },
      select: { id: true }
    });
    if (exists) { skipped++; continue; }
    await prisma.part_compatibilities.create({
      data: { part_id: c.part_id, vehicle_variant_id: toId, note: c.note }
    });
    created++;
  }
  // 刪掉 fromId 的綁定
  await prisma.part_compatibilities.deleteMany({ where: { vehicle_variant_id: fromId } });
  return { created, skipped, removed: comps.length };
}

async function mergeGroup(group) {
  const keeperId = await pickKeeper(group);
  const dupIds = group.ids.filter(id => id !== keeperId);
  const bestGen = await bestGenerationId(group);

  // 如 keeper 無 generation_id，而群組內有人有，則補上
  const keeper = await prisma.vehicle_variants.findUnique({ where: { id: keeperId } });
  if (!keeper) throw new Error(`keeper not found: ${keeperId}`);

  if (keeper.generation_id == null && bestGen != null) {
    await prisma.vehicle_variants.update({
      where: { id: keeperId },
      data: { generation_id: bestGen }
    });
  }

  let totalCreated = 0, totalSkipped = 0, totalRemoved = 0;

  for (const id of dupIds) {
    const moved = await moveCompat(id, keeperId);
    totalCreated += moved.created;
    totalSkipped += moved.skipped;
    totalRemoved += moved.removed;
    await prisma.vehicle_variants.delete({ where: { id } });
  }

  return { keeperId, dupCount: dupIds.length, totalCreated, totalSkipped, totalRemoved };
}

async function main() {
  try {
    const groups = await detectDuplicates();
    if (groups.length === 0) {
      console.log('✅ 沒有重複群組，無需處理');
      return;
    }

    console.log(`📦 偵測到 ${groups.length} 個重複群組：`);
    for (const g of groups) {
      console.log(`  model_id=${g.model_id}, engine="${g.engine_code}", years=${g.year_from}-${g.year_to}, rows=${g.cnt}, ids=${g.ids.join(',')}`);
    }

    if (DRY_RUN) {
      console.log('\n(乾跑) 如要實際合併，請加上 --apply 或 --doit 參數；可搭配 --backup 做備份。');
      return;
    }

    // 收集所有要刪除的 dup id，供備份用
    const allDupIds = [];
    for (const g of groups) {
      const keeperId = await pickKeeper(g);
      g.keeperId = keeperId;
      g.dupIds = g.ids.filter(id => id !== keeperId);
      allDupIds.push(...g.dupIds);
    }

    if (DO_BACKUP && allDupIds.length) {
      await backupTables(allDupIds);
    }

    // 逐群組執行（每組用交易，確保一致性）
    for (const g of groups) {
      console.log(`\n🔧 合併群組：model_id=${g.model_id}, engine="${g.engine_code}", years=${g.year_from}-${g.year_to}`);
      console.log(`   keeper=${g.keeperId}, dups=[${g.dupIds.join(',')}]`);
      const result = await prisma.$transaction(async () => {
        return await mergeGroup(g);
      });
      console.log(`   ✅ done: moved=${result.totalCreated} (skip=${result.totalSkipped}), removedCompat=${result.totalRemoved}, deletedVariants=${result.dupCount}`);
    }

    console.log('\n🎉 所有重複群組已合併完畢');
  } catch (e) {
    console.error('❌ 合併失敗：', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
