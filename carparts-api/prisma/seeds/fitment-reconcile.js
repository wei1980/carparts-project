// Fitment 校正：以官方 Fitment-OCT-24.csv 為唯一事實來源，修正 part_vehicle_compatibility
// 規則：
//   1. CSV 有定義的 SKU → DB 連結必須完全等於 CSV 定義（多的刪、缺的補）
//   2. CSV 無定義的 SKU → 不動（僅 CTS 有 CSV；其他品牌無資料可比對）
// 用法: node fitment-reconcile.js --analyze            (只分析，不動 DB)
//       node fitment-reconcile.js --apply [--sku=XXX]  (套用；可限定單一 SKU 先試)
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CSV_PATH = 'C:/Users/User/AppData/Local/hermes/attachments/Fitment-OCT-24.csv';
const MODE = process.argv.includes('--apply') ? 'apply' : 'analyze';
const onlySku = (process.argv.find(a => a.startsWith('--sku=')) || '').split('=')[1] || null;

// ── 解析 CSV：SKU → [ "VW>GOLF R>2015>MK7/7.5", ... ] ──
function parseCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const map = new Map(); // sku -> Set(vpf terms)
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(',');
    if (idx < 0) continue;
    const sku = line.slice(0, idx).trim();
    const terms = line.slice(idx + 1).split('|').map(t => t.trim()).filter(Boolean);
    if (!map.has(sku)) map.set(sku, new Set());
    for (const t of terms) map.get(sku).add(t);
  }
  return map;
}

// ── CSV make 縮寫 → DB make 正規化 ──
const MAKE_ALIAS = { VW: 'Volkswagen', BENZ: 'Mercedes-Benz', MERCEDES: 'Mercedes-Benz', LANDROVER: 'Land Rover' };
function normMake(m) {
  const up = m.trim().toUpperCase();
  return MAKE_ALIAS[up] || m.trim();
}

// ── VPF term "MAKE>MODEL>YEAR[>GEN]" → variant 比對條件 ──
// gen 欄位：CSV "MK7/7.5" = Mk7 或 Mk7.5（拆 '/' 展開，MK→Mk 正規化）
// 無 gen 的 term：繼承同 SKU 同 make+model 其他 term 的 gen（例：GOLF R>2021 美規定義，實際仍限 Mk7/7.5）
function genAlternatives(genStr) {
  return genStr.split('/').map(g => g.trim().toUpperCase().replace(/^MK/, 'Mk')).filter(Boolean);
}

function buildVariantWhere(term, inheritedGens) {
  const [makeRaw, model, yearStr, gen] = term.split('>').map(s => s.trim());
  const year = parseInt(yearStr);
  if (!makeRaw || !model || isNaN(year)) return null;
  const make = normMake(makeRaw);

  const where = {
    is_approved: true,
    make: { equals: make, mode: 'insensitive' },
    model: { contains: model, mode: 'insensitive' }, // 完整字串：'GOLF R' 不會誤中 'Golf GTI'
    year_start: { lte: year },
    year_end: { gte: year },
  };
  const gens = gen ? genAlternatives(gen) : (inheritedGens || []);
  if (gens.length > 0) {
    where.OR = gens.map(g => ({ generation: { contains: g, mode: 'insensitive' } }));
  }
  return where;
}

(async () => {
  const csv = parseCsv();
  const skus = [...csv.keys()].filter(s => !onlySku || s === onlySku);
  console.log(`CSV 共 ${csv.size} 個 SKU，本次處理 ${skus.length} 個${onlySku ? `（限定 ${onlySku}）` : ''}\n`);

  let addTotal = 0, delTotal = 0;
  let deactivated = 0;
  const emptyFitmentSkus = [];
  const report = [];

  for (const sku of skus) {
    const part = await prisma.part.findUnique({ where: { sku }, select: { id: true, name: true, is_active: true } });

    // 📦 官方 CSV 未列車型 → 下架待人工確認（不動連結，保留現況供人工審核）
    if (csv.get(sku).size === 0) {
      emptyFitmentSkus.push(sku);
      if (part) {
        report.push(`⏸️ ${sku} (${(part.name || '').slice(0, 30)}): 官方未列車型 → ${part.is_active ? '下架' : '已下架'}`);
        if (MODE === 'apply' && part.is_active) {
          await prisma.part.update({ where: { id: part.id }, data: { is_active: false } });
          deactivated++;
        }
      } else {
        report.push(`⚠️  ${sku}: 官方未列車型，且 DB 無此商品`);
      }
      continue;
    }

    if (!part) { report.push(`⚠️  ${sku}: DB 無此商品`); continue; }

    const terms = [...csv.get(sku)];
    // 無 gen 的 term 繼承同 SKU 同 make+model 有 gen term 的 gen（例：GOLF R>2021 → 繼承 MK7/7.5）
    const genByModel = new Map();
    for (const term of terms) {
      const [make, model, , gen] = term.split('>').map(s => s.trim());
      if (gen && make && model) {
        const key = `${make.toUpperCase()}>${model.toUpperCase()}`;
        if (!genByModel.has(key)) genByModel.set(key, new Set());
        for (const g of genAlternatives(gen)) genByModel.get(key).add(g);
      }
    }

    const csvVariantIds = new Set();
    for (const term of terms) {
      const [make, model] = term.split('>').map(s => s.trim());
      const key = `${make.toUpperCase()}>${model.toUpperCase()}`;
      const inherited = genByModel.get(key) ? [...genByModel.get(key)] : [];
      const where = buildVariantWhere(term, inherited);
      if (!where) continue;
      const rows = await prisma.vehicleVariant.findMany({ where, select: { id: true } });
      rows.forEach(r => csvVariantIds.add(r.id));
    }

    const dbLinks = await prisma.partCompatibility.findMany({
      where: { part_id: part.id },
      select: { vehicle_id: true },
    });
    const dbSet = new Set(dbLinks.map(l => l.vehicle_id));

    const toAdd = [...csvVariantIds].filter(id => !dbSet.has(id));
    const toDel = [...dbSet].filter(id => !csvVariantIds.has(id));
    addTotal += toAdd.length; delTotal += toDel.length;

    if (toAdd.length || toDel.length) {
      let line = `${sku} (${part.name.slice(0, 30)}…): +${toAdd.length} / -${toDel.length}`;
      if (toDel.length) {
        const samples = await prisma.vehicleVariant.findMany({
          where: { id: { in: toDel.slice(0, 5) } },
          select: { make: true, model: true, generation: true, year_start: true },
        });
        line += '\n     刪除例: ' + samples.map(v => `${v.make} ${v.model} ${v.generation} ${v.year_start}`).join(' | ');
      }
      report.push(line);
    }

    if (MODE === 'apply') {
      if (toDel.length) await prisma.partCompatibility.deleteMany({ where: { part_id: part.id, vehicle_id: { in: toDel } } });
      if (toAdd.length) {
        await prisma.partCompatibility.createMany({
          data: toAdd.map(vehicle_id => ({ part_id: part.id, vehicle_id })),
          skipDuplicates: true,
        });
      }
    }
  }

  console.log(report.join('\n'));
  console.log(`\n統計: 需新增 ${addTotal} 條連結、需刪除 ${delTotal} 條錯誤連結、下架 ${MODE === 'apply' ? deactivated : emptyFitmentSkus.length} 個未列車型商品（待人工確認）`);
  console.log(MODE === 'apply' ? '✅ 已套用' : '(analyze 模式，未動 DB。確認後加 --apply 執行)');
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
