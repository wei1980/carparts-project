// 下架 MST 無適配零件：35 通用無資料 + 23 零連結
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
(async () => {
  const fit = JSON.parse(fs.readFileSync('scratch_mst_fitment.json').toString('utf8'));
  const fitSkus = new Set(fit.map(r => String(r.SKU || '').trim().toUpperCase()));
  // 群組 1：通用件且供應商無適配資料
  const g1 = await prisma.$queryRawUnsafe(
    `SELECT id, sku, name FROM parts WHERE brand = 'MST' AND is_universal = true`);
  const g1Filtered = g1.filter(p => !fitSkus.has(String(p.sku).toUpperCase()));
  // 群組 2：非通用、零連結
  const g2 = await prisma.$queryRawUnsafe(
    `SELECT p.id, p.sku, p.name FROM parts p
     LEFT JOIN part_vehicle_compatibility pvc ON pvc.part_id = p.id
     WHERE p.brand = 'MST' AND p.is_universal = false
     GROUP BY p.id, p.sku, p.name HAVING count(pvc.vehicle_id) = 0`);
  const all = [...g1Filtered, ...g2];
  console.log(`群組1（通用無適配資料）：${g1Filtered.length}｜群組2（零連結）：${g2.length}｜合計 ${all.length}`);
  all.forEach(p => console.log(`  ${p.id}｜${p.sku}｜${p.name}`));
  if (APPLY) {
    const ids = all.map(p => p.id);
    const ph = ids.map((_, i) => '$' + (i + 1)).join(',');
    await prisma.$queryRawUnsafe(
      `UPDATE parts SET is_active = false, is_universal = false, updated_at = now() WHERE id IN (${ph})`, ...ids);
    const check = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int n FROM parts WHERE brand = 'MST' AND is_active = true`);
    console.log(`\n已下架 ${ids.length} 筆｜MST 剩餘上架：${check[0].n}`);
  } else {
    console.log('\n乾跑（加 --apply 執行）');
  }
  await prisma.$disconnect();
})();
