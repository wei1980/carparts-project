// src/services/aiQueue.js
const { PrismaClient } = require('@prisma/client');
const { aggregateAIResults } = require('./aiAggregator');

const prisma = new PrismaClient();
let isProcessing = false;

async function processPendingDrafts() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const pending = await prisma.aiPartDraft.findFirst({
      where: { status: 'pending' },
      orderBy: { created_at: 'asc' },
      include: { customerVehicle: true },
    });

    if (!pending) return;

    await prisma.aiPartDraft.update({
      where: { id: pending.id },
      data: { status: 'processing' },
    });

    console.debug(`🔄 開始處理草稿 ${pending.id}: ${pending.query}`);

    try {
      const vehicle = pending.customerVehicle;
      const vehicleInfo = vehicle ? {
        make: vehicle.make,
        model: vehicle.model,
        generation: vehicle.generation,
        engine: vehicle.engine,
        year: vehicle.year,
      } : {};

      // 🆕 網站標準分類與匯率
      const STANDARD_CATEGORIES = '進氣,排氣,煞車,底盤,引擎,冷卻,傳動,燃油,輪圈,外觀,內裝,電子';
      const promptForWeb = `我有一台 ${vehicleInfo.year || ''} ${vehicleInfo.make || ''} ${vehicleInfo.model || ''} ${vehicleInfo.generation || ''}，請推薦適合的零件（${pending.query}），並提供品牌、型號、價格、圖片連結與簡短描述。

請遵守以下規則：
1. 分類 (category) 只能使用以下標準分類：${STANDARD_CATEGORIES}。
2. 子分類 (subcategory)
主目錄：進氣 (內含子目錄：濾芯, 進氣套件, 渦輪管, 洩壓閥, 節氣門, 其他)
主目錄：排氣 (內含：排氣管, 觸媒)
主目錄：煞車 (內含：來令片, 碟盤, 煞車油管, 煞車套件)
主目錄：底盤 (內含：避震器, 短彈簧, 防傾桿, 其他)
主目錄：引擎 (內含：活塞連桿, 考耳, 渦輪, 其他)
主目錄：冷卻 (內含：水箱, 冷卻器)
主目錄：傳動 (內含：離合器, 差速器, 傳動軸, 其他)
主目錄：燃油 (內含：汽油幫浦, 噴油嘴)
主目錄：輪圈 (內含：鋁圈, 墊片, 輪胎)
主目錄：外觀 (內含：空力套件, 引擎蓋, 其他)
主目錄：內裝 (內含：腳踏墊, 座椅, 方向盤, 排檔頭)
主目錄：燈具 (內含：頭燈總成, 尾燈總成)
主目錄：電子 (內含：儀錶, ECU, 燈具)
3. 所有價格請直接以「新台幣 (TWD)」表示。
   - 若原始價格為美元,歐元或日圓，請乘以換算成台幣。
   - 批發價 (wholesale_price) = 國外售價(台幣) + 國際運費(台幣)（若無運費，請用國外售價 × 1.05 估算）。
   - 建議售價 (msrp_price) = (國外售價 + 國際運費) × 1.2（即加 20% 稅金）。
   - 若完全無法取得價格，請將兩者設為 null。
   - "零件名稱"使用中文

請依照以下 JSON 格式回覆（不要有任何其他文字）：
{
  "parts": [
    {
      "sku": "零件編號或 null",
      "name": "零件名稱",
      "brand": "品牌",
      "description": "描述",
      "msrp_price": 建議售價(新台幣，數字或 null),
      "wholesale_price": 批發價(新台幣，數字或 null),
      "category": "標準分類",
      "subcategory": "子分類或 null",
      "image_url": "圖片網址或 null"
    }
  ]
}`;

      // 傳入原始查詢，供相關性過濾
      const finalResult = await aggregateAIResults(promptForWeb, vehicleInfo, pending.query);

      await prisma.aiPartDraft.update({
        where: { id: pending.id },
        data: {
          result_json: finalResult.parts,
          status: 'ready',
        },
      });

      console.debug(`✅ 草稿 ${pending.id} 處理完成，找到 ${finalResult.parts.length} 筆零件`);
    } catch (error) {
      console.error(`❌ 草稿 ${pending.id} 處理失敗:`, error.message);
      await prisma.aiPartDraft.update({
        where: { id: pending.id },
        data: { status: 'failed' },
      });
    }
  } finally {
    isProcessing = false;
  }
}

// 每 15 秒檢查一次待處理草稿
setInterval(() => {
  processPendingDrafts().catch(console.error);
}, 15000);

module.exports = { processPendingDrafts };