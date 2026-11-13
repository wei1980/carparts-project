// 全站稽核：同 variant 同位置同色系出現多個料號的來令片（EBC UK 件）
// 一台車同一輪位理論上一種規格；多料號 = CSV 官方雙規格（不同卡鉗/碟盤選配）或殘留誤連
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // 取所有 EBC UK 來令片的相容連結
  const links = await prisma.partCompatibility.findMany({
    where: { part: { sku: { startsWith: 'EBC-' }, is_active: true } },
    include: {
      part: { select: { sku: true, name: true } },
      vehicle: { select: { id: true, make: true, model: true, generation: true, year_start: true } },
    },
  });
  console.log(`上架中 EBC 相容連結總數: ${links.length}`);

  // 分組：variant × pos(前/後) → Set(料號)
  const groups = new Map(); // key → { vehicle, codes: Map(code → [skus]) }
  for (const l of links) {
    const m = l.part.sku.match(/^EBC-(GRN|RED|YLW|BLU)-([A-Z0-9]+)-(F|R)$/);
    if (!m) continue; // 卡鉗來令片等其他型態跳過
    const pos = m[3] === 'F' ? '前' : '後';
    const code = m[2];
    const key = `${l.vehicle.id}|${pos}`;
    if (!groups.has(key)) groups.set(key, { v: l.vehicle, pos, codes: new Map() });
    const g = groups.get(key);
    if (!g.codes.has(code)) g.codes.set(code, []);
    g.codes.get(code).push(l.part.sku);
  }
  // 只看「同一輪位有多個不同料號」的組合
  const multi = [...groups.values()].filter(g => g.codes.size > 1);
  console.log(`單一輪位出現多料號的 (variant×位置) 組合: ${multi.length}`);
  // 按 make 彙總統計
  const byMake = new Map();
  for (const g of multi) {
    const k = g.v.make;
    if (!byMake.has(k)) byMake.set(k, { count: 0, samples: [] });
    byMake.get(k).count++;
    if (byMake.get(k).samples.length < 5) byMake.get(k).samples.push(`${g.v.model}|${g.v.generation}|${g.v.year_start} ${g.pos}輪: ${[...g.codes.keys()].join('/')}`);
  }
  for (const [mk, s] of [...byMake.entries()].sort((a, b) => b.count - a.count)) {
    console.log(`\n${mk}: ${s.count} 組`);
    s.samples.forEach(x => console.log(`   ${x}`));
  }
  await prisma.$disconnect();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
