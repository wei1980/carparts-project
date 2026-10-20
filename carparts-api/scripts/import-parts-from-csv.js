const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importPartsFromCSV(csvPath, options = {}) {
  const {
    brandColumn = '品牌',
    makeColumn = '廠牌',
    modelColumn = '車型',
    generationColumn = '世代',
    engineColumn = '引擎代碼',
    yearColumn = '年份',
    skuColumn = 'SKU',
    nameColumn = '品名',
    categoryColumn = '主分類',
    subcategoryColumn = '子分類',
    msrpColumn = '建議售價',
    wholesaleColumn = '車廠批發價',
    stockColumn = '庫存數量',
    descriptionColumn = '商品說明',
    imageColumn = '圖片路徑'
  } = options;

  console.log(`🚀 開始匯入零件資料: ${csvPath}\n`);

  // 1. 讀取車型資料庫
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
  const fullIndex = {};      // make|model|generation|engine_code
  const noEngineIndex = {};  // make|model|generation
  const looseIndex = {};     // make|model
  
  vehicles.forEach(v => {
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

  // 2. 讀取現有零件，建立 SKU 索引
  const existingParts = await prisma.part.findMany({
    select: { id: true, sku: true, name: true, brand: true }
  });
  
  const skuToPartId = {};
  existingParts.forEach(p => {
    const normalizedSku = p.sku.trim().toUpperCase();
    skuToPartId[normalizedSku] = p.id;
  });
  console.log(`✅ 載入現有零件 ${existingParts.length} 筆`);

  // 3. 解析 CSV
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    console.log('❌ CSV 檔案無資料');
    return;
  }

  // 解析 header
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('CSV Headers:', headers);

  // 找出欄位索引
  const colIndices = {};
  headers.forEach((h, i) => {
    colIndices[h] = i;
  });

  // 檢查必要欄位
  const requiredCols = [skuColumn, nameColumn, makeColumn, modelColumn];
  for (const col of requiredCols) {
    if (!(col in colIndices)) {
      console.log(`❌ 缺少必要欄位: ${col}`);
      return;
    }
  }

  let newPartsCount = 0;
  let updatedPartsCount = 0;
  let compatCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  // 4. 處理每一行資料
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // 處理包含逗號的欄位 (用雙引號包圍)
    const cols = parseCSVLine(line);
    if (cols.length < headers.length) {
      // 補齊欄位
      while (cols.length < headers.length) cols.push('');
    }

    const getCol = (colName) => cols[colIndices[colName]]?.trim() || '';
    
    const sku = getCol(skuColumn);
    const name = getCol(nameColumn);
    const brand = getCol(brandColumn);
    const category = getCol(categoryColumn);
    const subcategory = getCol(subcategoryColumn);
    const msrp = parseFloat(getCol(msrpColumn)) || 0;
    const wholesale = parseFloat(getCol(wholesaleColumn)) || 0;
    const stock = parseInt(getCol(stockColumn)) || 0;
    const description = getCol(descriptionColumn);
    const imageUrl = getCol(imageColumn);
    
    const make = getCol(makeColumn);
    const model = getCol(modelColumn);
    const generation = getCol(generationColumn);
    const engineCode = getCol(engineColumn);
    const yearStr = getCol(yearColumn);

    if (!sku || !name) {
      skipCount++;
      continue;
    }

    // 解析年份
    let yearStart = null, yearEnd = null;
    if (yearStr) {
      if (yearStr.includes('-')) {
        const parts = yearStr.split('-').map(p => p.trim());
        yearStart = parseInt(parts[0]) || null;
        yearEnd = parseInt(parts[1]) || null;
      } else if (yearStr.includes('/')) {
        const match = yearStr.match(/(\d{2})[/\-](\d{2})\s*-\s*(\d{4})/);
        if (match) {
          yearStart = 2000 + parseInt(match[1]);
          yearEnd = parseInt(match[3]);
        }
      } else {
        const year = parseInt(yearStr);
        if (!isNaN(year)) {
          yearStart = year;
          yearEnd = year;
        }
      }
    }

    // 5. 建立或更新零件
    let partId;
    const normalizedSku = sku.trim().toUpperCase();
    
    if (skuToPartId[normalizedSku]) {
      // 更新現有零件
      partId = skuToPartId[normalizedSku];
      await prisma.part.update({
        where: { id: partId },
        data: {
          name,
          brand: brand || null,
          msrp_price: msrp,
          wholesale_price: wholesale,
          stock_qty: stock,
          description: description || null,
          image_url: imageUrl || null,
          is_active: true
        }
      });
      updatedPartsCount++;
    } else {
      // 建立新零件
      // 先找或建立分類/子分類
      let subcategoryId = null;
      if (subcategory) {
        let sub = await prisma.subcategories.findFirst({
          where: { name: subcategory }
        });
        if (!sub) {
          // 先找或建立主分類
          let cat = await prisma.categories.findFirst({
            where: { name: category }
          });
          if (!cat && category) {
            cat = await prisma.categories.create({ data: { name: category } });
          }
          sub = await prisma.subcategories.create({ 
            data: { 
              name: subcategory,
              category_id: cat?.id || 16 // 默認為 '改裝件'
            } 
          });
        }
        subcategoryId = sub.id;
      }

      const newPart = await prisma.part.create({
        data: {
          sku,
          name,
          brand: brand || '',
          msrp_price: msrp,
          wholesale_price: wholesale,
          stock_qty: stock,
          description: description || null,
          image_url: imageUrl || null,
          subcategory_id: subcategoryId,
          is_active: true
        }
      });
      partId = newPart.id;
      skuToPartId[normalizedSku] = partId;
      newPartsCount++;
    }

    // 6. 匹配車型並建立相容性
    if (make && model) {
      let matchedVehicleIds = [];
      let matchMethod = '';
      
      // 策略 1: 完整匹配
      const fullKey = `${make}|${model}|${generation}|${engineCode}`.toUpperCase();
      if (fullIndex[fullKey]) {
        matchedVehicleIds = fullIndex[fullKey];
        matchMethod = 'full';
      }
      
      // 策略 2: 無引擎匹配
      if (matchedVehicleIds.length === 0) {
        const noEngineKey = `${make}|${model}|${generation}`.toUpperCase();
        if (noEngineIndex[noEngineKey]) {
          matchedVehicleIds = noEngineIndex[noEngineKey];
          matchMethod = 'noEngine';
        }
      }
      
      // 策略 3: 寬鬆匹配
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

      if (matchedVehicleIds.length > 0) {
        for (const vehicleId of matchedVehicleIds) {
          try {
            await prisma.partCompatibility.upsert({
              where: {
                part_id_vehicle_id: { part_id: partId, vehicle_id: vehicleId }
              },
              update: {},
              create: { part_id: partId, vehicle_id: vehicleId }
            });
            compatCount++;
          } catch (e) {
            errorCount++;
            errors.push(`Compat DB error: ${e.message}`);
          }
        }
      } else {
        skipCount++;
      }
    } else {
      skipCount++;
    }

    if (i % 1000 === 0) {
      console.log(`  進度: ${i}/${lines.length - 1} 行, 新增 ${newPartsCount}, 更新 ${updatedPartsCount}, 關聯 ${compatCount}, 跳過 ${skipCount}, 錯誤 ${errorCount}`);
    }
  }

  console.log('\n📊 匯入完成統計:');
  console.log(`  新增零件: ${newPartsCount}`);
  console.log(`  更新零件: ${updatedPartsCount}`);
  console.log(`  建立相容性關聯: ${compatCount}`);
  console.log(`  跳過 (無匹配車型): ${skipCount}`);
  console.log(`  錯誤: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n❌ 錯誤樣本 (前 20 筆):');
    errors.slice(0, 20).forEach(e => console.log('  -', e));
  }

  // 驗證結果
  const finalPartsCount = await prisma.part.count();
  const finalCompatCount = await prisma.partCompatibility.count();
  console.log(`\n✅ Part 總筆數: ${finalPartsCount}`);
  console.log(`✅ PartCompatibility 總筆數: ${finalCompatCount}`);
  
  await prisma.$disconnect();
}

// CSV 行解析器 (處理雙引號包圍的欄位)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 雙重引號 = 跳脫字元
        current += '"';
        i++; // 跳過下一個引號
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  // 處理多行欄位（如果行尾在引號內，需要繼續讀取下一行）
  return result.map(s => s.trim());
}

// 執行匯入
async function main() {
  const csvFiles = [
    'C:/carparts/carparts-api/media/Data/parts_upload_KW.csv',
    'C:/carparts/carparts-api/media/Data/JXB.csv'
  ];
  
  for (const csvFile of csvFiles) {
    console.log(`\n{'='.repeat(60)}`);
    console.log(`處理檔案: ${csvFile}`);
    console.log(`{'='.repeat(60)}`);
    await importPartsFromCSV(csvFile);
  }
}

main().catch(console.error);