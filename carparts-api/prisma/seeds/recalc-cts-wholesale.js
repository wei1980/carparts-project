// CTS 批發價重算：售價 × 0.9，無條件進位到百位數
// 例：8000 → 7200（剛好整百）；11200 → 10080 → ceil 到 10100
// 用法: node recalc-cts-wholesale.js --dry  (預覽) / node recalc-cts-wholesale.js  (寫入)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

function calcWholesale(msrp) {
  const raw = Number(msrp) * 0.9;
  return Math.ceil(raw / 100) * 100; // 無條件進位到百位
}

(async () => {
  const parts = await prisma.part.findMany({
    where: { brand: 'CTS Turbo' },
    select: { id: true, sku: true, msrp_price: true, wholesale_price: true },
  });

  const changes = [];
  for (const p of parts) {
    const msrp = Number(p.msrp_price);
    const target = calcWholesale(msrp);
    if (Number(p.wholesale_price) !== target) {
      changes.push({ id: p.id, sku: p.sku, msrp, old_ws: Number(p.wholesale_price), new_ws: target });
    }
  }

  console.log(`CTS Turbo 共 ${parts.length} 筆，需更新批發價 ${changes.length} 筆`);
  console.log('樣本（前 10）:');
  for (const c of changes.slice(0, 10)) {
    console.log(`  #${c.id} ${c.sku}  售價 ${c.msrp} → 批發 ${c.old_ws} ⇒ ${c.new_ws}`);
  }
  // 驗證 #1147
  const p1147 = changes.find(c => c.id === 1147);
  console.log(`#1147（使用者回報案例）: ${p1147 ? `批發 ${p1147.old_ws} ⇒ ${p1147.new_ws}` : '已符合規則，無需修改'}`);

  if (!DRY) {
    await prisma.$transaction(
      changes.map(c => prisma.part.update({ where: { id: c.id }, data: { wholesale_price: c.new_ws } }))
    );
    console.log(`✅ 已更新 ${changes.length} 筆 CTS Turbo 批發價`);
  } else {
    console.log('(dry-run，未寫入)');
  }
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
