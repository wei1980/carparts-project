const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ✅ 更新為新的 CSV 檔名
const CSV_FILENAME = 'Makes.csv';
const CSV_PATH = path.join(__dirname, CSV_FILENAME);

async function main() {
  console.log(`🚀 開始匯入車型資料 from ${CSV_FILENAME}...`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ 找不到檔案: ${CSV_PATH}`);
    console.error('請將 CSV 檔案放入 carparts-api/prisma/ 資料夾中。');
    process.exit(1);
  }

  // 1. 讀取並解析 CSV (支援 UTF-8 BOM)
  const fileContent = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true // 自動將 "2023" 轉為數字 2023
  });

  if (parsed.errors.length > 0) {
    console.warn('⚠️ CSV 解析出現警告 (前3筆):', parsed.errors.slice(0, 3));
  }

  const rows = parsed.data;
  console.log(`📊 讀取到 ${rows.length} 筆資料，準備寫入資料庫...`);

  // 2. 清空舊資料
  // 注意：這會刪除所有舊的車型資料與相容性關聯！
  console.log('🧹 清除舊的車型資料...');
  try {
    await prisma.partCompatibility.deleteMany({}); // 先刪除關聯
    await prisma.vehicleVariant.deleteMany({});    // 再刪除本體
    console.log('   -> 舊資料已清空');
  } catch (e) {
    console.error('❌ 清除舊資料失敗:', e);
    process.exit(1);
  }

  // 3. 逐筆寫入
  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      // 提取核心欄位 (對應 schema.prisma)
      // 使用 trim() 去除可能存在的空白
      // 注意：根據您的 CSV，欄位名稱可能是 "Makes" (複數)
      const make = String(row['Makes'] || row['Make'] || '').trim();
      const rawModel = String(row['Model'] || '').trim();
      const generation = String(row['Generation'] || '').trim();
      const engine = String(row['Engine'] || '').trim();
      const year = parseInt(row['Year']) || 0;

      // 檢查必填欄位
      if (!make || !rawModel) {
        continue;
      }

      // 提取規格欄位 (存入 JSON 欄位 `specs`)
      // 將 row 中已經提取過的欄位移除，剩下的都當作規格
      const { 
        Makes, Make, Model, Generation, Engine, Year, 
        ...otherSpecs 
      } = row;

      // 清理 specs (移除空值)
      const cleanSpecs = {};
      for (const [key, val] of Object.entries(otherSpecs)) {
        if (val !== null && val !== "" && val !== undefined) {
          cleanSpecs[key] = val;
        }
      }

      // 寫入資料庫
      await prisma.vehicleVariant.create({
        data: {
          make: make,
          model: rawModel,      
          generation: generation,
          engine_code: engine,
          variant_name: rawModel, // 顯示名稱
          year_start: year,
          year_end: year,       
          specs: cleanSpecs,    
        }
      });

      successCount++;
      if (successCount % 500 === 0) process.stdout.write('.');

    } catch (e) {
      errorCount++;
      if (errorCount === 1) console.error(`\n❌ 寫入失敗範例:`, e.message);
    }
  }

  console.log(`\n\n✅ 匯入完成！`);
  console.log(`成功: ${successCount} 筆`);
  console.log(`失敗: ${errorCount} 筆`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });