const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CSV_FILE = path.join(__dirname, 'compatibility_check.csv');

// 設定批次寫入的大小 (避免記憶體爆掉)
const BATCH_SIZE = 100;

async function main() {
  console.log(`🚀 開始匯入零件-車型對應關係: ${CSV_FILE}`);

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ 找不到檔案，請確認 ${CSV_FILE} 已放入資料夾`);
    return;
  }

  // 1. 清空舊資料
  console.log('🧹 清空舊的關聯資料 (PartCompatibility)...');
  try {
    // 如果你的 table 名稱不同，請在此修改
    await prisma.partCompatibility.deleteMany({});
    console.log('   -> 已清空。');
  } catch (e) {
    console.warn('   ⚠️ 清空失敗 (可能是資料表為空)，嘗試繼續匯入...', e.message);
  }

  // 2. 讀取 CSV
  const fileContent = fs.readFileSync(CSV_FILE, 'utf8').replace(/^\uFEFF/, '');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
  console.log(`📊 CSV 讀取完成，共 ${parsed.data.length} 筆資料`);

  // 3. 建立零件快取 (SKU -> ID)
  console.log('🔄 正在建立零件 SKU 快取...');
  const skuMap = new Map();
  // 只撈取需要的欄位以節省記憶體
  const parts = await prisma.part.findMany({ select: { id: true, sku: true } });
  
  parts.forEach(p => {
    if (p.sku) skuMap.set(p.sku.trim(), p.id);
  });
  console.log(`   -> 已快取 ${skuMap.size} 筆零件資料。`);

  // 4. 逐筆處理與比對
  let compatibilityQueue = []; // 待寫入的佇列
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;

  for (const row of parsed.data) {
    processedCount++;
    
    // 讀取並清洗欄位
    const sku = row['SKU'] ? row['SKU'].trim() : null;
    const make = row['Make'] ? row['Make'].trim() : null;
    const model = row['Model'] ? row['Model'].trim() : null;
    const engine = row['Engine'] ? row['Engine'].trim() : null;
    const generation = row['Generation'] ? row['Generation'].trim() : null;
    
    // 處理年份：有些 CSV 會寫 "2015-2018" 或單一 "2015"
    // 這裡假設 CSV 給的是「特定年份」來檢查相容性
    const yearStr = row['Year'];
    const checkYear = parseInt(yearStr); 

    if (!sku || !make || !model) continue;

    // A. 找 Part ID
    const partId = skuMap.get(sku);
    if (!partId) {
      failCount++; // 找不到零件 (可能是 seed_parts.js 還沒跑，或 SKU 錯誤)
      continue;
    }

    // B. 找 Vehicle Variant ID
    try {
      // 構建查詢條件
      const whereClause = {
        // 使用 mode: 'insensitive' 忽略大小寫差異 (例如 TOYOTA vs Toyota)
        // 注意：這需要你的資料庫與 Prisma 支援 (Postgres 支援，MySQL 視編碼而定)
        make: { equals: make, mode: 'insensitive' }, // 假設你的 schema 是 make (String) 而非關聯
        model: { equals: model, mode: 'insensitive' },
      };

      // 如果 CSV 有年份，檢查年份是否在車型生產區間內
      if (!isNaN(checkYear)) {
        whereClause.year_start = { lte: checkYear }; // 生產年份 <= 檢查年份
        whereClause.year_end = { gte: checkYear };   // 結束年份 >= 檢查年份
      }

      // 引擎代號匹配 (如果有填)
      if (engine) {
        whereClause.engine_code = { contains: engine, mode: 'insensitive' };
      }
      
      // 世代匹配 (如果有填)
      if (generation) {
        whereClause.generation = { contains: generation, mode: 'insensitive' };
      }

      // 查詢資料庫
      // 這裡假設你的模型名稱是 VehicleVariant
      const vehicle = await prisma.vehicleVariant.findFirst({
        where: whereClause,
        select: { id: true }
      });

      if (vehicle) {
        // 加入待寫入佇列
        compatibilityQueue.push({
          part_id: partId,    // 根據 schema 可能是 partId
          vehicle_id: vehicle.id // 根據 schema 可能是 vehicleVariantId
        });
        successCount++;
      } else {
        // console.log(`   ⚠️ 無法匹配車型: ${make} ${model} ${yearStr}`);
        failCount++;
      }

    } catch (error) {
      console.error(`查詢錯誤: ${error.message}`);
    }

    // C. 批次寫入 (當佇列滿了就寫入)
    if (compatibilityQueue.length >= BATCH_SIZE) {
      await saveBatch(compatibilityQueue);
      compatibilityQueue = []; // 清空佇列
      process.stdout.write(`.`); // 進度點
    }
  }

  // D. 處理剩下的佇列
  if (compatibilityQueue.length > 0) {
    await saveBatch(compatibilityQueue);
  }

  console.log(`\n\n✅ 處理完成！`);
  console.log(`   - 成功匹配並排入: ${successCount}`);
  console.log(`   - 失敗/找不到對應: ${failCount}`);
}

// 輔助函式：批次寫入資料庫
async function saveBatch(data) {
  try {
    // createMany 比迴圈 create 快非常多 (需資料庫支援，MySQL/Postgres 皆可)
    await prisma.partCompatibility.createMany({
      data: data,
      skipDuplicates: true, // 忽略重複資料
    });
  } catch (e) {
    console.error(`\n❌ 批次寫入失敗: ${e.message}`);
    // 如果 createMany 失敗，可以考慮 fallback 回單筆寫入
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });