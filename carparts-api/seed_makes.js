const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/* ============================== Utility Functions ============================== */

// 用於正規化世代名稱的工具函數
function normalizeGenName(name) {
  if (!name) return "";
  let s = String(name).trim().toUpperCase();
  s = s.replace(/^mk\s*([ivx\d]+)/i, "MK$1"); 
  s = s.replace(/(\d+)\s*代/i, (m, p1) => `MK${p1}`);
  return s;
}

// 用於將字串轉換為整數 (處理 "電動", "-", 或空值)
function parseIntSafe(value) {
  if (!value) return null;
  const cleanVal = String(value).replace(/,/g, '').trim();
  
  // 將非數字的標記轉為 0
  if (cleanVal === '電動' || cleanVal === '-' || cleanVal === '0' || cleanVal.toLowerCase() === 'null') return 0;
  
  const parsed = parseInt(cleanVal, 10);
  return isNaN(parsed) ? null : parsed;
}


/**
 * 🧹 清除車型相關表格的資料，不影響零件 (parts) 或其他資料。
 */
async function clearDatabase() {
    console.log('🧹 正在清除舊的車型資料庫 (Makes, Models, Generations, Variants)...');
    
    // 必須從下往上刪除以遵守外鍵約束
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE vehicle_variants RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE generations RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE models RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE makes RESTART IDENTITY CASCADE;`);

    console.log('✅ 車型資料已清除完畢，零件資料庫未受影響。');
}


/* ============================== Main Logic ============================== */

async function main() {
    
    // 執行清除操作
    await clearDatabase();
    
    console.log('📖 正在讀取 Makes.csv (UTF-8 mode)...');
    
    // 讀取 CSV 檔案
    const stream = fs.createReadStream('Makes.csv')
      .pipe(csv());

    for await (const row of stream) {
      // 擷取資料
      const makeName = row['製造商']?.trim();
      const modelName = row['車系']?.trim();
      const variantName = row['車型名稱']?.trim();
      const genName = normalizeGenName(row['世代']);
      
      const yearFrom = parseIntSafe(row['年份開始']);
      const yearTo = parseIntSafe(row['年份結束']);
      const engineCode = row['引擎']?.trim();
      const displacement = parseIntSafe(row['排氣量(cc)']);
      const powerHp = parseIntSafe(row['馬力(HP)']);
      const fuelType = row['燃油']?.trim();
      const drivetrain = row['驅動']?.trim();

      if (!makeName || !modelName) {
        // 如果 CSV 資料有空行或不完整的行，這裡會捕捉到
        console.warn(`⚠️ 跳過無效資料行 (Make/Model 為空): ${JSON.stringify(row)}`);
        continue;
      }

      try {
        // --- Step A: Make (製造商) ---
        let make = await prisma.makes.findFirst({ where: { name: makeName } });
        if (!make) {
          make = await prisma.makes.create({ data: { name: makeName } });
          console.log(`✅ 建立製造商: ${makeName}`);
        }

        // --- Step B: Model (車系) ---
        let model = await prisma.models.findFirst({ 
          where: { name: modelName, make_id: make.id } 
        });
        if (!model) {
          model = await prisma.models.create({ 
            data: { name: modelName, make_id: make.id } 
          });
          console.log(`  ✅ 建立車系: ${modelName}`);
        }

        // --- Step C: Generation (世代) ---
        let generation = null;
        if (genName) {
          generation = await prisma.generations.findFirst({
            where: { model_id: model.id, name: genName }
          });
          if (!generation) {
            generation = await prisma.generations.create({
              data: {
                model_id: model.id,
                name: genName,
                year_from: yearFrom,
                year_to: yearTo
              }
            });
          }
        }

        // --- Step D: Vehicle Variant (車型變體) ---
        const existingVariant = await prisma.vehicle_variants.findFirst({
          where: {
            model_id: model.id,
            generation_id: generation ? generation.id : null,
            name: variantName,
            engine_code: engineCode,
          }
        });

        if (!existingVariant) {
          await prisma.vehicle_variants.create({
            data: {
              model_id: model.id,
              generation_id: generation ? generation.id : null,
              name: variantName,
              engine_code: engineCode,
              year_from: yearFrom,
              year_to: yearTo,
              fuel_type: fuelType,
              displacement: displacement,
              power_hp: powerHp,
              drivetrain: drivetrain,
              transmission: null, // 假設 CSV 沒有提供，填 null
            }
          });
          process.stdout.write('.'); 
        }

      } catch (error) {
        console.error(`❌ 處理資料錯誤 (${makeName} - ${modelName}):`, error);
      }
    }
    
    console.log('\n🎉 資料匯入完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });