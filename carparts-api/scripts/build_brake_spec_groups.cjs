// 建立煞車件共用規格群組（brake_spec + brake_part_spec_group）
//
// 目的：讓不同廠牌的煞車件能因為「規格相同」而互相對應。
// 同一組物理規格（位置 + 碟徑 + 碟厚 + 碟型 + 卡鉗）只會有一筆 brake_spec，
// 各廠牌零件只要規格相同就會連到同一筆 → 可由「這個零件」反查「其他廠牌的對應零件」。
//
// 資料來源：
//   來令片 → brake_part_fitment 的 disc_diameter_mm / disc_thickness_mm /
//             disc_style / caliper_make（同一顆料號可能有數組碟規格）
//   碟盤   → 待匯入後由其自身的尺寸建立（part_type='disc'）
//
// 用法：node scripts/build_brake_spec_groups.cjs [--apply]
//       不加 --apply 為 dry-run
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const PROD_DB = 'carparts';
const EFFECTIVE_URL = process.env.DATABASE_URL || require('dotenv').config().parsed.DATABASE_URL;
const dbName = (u => { const m = String(u).match(/\/([^/?]+)(\?|$)/); return m ? m[1] : null; })(EFFECTIVE_URL);
if (!dbName) { console.error('FATAL: 無法解析 DATABASE_URL'); process.exit(2); }
if (dbName === PROD_DB && process.env.ALLOW_PROD_DB !== '1') {
  console.error(`FATAL: 拒絕對正式庫 ${PROD_DB} 執行（設 ALLOW_PROD_DB=1 才可覆寫）`);
  process.exit(3);
}
const APPLY = process.argv.includes('--apply');
console.log(`[安全閘] 目標資料庫：${dbName}｜模式：${APPLY ? 'APPLY' : 'DRY-RUN'}`);

const prisma = new PrismaClient({ datasources: { db: { url: EFFECTIVE_URL } } });

// 規格鍵正規化：位置/直徑/厚度/碟型/卡鉗
function normVal(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim().toUpperCase().replace(/\s+/g, '');
}
function specKeyOf(position, dia, thk, style, caliper) {
  return [position, dia, thk, style, caliper].map(normVal).join('|');
}
function displayNameOf(position, dia, thk, style, caliper) {
  const posMap = { '前': '前輪', '後': '後輪', 'FRONT': '前輪', 'REAR': '後輪' };
  const pos = posMap[normVal(position)] || (position ? String(position) : '通用');
  const bits = [];
  if (dia) bits.push(`${dia}mm`);
  if (thk) bits.push(`厚${thk}mm`);
  if (style) bits.push(String(style));
  if (caliper) bits.push(String(caliper));
  return bits.length ? `${pos} ${bits.join(' ')}` : pos;
}

(async () => {
  // 1. 讀取所有來令片的適配列（取其碟規格）
  const rows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT f.brake_part_id, b.part_type,
           f.position, f.disc_diameter_mm, f.disc_thickness_mm,
           f.disc_style, f.caliper_make
    FROM brake_part_fitment f
    JOIN brake_parts b ON b.id = f.brake_part_id
    WHERE f.disc_diameter_mm IS NOT NULL OR f.disc_thickness_mm IS NOT NULL
  `);
  console.log(`適配列（具碟規格）: ${rows.length}`);

  // 2. 建立「零件 → 規格鍵集合」
  const partSpecs = new Map();     // brake_part_id -> Set(specKey)
  const specMeta = new Map();     // specKey -> {position, dia, thk, style, caliper}
  for (const r of rows) {
    const key = specKeyOf(r.position, r.disc_diameter_mm, r.disc_thickness_mm, r.disc_style, r.caliper_make);
    if (!partSpecs.has(r.brake_part_id)) partSpecs.set(r.brake_part_id, new Set());
    partSpecs.get(r.brake_part_id).add(key);
    if (!specMeta.has(key)) {
      specMeta.set(key, {
        position: r.position, dia: r.disc_diameter_mm, thk: r.disc_thickness_mm,
        style: r.disc_style, caliper: r.caliper_make,
      });
    }
  }
  console.log(`唯一規格群組: ${specMeta.size}｜有規格的零件: ${partSpecs.size}`);

  // 3. 統計：每個規格群組被幾個零件共用（跨品牌對應的基礎）
  const specToParts = new Map();
  for (const [pid, keys] of partSpecs) {
    for (const k of keys) {
      if (!specToParts.has(k)) specToParts.set(k, []);
      specToParts.get(k).push(pid);
    }
  }
  const shared = [...specToParts.entries()].filter(([, ps]) => ps.length > 1);
  const linkCount = [...partSpecs.values()].reduce((a, s) => a + s.size, 0);
  console.log(`零件↔規格連結: ${linkCount} 條｜被 2 個以上零件共用的規格: ${shared.length} 組`);
  const maxShare = Math.max(...[...specToParts.values()].map(v => v.length));
  console.log(`單一規格最多被 ${maxShare} 個零件共用`);

  if (!APPLY) {
    console.log('\n--- DRY-RUN（未寫入）---');
    const sample = [...specToParts.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6);
    for (const [k, ps] of sample) {
      const m = specMeta.get(k);
      console.log(`  ${displayNameOf(m.position, m.dia, m.thk, m.style, m.caliper)}  [${k}] → ${ps.length} 個零件`);
    }
    await prisma.$disconnect();
    return;
  }

  // 4. 寫入 brake_spec（upsert by spec_key）
  const specIds = new Map();
  let created = 0, reused = 0;
  for (const [key, m] of specMeta) {
    const existing = await prisma.brakeSpec.findUnique({ where: { spec_key: key } });
    if (existing) { specIds.set(key, existing.id); reused++; continue; }
    const row = await prisma.brakeSpec.create({
      data: {
        spec_key: key,
        position: m.position ?? null,
        disc_diameter_mm: m.dia ?? null,
        disc_thickness_mm: m.thk ?? null,
        disc_style: m.style ?? null,
        caliper_make: m.caliper ?? null,
        display_name: displayNameOf(m.position, m.dia, m.thk, m.style, m.caliper),
      },
    });
    specIds.set(key, row.id);
    created++;
  }
  console.log(`\nbrake_spec：新增 ${created}｜沿用 ${reused}`);

  // 5. 寫入 brake_part_spec_group
  const linkRows = [];
  for (const [pid, keys] of partSpecs) {
    for (const k of keys) {
      const sid = specIds.get(k);
      if (sid) linkRows.push({ brake_part_id: pid, brake_spec_id: sid });
    }
  }
  // 清除舊連結（可重跑）
  const deleted = await prisma.brakePartSpecGroup.deleteMany({});
  console.log(`清除舊連結: ${deleted.count}`);

  const CHUNK = 2000;
  for (let i = 0; i < linkRows.length; i += CHUNK) {
    await prisma.brakePartSpecGroup.createMany({
      data: linkRows.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
  }
  const total = await prisma.brakePartSpecGroup.count();
  console.log(`brake_part_spec_group：寫入 ${linkRows.length}｜目前 ${total} 筆`);

  await prisma.$disconnect();
})().catch(async e => { console.error('ERR', e.message); await prisma.$disconnect(); process.exit(1); });
