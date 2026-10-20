const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importAirFilterCompatibilityV2() {
  console.log('🚀 開始匯入空濾車型相容性關係 (V2 - 改進匹配)...\n');

  // 1. 讀取零件資料庫，建立 SKU -> Part ID 映射
  const parts = await prisma.part.findMany({
    select: { id: true, sku: true, name: true, brand: true }
  });
  
  const skuToPartId = {};
  parts.forEach(p => {
    const normalizedSku = p.sku.trim().toUpperCase();
    skuToPartId[normalizedSku] = p.id;
  });
  console.log(`✅ 載入零件 ${parts.length} 筆，建立 SKU 索引`);

  // 2. 讀取車型資料庫
  const vehicles = await prisma.vehicleVariant.findMany({
    select: { 
      id: true, 
      make: true, 
      model: true, 
      generation: true, 
      engine_code: true,
      variant_name: true,
      year_start: true,
      year_end: true
    }
  });
  console.log(`✅ 載入車型 ${vehicles.length} 筆`);

  // 建立多層索引
  // 索引 1: 最精準鍵 make|model|year_start|engine_code (年份+車型+引擎最準確)
  const preciseIndex = {};
  // 索引 2: 引擎優先鍵 make|engine_code (空濾看引擎)
  const engineFirstIndex = {};
  // 索引 3: 完整鍵 make|model|generation|engine_code
  const fullIndex = {};
  // 索引 4: make|model|generation (不含引擎)
  const noEngineIndex = {};
  // 索引 5: make|model (最寬鬆)
  const looseIndex = {};
  
  vehicles.forEach(v => {
    // 精準鍵：年份起始 + 車型 + 引擎
    if (v.year_start && v.engine_code) {
      const preciseKey = `${v.make}|${v.model}|${v.year_start}|${v.engine_code}`.toUpperCase();
      if (!preciseIndex[preciseKey]) preciseIndex[preciseKey] = [];
      preciseIndex[preciseKey].push(v.id);
    }

    const engineKey = `${v.make}|${v.engine_code}`.toUpperCase();
    if (!engineFirstIndex[engineKey]) engineFirstIndex[engineKey] = [];
    engineFirstIndex[engineKey].push(v.id);

    const fullKey = `${v.make}|${v.model}|${v.generation}|${v.engine_code}`.toUpperCase();
    if (!fullIndex[fullKey]) fullIndex[fullKey] = [];
    fullIndex[fullKey].push(v.id);

    const noEngineKey = `${v.make}|${v.model}|${v.generation}`.toUpperCase();
    if (!noEngineIndex[noEngineKey]) noEngineIndex[noEngineKey] = [];
    noEngineIndex[noEngineKey].push(v.id);

    const looseKey = `${v.make}|${v.model}`.toUpperCase();
    if (!looseIndex[looseKey]) looseIndex[looseKey] = [];
    looseIndex[looseKey].push(v.id);
  });

  // 3. 解析空濾關係 CSV
  const csvPath = 'C:/carparts/carparts-api/media/Data/空濾車型關係表_20260805.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  const headers = lines[0].split(',').map(h => h.trim());
  const brandColumns = headers.slice(7);
  console.log('品牌欄位:', brandColumns);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];
  const matchedDetails = [];

  // 4. 處理每一行資料
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 8) continue;

    const [make, model, generation, engine, displacement, horsepower, yearRange, ...brandSkus] = cols;

    // 解析年份範圍
    let yearStart = null, yearEnd = null;
    if (yearRange && yearRange.includes('-')) {
      const parts = yearRange.split('-').map(p => p.trim());
      yearStart = parseInt(parts[0]) + 2000;
      yearEnd = parseInt(parts[1]) + 2000;
    } else if (yearRange && yearRange.includes('/')) {
      const match = yearRange.match(/(\d{2})[/\-](\d{2})\s*-\s*(\d{4})/);
      if (match) {
        yearStart = 2000 + parseInt(match[1]);
        yearEnd = parseInt(match[3]);
      }
    }

    // 多層級匹配策略
    let matchedVehicleIds = [];
    let matchMethod = '';
    
    // 策略 1: 引擎優先匹配 make|engine_code (引擎第一)
    const engineKey = `${make}|${engine}`.toUpperCase();
    if (engineFirstIndex[engineKey]) {
      matchedVehicleIds = engineFirstIndex[engineKey];
      matchMethod = 'engineFirst';
    }
    
    // 策略 2: 世代匹配 make|model|generation|engine_code (世代第二)
    if (matchedVehicleIds.length === 0) {
      const genKey = `${make}|${model}|${generation}|${engine}`.toUpperCase();
      if (fullIndex[genKey]) {
        matchedVehicleIds = fullIndex[genKey];
        matchMethod = 'generation';
      }
    }
    
    // 策略 3: 精準鍵 make|model|year_start|engine_code (年份+車型+引擎)
    if (matchedVehicleIds.length === 0 && yearStart) {
      const preciseKey = `${make}|${model}|${yearStart}|${engine}`.toUpperCase();
      if (preciseIndex[preciseKey]) {
        matchedVehicleIds = preciseIndex[preciseKey];
        matchMethod = 'precise';
      }
    }
    
    // 策略 4: 無引擎匹配 make|model|generation
    if (matchedVehicleIds.length === 0) {
      const noEngineKey = `${make}|${model}|${generation}`.toUpperCase();
      if (noEngineIndex[noEngineKey]) {
        matchedVehicleIds = noEngineIndex[noEngineKey];
        matchMethod = 'noEngine';
      }
    }
    
    // 策略 5: 寬鬆匹配 make|model
    if (matchedVehicleIds.length === 0) {
      const looseKey = `${make}|${model}`.toUpperCase();
      if (looseIndex[looseKey]) {
        matchedVehicleIds = looseIndex[looseKey];
        matchMethod = 'loose';
      }
    }

    // 年份過濾
    if (matchedVehicleIds.length > 0 && (yearStart || yearEnd)) {
      matchedVehicleIds = matchedVehicleIds.filter(vid => {
        const v = vehicles.find(v => v.id === vid);
        if (!v) return false;
        if (yearStart && v.year_end && v.year_end < yearStart) return false;
        if (yearEnd && v.year_start && v.year_start > yearEnd) return false;
        return true;
      });
    }

    if (matchedVehicleIds.length === 0) {
      skipCount++;
      if (skipCount <= 10) {
        console.log(`  ⚠️ 無匹配車型: ${make} ${model} ${generation} ${engine} (年份: ${yearRange})`);
      }
      continue;
    }

    if (skipCount <= 5) {
      console.log(`  ✅ 匹配成功 (${matchMethod}): ${make} ${model} ${generation} ${engine} -> ${matchedVehicleIds.length} 車型`);
    }

    // 5. 處理每個品牌的 SKU
    for (let j = 0; j < brandColumns.length; j++) {
      const brand = brandColumns[j];
      const sku = brandSkus[j]?.trim();
      
      if (!sku || sku === '' || sku === '-' || sku === 'N/A') continue;

      const normalizedSku = sku.toUpperCase();
      const partId = skuToPartId[normalizedSku];
      
      if (!partId) {
        errorCount++;
        errors.push(`SKU not found: ${sku} (Brand: ${brand}, Vehicle: ${make} ${model} ${generation})`);
        continue;
      }

      // 建立相容性關聯
      for (const vehicleId of matchedVehicleIds) {
        try {
          await prisma.partCompatibility.upsert({
            where: {
              part_id_vehicle_id: { part_id: partId, vehicle_id: vehicleId }
            },
            update: {},
            create: { part_id: partId, vehicle_id: vehicleId }
          });
          successCount++;
        } catch (e) {
          errorCount++;
          errors.push(`DB error: ${e.message}`);
        }
      }
      
      matchedDetails.push({
        partSku: sku,
        brand,
        vehicle: `${make} ${model} ${generation}`,
        matchedCount: matchedVehicleIds.length,
        method: matchMethod
      });
    }

    if (i % 500 === 0) {
      console.log(`  進度: ${i}/${lines.length} 行, 成功 ${successCount}, 跳過 ${skipCount}, 錯誤 ${errorCount}`);
    }
  }

  console.log('\n📊 匯入完成統計:');
  console.log(`  成功建立關聯: ${successCount}`);
  console.log(`  跳過 (無匹配車型): ${skipCount}`);
  console.log(`  錯誤: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ 錯誤樣本 (前 20 筆):');
    errors.slice(0, 20).forEach(e => console.log('  -', e));
  }

  // 驗證結果
  const finalCompatCount = await prisma.partCompatibility.count();
  console.log(`\n✅ PartCompatibility 總筆數: ${finalCompatCount}`);
  
  // 統計各品牌關聯數
  const brandStats = await prisma.partCompatibility.groupBy({
    by: ['part_id'],
    _count: true
  });
  console.log(`\n有相容車型的零件數: ${brandStats.length} / ${parts.length}`);
  
  await prisma.$disconnect();
}

importAirFilterCompatibilityV2().catch(console.error);