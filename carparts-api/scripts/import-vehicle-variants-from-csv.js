// scripts/import-vehicle-variants-from-csv.js
// 從 CSV 匯入 VehicleVariant 資料
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// 驅動類型映射
const driveTypeMap = {
  '前驅': 'FWD',
  '後驅': 'RWD',
  '四驅': 'AWD',
  '待確認': null,
};

// 解析引擎代碼
function parseEngineCode(engine) {
  if (!engine) return null;
  // 移除括號內容
  return engine.replace(/\([^)]*\)/g, '').trim();
}

// 解析世代
function parseGeneration(gen) {
  if (!gen) return '';
  return gen.trim();
}

// 正規化廠牌名稱
const brandNormalize = {
  'Mercedes-Benz': 'Mercedes-Benz',
  'Mercedes benz': 'Mercedes-Benz',
  'Volkswagen': 'Volkswagen',
  'VW': 'Volkswagen',
  'Land Rover': 'Land Rover',
  'Alfa Romeo': 'Alfa Romeo',
};

function normalizeBrand(make) {
  return brandNormalize[make] || make;
}

async function main() {
  console.log('🚀 開始從 CSV 匯入 VehicleVariant...');
  
  const filePath = 'C:\\carparts\\carparts-api\\media\\Data\\Makes_20260831(資料庫版).csv';
  
  const results = [];
  
  // 讀取 CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`📊 讀取到 ${results.length} 筆資料`);
  
  // 批次處理
  let success = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const row of results) {
    try {
      const year = row['Year'] ? parseInt(row['Year']) : null;
      if (!year) {
        skipped++;
        continue;
      }
      
      const make = normalizeBrand(row['Makes'] || '');
      const model = (row['Model'] || '').trim();
      const generation = parseGeneration(row['Generation'] || '');
      const engineCode = parseEngineCode(row['Engine'] || '');
      const driveType = row['Drive'] ? driveTypeMap[row['Drive']] : null;
      
      if (!make || !model) {
        skipped++;
        continue;
      }
      
      // 建立 variant_name
      const variantName = `${make} ${model} ${generation}`.trim();
      
      // 檢查是否已存在
      const existing = await prisma.vehicleVariant.findFirst({
        where: {
          make,
          model,
          generation,
          year_start: year,
          year_end: year,
        }
      });
      
      if (existing) {
        // 更新 drive_type
        if (driveType && existing.drive_type !== driveType) {
          await prisma.vehicleVariant.update({
            where: { id: existing.id },
            data: { drive_type: driveType }
          });
        }
        continue;
      }
      
      // 建立新記錄
      await prisma.vehicleVariant.create({
        data: {
          make,
          model,
          generation,
          engine_code: engineCode,
          variant_name: variantName,
          year_start: year,
          year_end: year,
          drive_type: driveType,
          specs: {},
          is_approved: true,
        }
      });
      
      success++;
      
      if (success % 500 === 0) {
        console.log(`  ✅ 已匯入 ${success} 筆...`);
      }
      
    } catch (err) {
      errors++;
      console.error(`❌ 匯入失敗: ${err.message}`);
    }
  }
  
  console.log(`\n✅ 匯入完成: 成功 ${success}, 跳過 ${skipped}, 錯誤 ${errors}`);
  
  // 統計
  const stats = await prisma.vehicleVariant.groupBy({
    by: ['drive_type'],
    _count: true,
  });
  console.log('\n📊 Drive Type 分佈:');
  stats.forEach(s => console.log(`  ${s.drive_type || 'NULL'}: ${s._count}`));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());