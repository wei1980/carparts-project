// 全站稽核 v3：同 variant × 同品牌(brand欄位) × 同子分類 出現多個料號
// 用法：node prisma/seeds/audit-multi-sku-per-vehicle.js [--brand=K&N|BMC|Pipercross] [--out]
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const brandFilter = (args.find(a => a.startsWith('--brand=')) || '').split('=')[1] || null;
const outCsv = args.includes('--out');

(async () => {
  const where = brandFilter
    ? { part: { brand: { equals: brandFilter, mode: 'insensitive' }, is_active: true } }
    : { part: { is_active: true } };
  const links = await prisma.partCompatibility.findMany({
    where,
    include: {
      part: {
        select: {
          sku: true, name: true, brand: true,
          subcategory: { select: { name: true, category: { select: { name: true } } } },
        },
      },
      vehicle: { select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true } },
    },
  });
  console.log(`符合條件相容連結總數: ${links.length}`);

  // 分組：variant × 品牌 × 子分類 → 料號集合
  const groups = new Map();
  for (const l of links) {
    if (!l.part.subcategory) continue;
    const key = `${l.vehicle.id}|${l.part.brand}|${l.part.subcategory.name}`;
    if (!groups.has(key)) groups.set(key, { v: l.vehicle, brand: l.part.brand, sub: l.part.subcategory.name, skus: new Map() });
    groups.get(key).skus.set(l.part.sku, l.part.name);
  }

  const multi = [...groups.values()].filter(g => g.skus.size > 1);
  console.log(`單一(車型×品牌×子分類)多料號組合: ${multi.length}`);

  // 品牌×子分類彙總
  const byBrand = new Map();
  for (const g of multi) {
    const k = `${g.brand}|${g.sub}`;
    if (!byBrand.has(k)) byBrand.set(k, { count: 0, variants: new Set(), skus: new Set(), samples: [] });
    const s = byBrand.get(k);
    s.count++;
    s.variants.add(g.v.id);
    for (const sku of g.skus.keys()) s.skus.add(sku);
    if (s.samples.length < 3) s.samples.push(`${g.v.make} ${g.v.model} ${g.v.generation} ${g.v.year_start}: ${[...g.skus.keys()].slice(0, 6).join('/')}`);
  }
  console.log('\n=== 品牌×子分類 彙總 ===');
  for (const [k, s] of [...byBrand.entries()].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`${k}: ${s.count} 組 / 涉及車型 ${s.variants.size} 台 / 涉及料號 ${s.skus.size} 個`);
    s.samples.forEach(x => console.log(`   ${x}`));
  }

  if (outCsv && multi.length) {
    const rows = ['variant_id,make,model,generation,year_start,year_end,brand,subcategory,sku_count,skus'];
    for (const g of multi.sort((a, b) => (a.brand + a.v.id) - (b.brand + b.v.id))) {
      const esc = s => `"${String(s).replace(/"/g, '""')}"`;
      rows.push([
        g.v.id, g.v.make, g.v.model, g.v.generation || '', g.v.year_start, g.v.year_end || '',
        g.brand, g.sub, g.skus.size,
        esc([...g.skus.keys()].join(' ')),
      ].join(','));
    }
    const f = path.join(__dirname, `multi-sku-audit${brandFilter ? '-' + brandFilter.replace(/[&/]/g, '') : ''}.csv`);
    fs.writeFileSync(f, '\ufeff' + rows.join('\n'));
    console.log(`\n已輸出 ${rows.length - 1} 列 → ${f}`);
  }

  await prisma.$disconnect();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
