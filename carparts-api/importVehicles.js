// importVehicles.js

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse"); // 假設您已安裝：npm install papaparse

const prisma = new PrismaClient();

// ----------------------------------------------------
// 設定區：要處理的 CSV 檔案 (已修正)
// ----------------------------------------------------
const VEHICLE_CSV_FILES = [
  "Makes.csv", // <-- 新增：根據您的回饋，檢查這個名稱
];

/**
 * 讀取 CSV 並將其轉換為 VehicleVariant 格式的資料
 * @param {string} filePath - CSV 檔案路徑
 * @returns {Array<Object>} 準備匯入資料庫的物件陣列
 */
function parseAndTransform(filePath) {
  const csvFile = fs.readFileSync(filePath, "utf8");
  const { data, errors } = Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (errors && errors.length) {
    console.error(`解析檔案 ${filePath} 時發生錯誤:`, errors);
  }

  const transformedData = data
    .map((row) => {
      // 根據 PRD 6.0 的 VehicleVariant 欄位進行映射與清洗
      // 容錯設計：同時檢查中英文欄位名稱
      const make = row["製造商"] || row["Make"] || "";
      const model = row["車系"] || row["Model"] || "";
      const generation = row["世代"] || row["Generation"] || "";
      const engine_code = row["引擎代碼"] || row["引擎"] || "";
      
      // 處理年份，嘗試解析 "年份開始", "年份結束" 或 "生產年份" 區間
      let year_start = parseInt(row["年份開始"] || (row["生產年份"] || "").split('-')[0]?.trim());
      let year_end = parseInt(row["年份結束"] || (row["生產年份"] || "").split('-')[1]?.trim() || new Date().getFullYear());

      // 數據檢查
      if (!make || !model || !generation || isNaN(year_start) || isNaN(year_end)) {
        // 忽略不完整的資料
        return null;
      }
      
      // 組合變體名稱
      const variant_name = row["車型名稱"] || [row["排氣量(cc)"], row["馬力(HP)"] || row["最大馬力(PS)"]].filter(Boolean).join(" ");

      return {
        make: make,
        model: model,
        generation: generation,
        engine_code: engine_code || null,
        variant_name: variant_name || null,
        year_start: year_start,
        year_end: year_end,
        // 將其他規格 (Specs) 存入 JSON 欄位
        specs: {
          排氣量_cc: parseInt(row["排氣量(cc)"]),
          馬力_PS: parseInt(row["最大馬力(PS)"] || row["馬力(HP)"]),
          驅動型式: row["驅動型式"] || row["驅動"],
          燃油類型: row["燃油類型"] || row["燃油"],
        }
      };
    })
    .filter(Boolean); // 移除解析失敗或被忽略的項目

  return transformedData;
}

/**
 * 執行匯入作業
 */
async function main() {
  console.log("🚀 開始匯入車型資料至 VehicleVariant...");
  let totalCount = 0;

  for (const file of VEHICLE_CSV_FILES) {
    const filePath = path.join(process.cwd(), file);

    // 檢查檔案是否存在後再嘗試讀取
    if (!fs.existsSync(filePath)) {
        // 只針對不完整的檔案名發出警告，讓用戶知道它正在嘗試
        if (file.includes("xlsx")) {
             console.log(`\n▶️ 檢查檔案: ${file} ... (未找到，跳過)`);
        } else {
             console.log(`\n▶️ 處理檔案: ${file}`);
             console.warn(`   ⚠️ 檔案不存在：${file}。請確認它是否在 ${path.basename(process.cwd())} 目錄下。`);
        }
        continue;
    }

    try {
      console.log(`\n▶️ 處理檔案: ${file}`);
      const dataToImport = parseAndTransform(filePath);
      
      if (dataToImport.length === 0) {
        console.log("   - 無有效資料可匯入。");
        continue;
      }

      // 使用 createMany 進行批量寫入，速度較快
      const result = await prisma.vehicleVariant.createMany({
        data: dataToImport,
        skipDuplicates: true,
      });

      console.log(`   ✅ 成功匯入 ${result.count} 筆車型變體資料。`);
      totalCount += result.count;
    } catch (e) {
      console.error(`❌ 處理檔案 ${file} 時發生嚴重錯誤：`, e);
    }
  }

  console.log(`\n🎉 所有車型資料匯入完成。總計匯入 ${totalCount} 筆資料。`);
}

main()
  .catch((e) => {
    console.error("腳本執行失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });