const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importAirFilterCompatibility() {
  console.log('🚀 開始匯入空濾車型相容性關係...\n');

  // 1. 讀取零件資料庫，建立 SKU -> Part ID 映射
  const parts = await prisma.part.findMany({
    select: { id: true, sku: true, name: true, brand: true }
  });
  
  const skuToPartId = {};
  parts.forEach(p => {
    // 正規化 SKU：去除空格、統一大小寫
    const normalizedSku = p.sku.trim().toUpperCase();
    skuToPartId[normalizedSku] = p.id;
  });
  console.log(`✅ 載入零件 ${parts.length} 筆，建立 SKU 索引`);

  // 2. 讀取車型資料庫，建立查詢索引
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

  // 建立索引：make + model + generation + engine_code -> vehicle ids
  const vehicleIndex = {};
  vehicles.forEach(v => {
    const key = `${v.make}|${v.model}|${v.generation}|${v.engine_code}`.toUpperCase();
    if (!vehicleIndex[key]) vehicleIndex[key] = [];
    vehicleIndex[key].push(v.id);
  });

  // 3. 解析空濾關係 CSV
  const csvPath = 'C:/carparts/carparts-api/media/Data/空濾車型關係表_20260805.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  // 解析 header
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('CSV Headers:', headers);
  
  // 品牌欄位索引 (Pipercross, BMC, KN 等)
  const brandColumns = headers.slice(7); // 從第 8 欄開始是品牌
  console.log('品牌欄位:', brandColumns);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  // 4. 處理每一行資料
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 8) continue;

    const [make, model, generation, engine, displacement, horsepower, yearRange, ...brandSkus] = cols;

    // 解析年份範圍 (如 "17-26" 或 "10/15 - 2025")
    let yearStart = null, yearEnd = null;
    if (yearRange && yearRange.includes('-')) {
      const parts = yearRange.split('-').map(p => p.trim());
      yearStart = parseInt(parts[0]) + 2000; // 假設兩位數年份
      yearEnd = parseInt(parts[1]) + 2000;
    } else if (yearRange && yearRange.includes('/')) {
      // "10/15 - 2025" 格式
      const match = yearRange.match(/(\d{2})[/\-](\d{2})\s*-\s*(\d{4})/);
      if (match) {
        yearStart = 2000 + parseInt(match[1]);
        yearEnd = parseInt(match[3]);
      }
    }

    // 找出匹配的車型
    const searchKey = `${make}|${model}|${generation}|${engine}`.toUpperCase();
    const matchedVehicleIds = vehicleIndex[searchKey] || [];
    
    if (matchedVehicleIds.length === 0) {
      // 嘗試寬鬆匹配：只比對 make, model, generation
      const looseKey = `${make}|${model}|${generation}`.toUpperCase();
      for (const [key, ids] of Object.entries(vehicleIndex)) {
        if (key.startsWith(looseKey + '|')) {
          // 進一步過濾年份
          const filtered = ids.filter(vid => {
            const v = vehicles.find(v => v.id === vid);
            if (!v) return false;
            if (yearStart && v.year_end && v.year_end < yearStart) return false;
            if (yearEnd && v.year_start && v.year_start > yearEnd) return false;
            return true;
          });
          if (filtered.length > 0) {
            matchedVehicleIds.push(...filtered);
          }
        }
      }
    }

    if (matchedVehicleIds.length === 0) {
      skipCount++;
      continue;
    }

    // 5. 處理每個品牌的 SKU
    for (let j = 0; j < brandColumns.length; j++) {
      const brand = brandColumns[j];
      const sku = brandSkus[j]?.trim();
      
      if (!sku || sku === '' || sku === '-') continue;

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
  
  await prisma.$disconnect();
}

importAirFilterCompatibility().catch(console.error);