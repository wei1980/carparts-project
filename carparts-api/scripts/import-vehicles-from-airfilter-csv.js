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
  'Mini (BMW)': 'Mini',
  'Mini': 'Mini',
};

function normalizeBrand(make) {
  return brandNormalize[make] || make;
}

// 解析年份範圍 (如 "05/96 - 07/04" 或 "08/85 - 07/90")
function parseYearRange(yearRange) {
  if (!yearRange || yearRange === '') return { yearStart: null, yearEnd: null };
  
  // 格式: MM/YY - MM/YY
  const match = yearRange.match(/(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})/);
  if (match) {
    const startMonth = parseInt(match[1]);
    const startYear = 2000 + parseInt(match[2]);
    const endMonth = parseInt(match[3]);
    const endYear = 2000 + parseInt(match[4]);
    return { 
      yearStart: startYear, 
      yearEnd: endYear 
    };
  }
  
  // 格式: YYYY - YYYY
  const match2 = yearRange.match(/(\d{4})\s*-\s*(\d{4})/);
  if (match2) {
    return { 
      yearStart: parseInt(match2[1]), 
      yearEnd: parseInt(match2[2]) 
    };
  }
  
  return { yearStart: null, yearEnd: null };
}

async function main() {
  console.log('🚀 從空濾關係表補齊缺失車型...\n');
  
  const filePath = 'C:/carparts/carparts-api/media/Data/空濾車型關係表_20260805.csv';
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
  
  console.log(`📊 讀取到 ${results.length} 筆關係資料`);
  
  // 提取所有唯一的車型組合
  const vehicleMap = new Map(); // key: make|model|generation|engine
  
  results.forEach(row => {
    const make = normalizeBrand((row.Makes || '').trim());
    const model = (row.Model || '').trim();
    const generation = parseGeneration(row.Generation || '');
    const engineCode = parseEngineCode(row.Engine || '');
    const driveType = row.Drive ? driveTypeMap[row.Drive] : null;
    const { yearStart, yearEnd } = parseYearRange(row.Year);
    
    if (!make || !model || !yearStart) return;
    
    const key = `${make}|${model}|${generation}|${engineCode}`;
    
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        make,
        model,
        generation,
        engine_code: engineCode,
        drive_type: driveType,
        year_start: yearStart,
        year_end: yearEnd,
        variant_name: `${make} ${model} ${generation}`.trim()
      });
    } else {
      // 更新年份範圍
      const existing = vehicleMap.get(key);
      if (yearStart && (!existing.year_start || yearStart < existing.year_start)) {
        existing.year_start = yearStart;
      }
      if (yearEnd && (!existing.year_end || yearEnd > existing.year_end)) {
        existing.year_end = yearEnd;
      }
      if (driveType && !existing.drive_type) {
        existing.drive_type = driveType;
      }
    }
  });
  
  console.log(`🔍 發現 ${vehicleMap.size} 個唯一車型組合`);
  
  // 檢查哪些已存在資料庫
  let existingCount = 0;
  let toCreate = [];
  
  for (const [key, vehicle] of vehicleMap) {
    const existing = await prisma.vehicleVariant.findFirst({
          where: {
            make: vehicle.make,
            model: vehicle.model,
            generation: vehicle.generation,
            year_start: vehicle.year_start,
            year_end: vehicle.year_end,
            engine_code: vehicle.engine_code || '',
          }
        });
    
    if (existing) {
      existingCount++;
      // 更新 drive_type 如果缺失
      if (vehicle.drive_type && !existing.drive_type) {
        await prisma.vehicleVariant.update({
          where: { id: existing.id },
          data: { drive_type: vehicle.drive_type }
        });
      }
    } else {
      toCreate.push(vehicle);
    }
  }
  
  console.log(`✅ 已存在: ${existingCount} 筆`);
  console.log(`🆕 需新增: ${toCreate.length} 筆`);
  
  // 批次建立
  let created = 0;
  let errors = 0;
  
  for (const vehicle of toCreate) {
    try {
      await prisma.vehicleVariant.create({
        data: {
          ...vehicle,
          specs: {},
          is_approved: true,
        }
      });
      created++;
      
      if (created % 100 === 0) {
        console.log(`  已新增 ${created} 筆...`);
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ 新增失敗: ${vehicle.make} ${vehicle.model} ${vehicle.generation} - ${err.message}`);
    }
  }
  
  console.log(`\n📊 完成統計:`);
  console.log(`  新增: ${created}`);
  console.log(`  錯誤: ${errors}`);
  
  // 統計
  const stats = await prisma.vehicleVariant.groupBy({
    by: ['drive_type'],
    _count: true,
  });
  console.log('\n📊 Drive Type 分佈:');
  stats.forEach(s => console.log(`  ${s.drive_type || 'NULL'}: ${s._count}`));
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });