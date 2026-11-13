// src/services/autoCompleteOrders.js
const prisma = require('../lib/prisma');

// 7 天 = 7 * 24 * 60 * 60 * 1000 毫秒
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function autoCompleteShippedOrders() {
  try {
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
    
    // 找出所有已出貨且超過 7 天未更新的訂單
    const result = await prisma.consumerOrder.updateMany({
      where: {
        status: 'SHIPPED',
        // ⚠️ 注意：這裡使用 updated_at，代表「最後一次狀態變更為 SHIPPED 的時間」
        // 如果客戶在出貨後又修改了訂單（例如補登匯款），updated_at 會被刷新，導致重新計算 7 天。
        // 若希望嚴格從「出貨時間」起算，建議在 ConsumerOrder 新增一個 shipped_at 欄位。
        updated_at: { lte: cutoff },
      },
      data: { status: 'COMPLETED' },
    });

    if (result.count > 0) {
      console.log(`[AutoComplete] ✅ 已自動將 ${result.count} 筆出貨滿 7 天的訂單結案。`);
    }
  } catch (error) {
    console.error('[AutoComplete] ❌ 自動結案失敗:', error.message);
  }
}

// 啟動排程：伺服器啟動時執行一次，之後每小時執行一次
function startAutoCompleteJob() {
  autoCompleteShippedOrders(); // 啟動時先跑一次
  setInterval(autoCompleteShippedOrders, 60 * 60 * 1000); // 每小時跑一次
  console.log('⏰ 已啟動「出貨 7 天自動結案」排程');
}

module.exports = { startAutoCompleteJob };