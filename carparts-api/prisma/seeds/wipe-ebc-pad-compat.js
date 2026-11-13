// 清除 EBC UK 來令片（前綴 EBC-GRN-/RED-/YLW-/BLU-）的全部車輛相容連結，供重跑 import 重建
// 不動 EBC-CP-*（卡鉗來令片）、CAL-*、CTS 與其他品牌
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const pads = await prisma.part.findMany({
    where: { sku: { startsWith: 'EBC-' } },
    select: { id: true, sku: true },
  });
  const targets = pads.filter(p => /^EBC-(GRN|RED|YLW|BLU)-/.test(p.sku));
  const ids = targets.map(p => p.id);
  console.log(`EBC UK 來令片商品: ${targets.length} 個`);
  const del = await prisma.partCompatibility.deleteMany({ where: { part_id: { in: ids } } });
  console.log(`已刪除相容連結: ${del.count} 條`);
  // 確認卡鉗來令片與卡鉗主檔未被波及
  const cpLeft = await prisma.part.count({ where: { sku: { startsWith: 'EBC-CP-' } } });
  const calLeft = await prisma.part.count({ where: { sku: { startsWith: 'CAL-' } } });
  const fitLeft = await prisma.partCaliperFitment.count();
  console.log(`倖存檢查: EBC-CP-* ${cpLeft} 個、CAL-* ${calLeft} 個、fitment ${fitLeft} 條`);
  await prisma.$disconnect();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
