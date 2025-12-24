// importParts.js
// 專門用於匯入零件資料至 Part 表，並執行自動匹配 VehicleVariant 的腳本。

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

const prisma = new PrismaClient();

// ----------------------------------------------------
// 設定區：要處理的 CSV 檔案
// ----------------------------------------------------
const PARTS_CSV_FILE = "parts.xlsx - Sheet1.csv";

/**
 * 助手函數：將字串列表（用分號分隔）解析為陣列
 * e.g. "BMW;Toyota" -> ["BMW", "Toyota"]
 */
const parseList = (str) => {
  if (!str) return [];
  // 忽略大小寫並去除前後空白，然後過濾掉空字串
  return str.split(";").map(s => s.trim()).filter(s => s.length > 0);
};

/**
 * 執行匯入作業
 */
async function main() {
  console.log("🚀 開始匯入零件資料並進行自動匹配...");

  const filePath = path.join(process.cwd(), PARTS_CSV_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 零件檔案不存在：${PARTS_CSV_FILE}。請確認檔案路徑。`);
    return;
  }

  const csvFile = fs.readFileSync(filePath, "utf8");
  const { data: rawParts, errors } = Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (header) => header.trim(), // 清理 CSV 欄位名稱的空白
  });

  if (errors && errors.length) {
    console.error(`解析檔案 ${PARTS_CSV_FILE} 時發生錯誤:`, errors);
    return;
  }
  
  if (rawParts.length === 0) {
      console.log("   - 零件 CSV 中無有效資料。");
      return;
  }

  let successCount = 0;
  let compatibilityCount = 0;

  for (const row of rawParts) {
    const { 
        sku, name, brand, category, subcategory, description, image_url,
        msrp_twd, wholesale_twd, stock_qty, availability_mode, lead_time_days,
        compatible_make, compatible_model, compatible_engine 
    } = row;

    if (!sku || !name) {
        console.warn(`⚠️ 忽略不完整零件 (SKU或名稱缺失)：${JSON.stringify(row).slice(0, 50)}...`);
        continue;
    }

    try {
      // 1. 轉換資料至 Part Model 格式
      const partData = {
        sku: sku,
        name: name,
        brand: brand || null,
        category_main: category || null,
        category_sub: subcategory || null,
        description: description || null,
        image_url: image_url || null,
        
        // 價格與庫存欄位轉換（使用 Decimal 類型）
        msrp_price: parseFloat(msrp_twd || 0),
        wholesale_price: parseFloat(wholesale_twd || 0),
        stock_qty: parseInt(stock_qty || 0),
        // 根據 PRD，預設 21 天
        preorder_lead_time_days: parseInt(lead_time_days) > 0 ? parseInt(lead_time_days) : 21,
        // ENUM 轉換
        availability_mode: (availability_mode || "").toLowerCase() === 'preorder' ? 'PREORDER' : 'STOCK',
      };

      // 2. 創建零件紀錄
      const part = await prisma.part.create({ data: partData });
      successCount++;
      
      // 3. 執行自動匹配 (Auto-Match) 邏輯
      const makes = parseList(compatible_make);
      const models = parseList(compatible_model);
      const engines = parseList(compatible_engine);
      
      let compatibleVariantIds = new Set();
      
      // 優先：透過 Make/Model/Engine 組合精準匹配
      const compatibilityConditions = [];
      if (makes.length > 0 && models.length > 0) {
        // 產生所有 Make x Model 的組合
        for (const make of makes) {
          for (const model of models) {
            const condition = { make: make, model: model };
            
            // 如果有引擎代碼，則優先以引擎代碼匹配
            if (engines.length > 0) {
                compatibilityConditions.push({ 
                    AND: [
                        { make: make, model: model },
                        { engine_code: { in: engines } }
                    ]
                });
            } else {
                compatibilityConditions.push(condition);
            }
          }
        }
      } else if (engines.length > 0) {
          // 次之：僅透過引擎代碼匹配
          compatibilityConditions.push({ engine_code: { in: engines } });
      }


      if (compatibilityConditions.length > 0) {
        const matchingVariants = await prisma.vehicleVariant.findMany({
          where: { OR: compatibilityConditions },
          select: { id: true },
        });

        matchingVariants.forEach(v => compatibleVariantIds.add(v.id));
      }

      // 4. 寫入 PartCompatibility 關聯
      if (compatibleVariantIds.size > 0) {
        const compatibilityRecords = Array.from(compatibleVariantIds).map(vehicleId => ({
          part_id: part.id,
          vehicle_id: vehicleId,
        }));
        
        await prisma.partCompatibility.createMany({ 
            data: compatibilityRecords,
            skipDuplicates: true
        });
        compatibilityCount += compatibilityRecords.length;
      }

      // console.log(`   [${sku}] 成功匹配 ${compatibleVariantIds.size} 個車型。`); // 輔助除錯用

    } catch (e) {
      console.error(`❌ 處理零件 SKU: ${sku} 時發生錯誤：`, e.message);
    }
  }

  console.log(`\n🎉 零件資料匯入與匹配完成。`);
  console.log(`   - 成功匯入 ${successCount} 筆零件。`);
  console.log(`   - 總共建立 ${compatibilityCount} 筆零件-車型關聯紀錄。`);
}

main()
  .catch((e) => {
    console.error("腳本執行失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });