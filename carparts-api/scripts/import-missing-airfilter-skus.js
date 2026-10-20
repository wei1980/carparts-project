const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// 品牌列標題對應
const BRAND_COLUMNS = ['Pipercross', 'BMC', 'KN'];  // 對應 CSV 第 8,9,10 欄

// 品牌標準化
const brandNormalize = {
  'Pipercross': 'Pipercross',
  'BMC': 'BMC',
  'KN': 'KN',
  'K&N': 'KN',
};

function normalizeBrand(b) {
  return brandNormalize[b] || b;
}

// 從品牌推斷分類
function getCategoryInfo(brand) {
  const b = brand.toLowerCase();
  if (b === 'bmc' || b === 'pipercross' || b === 'kn') {
    return { category: '進氣', subcategory: '濾芯' };
  }
  return { category: '進氣', subcategory: '濾芯' };
}

// 從關係表 CSV 讀取所有 SKU 與品牌對應
function extractSKUsFromRelationshipCSV() {
  const csvPath = 'C:/carparts/carparts-api/media/Data/空濾車型關係表_20260805.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) return new Map();
  
  const headers = lines[0].split(',').map(h => h.trim());
  const brandCols = headers.slice(7); // 第 8 欄開始是品牌
  
  const skuBrandMap = new Map(); // SKU -> { brand, category, subcategory }
  
  lines.slice(1).forEach(line => {
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 8) return;
    
    const brandSkus = cols.slice(7);
    brandSkus.forEach((sku, idx) => {
      if (sku && sku !== '' && sku !== '-' && sku !== 'N/A') {
        const normalizedSku = sku.trim().toUpperCase();
        const brand = brandCols[idx] || 'Unknown';
        const normBrand = normalizeBrand(brand);
        const { category, subcategory } = getCategoryInfo(normBrand);
        
        if (!skuBrandMap.has(normalizedSku)) {
          skuBrandMap.set(normalizedSku, {
            sku: sku.trim(),
            brand: normBrand,
            category,
            subcategory
          });
        }
      }
    });
  });
  
  return skuBrandMap;
}

// 從 Parts_Filter.csv 讀取已存在的 SKU
function getExistingSKUsFromPartsFilter() {
  const csvPath = 'C:/carparts/carparts-api/media/Data/Parts_Filter.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  const existingSkus = new Set();
  lines.slice(1).forEach(line => {
    const cols = line.split(',');
    if (cols[0]) {
      existingSkus.add(cols[0].trim().toUpperCase());
    }
  });
  return existingSkus;
}

async function main() {
  console.log('🚀 開始補齊缺失的空濾 SKU...\n');
  
  // 1. 讀取關係表所有 SKU
  const relSkuMap = extractSKUsFromRelationshipCSV();
  console.log(`關係表總 SKU: ${relSkuMap.size} 筆`);
  
  // 2. 讀取 Parts_Filter.csv 現有 SKU
  const existingSkus = getExistingSKUsFromPartsFilter();
  console.log(`Parts_Filter.csv 現有 SKU: ${existingSkus.size} 筆`);
  
  // 3. 找出缺失的 SKU
  const missingSkus = [];
  relSkuMap.forEach((info, sku) => {
    if (!existingSkus.has(sku)) {
      missingSkus.push({ sku: info.sku, brand: info.brand, category: info.category, subcategory: info.subcategory });
    }
  });
  
  console.log(`需補齊 SKU: ${missingSkus.length} 筆\n`);
  
  if (missingSkus.length === 0) {
    console.log('✅ 無缺失 SKU，無需補齊');
    await prisma.$disconnect();
    return;
  }
  
  // 4. 先取得 category/subcategory ID
  const categories = await prisma.categories.findMany({
    where: { name: { in: [...new Set(missingSkus.map(m => m.category))] } },
    include: { subcategories: true }
  });
  
  const catMap = {};
  const subcatMap = {};
  categories.forEach(c => {
    catMap[c.name] = c.id;
    c.subcategories.forEach(s => {
      subcatMap[`${c.name}|${s.name}`] = s.id;
    });
  });
  
  console.log('分類映射:', catMap);
  console.log('子分類映射:', subcatMap);
  
  // 5. 批次建立缺失的零件
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  // 確保 subcategory 存在
  for (const { category, subcategory } of missingSkus) {
    if (!subcatMap[`${category}|${subcategory}`]) {
      const catId = catMap[category];
      if (catId) {
        try {
          const sub = await prisma.subcategories.create({
            data: { category_id: catId, name: subcategory, sort_order: 99, is_active: true }
          });
          subcatMap[`${category}|${subcategory}`] = sub.id;
          console.log(`  ✅ 建立子分類: ${category} > ${subcategory} (ID: ${sub.id})`);
        } catch (e) {
          console.error(`  ❌ 建立子分類失敗: ${category} > ${subcategory}`, e.message);
        }
      }
    }
  }
  
  // 建立零件
  for (const item of missingSkus) {
    try {
      const subcatKey = `${item.category}|${item.subcategory}`;
      const subcategoryId = subcatMap[subcatKey];
      
      if (!subcategoryId) {
        console.log(`  ⚠️ 缺少子分類 ID: ${subcatKey}，跳過 ${item.sku}`);
        skipped++;
        continue;
      }
      
      // 檢查是否已存在
      const existing = await prisma.part.findUnique({
        where: { sku: item.sku }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      await prisma.part.create({
        data: {
          sku: item.sku,
          name: `${item.brand} 高流量空濾 ${item.sku}`,
          brand: item.brand,
          category: item.category,
          subcategory_id: subcategoryId,
          msrp_price: 0,
          wholesale_price: 0,
          stock_qty: 0,
          is_active: true,
          is_universal: false,
          description: `${item.brand} 高流量空氣濾清器 ${item.sku}`,
          image_url: ''
        }
      });
      
      created++;
      if (created % 50 === 0) {
        console.log(`  已建立 ${created} 筆...`);
      }
      
    } catch (e) {
      errors++;
      console.error(`  ❌ 建立失敗 ${item.sku}: ${e.message}`);
    }
  }
  
  console.log(`\n📊 補齊完成:`);
  console.log(`  新增: ${created}`);
  console.log(`  跳過(已存在): ${skipped}`);
  console.log(`  錯誤: ${errors}`);
  
  // 6. 驗證結果
  const finalParts = await prisma.part.findMany({
    where: { subcategory: { name: '濾芯' } },
    select: { sku: true }
  });
  console.log(`\n✅ 空濾零件總數: ${finalParts.length} 筆`);
  
  // 檢查關係表 SKU 是否都在 DB
  const dbSkus = new Set(finalParts.map(p => p.sku.trim().toUpperCase()));
  const stillMissing = [...relSkuMap.keys()].filter(sku => !dbSkus.has(sku));
  console.log(`關係表仍缺失 SKU: ${stillMissing.length} 筆`);
  if (stillMissing.length > 0) {
    console.log('  範例:', stillMissing.slice(0, 10));
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });