// src/services/wishPriceService.js — 降價通知檢查
// 呼叫時機：商品價格更新（admin PUT /parts/:id）後、或定時掃描
const { pushMessage } = require('./lineService');

const prisma = require('../lib/prisma');

/**
 * 檢查某零件（或全部）的願望清單，現價 ≤ targetPrice 且尚未通知 → 推 LINE
 * @param {number|null} partId 指定零件；null = 掃全部
 */
async function checkPriceDrops(partId = null) {
  const where = {
    partId: { not: null },
    targetPrice: { not: null },
    status: { not: 'CANCELLED' },
    ...(partId ? { partId } : {}),
  };
  const wishes = await prisma.wishItem.findMany({
    where,
    include: {
      part: { select: { id: true, name: true, brand: true, msrp_price: true, sku: true } },
      user: { select: { id: true, lineId: true, phone: true } },
    },
  });

  let notified = 0;
  for (const w of wishes) {
    if (!w.part || !w.user?.lineId) continue;
    const current = Number(w.part.msrp_price);
    const target = Number(w.targetPrice);
    if (current > target) continue;
    // 已通知且價格沒再降 → 跳過
    if (w.notifiedAt && Number(w.notifiedAtPrice ?? NaN) <= current) continue;

    const msg =
      `🔔 降價通知\n` +
      `${w.part.brand} ${w.part.name}\n` +
      `目前價格：$${current.toLocaleString()}\n` +
      `你的期望價：$${target.toLocaleString()}\n` +
      `快來看看吧！`;
    try {
      await pushMessage(w.user.lineId, msg);
      await prisma.wishItem.update({
        where: { id: w.id },
        data: { notifiedAt: new Date(), notifiedAtPrice: current },
      });
      notified++;
    } catch (err) {
      console.error('降價通知推播失敗:', err.message);
    }
  }
  return notified;
}

module.exports = { checkPriceDrops };
