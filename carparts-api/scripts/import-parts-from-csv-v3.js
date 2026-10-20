const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// 完整的 CSV 解析器，支援多行欄位
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }
    
    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }
    
    if ((char === '\n' || char === '\r') && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [];
      // 跳過 \r\n
      if (char === '\r' && nextChar === '\n') i += 2;
      else i++;
      continue;
    }
    
    currentField += char;
    i++;
  }
  
  // 最後一行
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
  }
  
  return rows.map(row => row.map(f => f.trim()));
}

// 從字串中提取世代代碼 (如 "(89)"、"8L"、"E90" 等)
function extractGeneration(str) {
  if (!str) return '';
  
  // 嘗試匹配括號內的代碼：(89)、(8L)、(8N)、(E90) 等
  const parenMatch = str.match(/\(([A-Z0-9\-\.]+)\)/);
  if (parenMatch) return parenMatch[1];
  
  // 嘗試匹配常見世代格式
  const genMatch = str.match(/\b([A-Z]\d+[A-Z]?|\d+[A-Z]\d*)\b/);
  if (genMatch) return genMatch[1];
  
  return '';
}

// 正規化車型名稱用於匹配
function normalizeModel(str) {
  if (!str) return '';
  return str
    .replace(/\([^)]*\)/g, '') // 移除括號內容
    .replace(/[，,].*/, '') // 移除逗號後內容
    .replace(/[；;].*/, '') // 移除分號後內容
    .trim()
    .toUpperCase();
}

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
  const makeGenIndex = {};   // make|generation (針對 KW 等只有世代碼的資料)
  const noEngineIndex = {};  // make|model|generation
  const looseIndex = {};     // make|model
  
  vehicles.forEach(v => {
    const fullKey = `${v.make}|${v.model}|${v.generation}|${v.engine_code}`.toUpperCase();
    if (!fullIndex[fullKey]) fullIndex[fullKey] = [];
    fullIndex[fullKey].push(v.id);

    const makeGenKey = `${v.make}|${v.generation}`.toUpperCase();
    if (!makeGenIndex[makeGenKey]) makeGenIndex[makeGenKey] = [];
    makeGenIndex[makeGenKey].push(v.id);

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
  const rows = parseCSV(csvContent);
  
  if (rows.length < 2) {
    console.log('❌ CSV 檔案無資料');
    return;
  }

  // 解析 header
  const headers = rows[0];
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
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const getCol = (colName) => {
      const idx = colIndices[colName];
      return (idx !== undefined && cols[idx] !== undefined) ? cols[idx].trim() : '';
    };
    
    const sku = getCol(skuColumn);
    const name = getCol(nameColumn);
    const brand = getCol(brandColumn) || '';
    const category = getCol(categoryColumn) || '';
    const subcategory = getCol(subcategoryColumn) || '';
    const msrp = parseFloat(getCol(msrpColumn)) || 0;
    const wholesale = parseFloat(getCol(wholesaleColumn)) || 0;
    const stock = parseInt(getCol(stockColumn)) || 0;
    const description = getCol(descriptionColumn) || null;
    const imageUrl = getCol(imageColumn) || null;
    
    const make = getCol(makeColumn);
    const model = getCol(modelColumn);
    const generation = getCol(generationColumn) || '';
    const engineCode = getCol(engineColumn) || '';
    const yearStr = getCol(yearColumn) || '';

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
          brand: brand || '',
          msrp_price: msrp,
          wholesale_price: wholesale,
          stock_qty: stock,
          description: description,
          image_url: imageUrl,
          is_active: true
        }
      });
      updatedPartsCount++;
    } else {
      // 建立新零件
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
          description: description,
          image_url: imageUrl,
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
      // 提取世代代碼
      const extractedGen = generation || extractGeneration(model);
      const normalizedModel = normalizeModel(model);
      
      let matchedVehicleIds = [];
      let matchMethod = '';
      
      // 策略 1: 完整匹配 make|model|generation|engine
      const fullKey = `${make}|${normalizedModel}|${extractedGen}|${engineCode}`.toUpperCase();
      if (fullIndex[fullKey]) {
        matchedVehicleIds = fullIndex[fullKey];
        matchMethod = 'full';
      }
      
      // 策略 2: make + generation (針對 KW CSV 只有世代碼)
      if (matchedVehicleIds.length === 0 && extractedGen) {
        const makeGenKey = `${make}|${extractedGen}`.toUpperCase();
        if (makeGenIndex[makeGenKey]) {
          matchedVehicleIds = makeGenIndex[makeGenKey];
          matchMethod = 'makeGen';
        }
      }
      
      // 策略 3: 無引擎匹配 make|model|generation
      if (matchedVehicleIds.length === 0) {
        const noEngineKey = `${make}|${normalizedModel}|${extractedGen}`.toUpperCase();
        if (noEngineIndex[noEngineKey]) {
          matchedVehicleIds = noEngineIndex[noEngineKey];
          matchMethod = 'noEngine';
        }
      }
      
      // 策略 4: 寬鬆匹配 make|model
      if (matchedVehicleIds.length === 0) {
        const looseKey = `${make}|${normalizedModel}`.toUpperCase();
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
        if (i <= 5) {
          console.log(`  ✅ 匹配成功 (${matchMethod}): ${make} ${model} [Gen:${extractedGen}] -> ${matchedVehicleIds.length} 車型`);
        }
      } else {
        skipCount++;
        if (skipCount <= 5) {
          console.log(`  ⚠️ 無匹配車型: ${make} ${model} [Gen:${extractedGen}] (年份: ${yearStr})`);
        }
      }
    } else {
      skipCount++;
    }

    if (i % 1000 === 0) {
      console.log(`  進度: ${i}/${rows.length - 1} 行, 新增 ${newPartsCount}, 更新 ${updatedPartsCount}, 關聯 ${compatCount}, 跳過 ${skipCount}, 錯誤 ${errorCount}`);
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
}

// 執行匯入
async function main() {
  const csvFiles = [
    'C:/carparts/carparts-api/media/Data/parts_upload_KW.csv',
    'C:/carparts/carparts-api/media/Data/JXB.csv'
  ];
  
  for (const csvFile of csvFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`處理檔案: ${csvFile}`);
    console.log(`${'='.repeat(60)}`);
    await importPartsFromCSV(csvFile);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);