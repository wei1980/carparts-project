// seed_parts.js — 零件資料播種腳本 (增量更新模式)
// 使用方式：node seed_parts.js parts.csv

const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/* ============================== Utility Functions ============================== */

/**
 * 將字串轉換為整數 (處理 "電動", "-", 或空值)
 */
function parseIntSafe(value) {
  if (!value) return null;
  const cleanVal = String(value).replace(/,/g, '').trim();
  
  // 將非數字的標記轉為 0 或 null
  if (cleanVal === '電動' || cleanVal === '-' || cleanVal === '0' || cleanVal.toLowerCase() === 'null') {
    return null;
  }
  
  const parsed = parseInt(cleanVal, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * 標準化 availability_mode
 */
function normalizeMode(val, stockQty = null) {
  if (val == null || val === "") {
    if (stockQty != null) return parseInt(stockQty) > 0 ? "stock" : "preorder";
    return "stock"; // 預設
  }
  const v = String(val).trim().toLowerCase();
  if (v === "stock" || v === "現貨") return "stock";
  if (v === "preorder" || v === "預訂") return "preorder";
  return stockQty != null ? (parseInt(stockQty) > 0 ? "stock" : "preorder") : "stock";
}

/**
 * 標準化 supply_status
 */
function normalizeSupplyStatus(val, stockQty) {
  if (val != null && val !== "") {
    const up = String(val).trim().toUpperCase();
    if (["IN_STOCK", "PREORDER", "DISCONTINUED"].includes(up)) return up;
  }
  const qty = parseIntSafe(stockQty) || 0;
  return qty > 0 ? "IN_STOCK" : "PREORDER";
}

/**
 * 標準化布林值
 */
function toBoolean(val, defaultValue = true) {
  if (val == null || val === "") return defaultValue;
  if (typeof val === "boolean") return val;
  const normalized = String(val).trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "y", "on", "是"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off", "否"].includes(normalized)) return false;
  return defaultValue;
}

/**
 * 根據條件查詢車型 variant ID
 * @param {Object} criteria - { make, model, variant_name, engine_code, year_from, year_to }
 */
async function findVariantId(criteria) {
  const { make, model, variant_name, engine_code, year_from, year_to } = criteria;
  
  if (!make || !model) return null;
  
  try {
    // 1. 找製造商
    const makeRecord = await prisma.makes.findFirst({
      where: { name: { equals: make, mode: 'insensitive' } }
    });
    if (!makeRecord) return null;
    
    // 2. 找車系
    const modelRecord = await prisma.models.findFirst({
      where: {
        name: { equals: model, mode: 'insensitive' },
        make_id: makeRecord.id
      }
    });
    if (!modelRecord) return null;
    
    // 3. 找 variant (支援多條件)
    const where = { model_id: modelRecord.id };
    
    if (variant_name) {
      where.name = { contains: variant_name, mode: 'insensitive' };
    }
    
    if (engine_code) {
      where.engine_code = { equals: engine_code, mode: 'insensitive' };
    }
    
    if (year_from) {
      where.year_from = { lte: parseInt(year_from) };
    }
    
    if (year_to) {
      where.year_to = { gte: parseInt(year_to) };
    }
    
    const variant = await prisma.vehicle_variants.findFirst({ where });
    
    return variant ? variant.id : null;
  } catch (error) {
    console.warn(`  ⚠️  查找車型失敗 (${make} ${model}):`, error.message);
    return null;
  }
}

/**
 * 根據分類名稱查找或建立分類 ID
 */
async function findOrCreateCategory(categoryName) {
  if (!categoryName) return null;
  
  const name = String(categoryName).trim();
  
  let category = await prisma.categories.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });
  
  if (!category) {
    category = await prisma.categories.create({
      data: { 
        name, 
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        is_active: true,
        is_nav: true
      }
    });
    console.log(`  ✅ 建立新分類: ${name}`);
  }
  
  return category.id;
}

/**
 * 根據子分類名稱和主分類 ID 查找或建立子分類
 */
async function findOrCreateSubcategory(subcategoryName, categoryId) {
  if (!subcategoryName || !categoryId) return null;
  
  const name = String(subcategoryName).trim();
  
  let subcategory = await prisma.subcategories.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      category_id: categoryId
    }
  });
  
  if (!subcategory) {
    subcategory = await prisma.subcategories.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        category_id: categoryId,
        is_active: true
      }
    });
    console.log(`    ✅ 建立新子分類: ${name}`);
  }
  
  return subcategory.id;
}

/**
 * 根據品牌名稱查找或建立品牌 ID
 */
async function findOrCreateBrand(brandName) {
  if (!brandName) return null;
  
  const name = String(brandName).trim();
  
  let brand = await prisma.brands.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });
  
  if (!brand) {
    brand = await prisma.brands.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        is_active: true
      }
    });
    console.log(`  ✅ 建立新品牌: ${name}`);
  }
  
  return brand.id;
}

/**
 * 建立或更新零件 (使用 SKU 作為唯一識別)
 */
async function upsertPart(sku, partData) {
  const existing = await prisma.parts.findUnique({ where: { sku } });
  
  if (existing) {
    // 更新現有零件
    return await prisma.parts.update({
      where: { sku },
      data: partData
    });
  } else {
    // 建立新零件
    return await prisma.parts.create({
      data: { ...partData, sku }
    });
  }
}

/**
 * 同步分類關聯 (移除舊的,新增新的)
 */
async function syncPartCategories(partId, categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return;
  
  // 移除舊關聯
  await prisma.parts_on_categories.deleteMany({
    where: { part_id: partId }
  });
  
  // 建立新關聯
  for (const categoryId of categoryIds) {
    await prisma.parts_on_categories.create({
      data: {
        part_id: partId,
        category_id: categoryId
      }
    }).catch(() => {}); // 忽略重複錯誤
  }
}

/**
 * 同步車型相容性 (移除舊的,新增新的)
 */
async function syncPartCompatibilities(partId, variantIds) {
  if (!variantIds || variantIds.length === 0) return;
  
  // 移除舊關聯
  await prisma.part_compatibilities.deleteMany({
    where: { part_id: partId }
  });
  
  // 建立新關聯
  for (const variantId of variantIds) {
    await prisma.part_compatibilities.create({
      data: {
        part_id: partId,
        vehicle_variant_id: variantId
      }
    }).catch(() => {}); // 忽略重複錯誤
  }
}

/* ============================== Main Logic ============================== */

async function main() {
  const args = process.argv.slice(2);
  const csvFile = args[0] || 'parts.csv';
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ 找不到檔案: ${csvFile}`);
    console.log('使用方式: node seed_parts.js [parts.csv]');
    process.exit(1);
  }
  
  console.log(`📖 正在讀取 ${csvFile} (增量更新模式)...`);
  console.log('ℹ️  相同 SKU 將會覆蓋更新,新 SKU 將會新增\n');
  
  const stream = fs.createReadStream(csvFile).pipe(csv());
  
  let createCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  
  for await (const row of stream) {
    try {
      // ===== 基本欄位 =====
      const sku = row['sku'] || row['SKU'] || row['零件編號'];
      const name = row['name'] || row['零件名稱'] || row['品名'];
      const brand = row['brand'] || row['品牌'];
      const category = row['category'] || row['主分類'];
      const subcategory = row['subcategory'] || row['子分類'];
      
      if (!sku || !name) {
        console.warn(`⚠️  跳過無效資料 (缺少 sku 或 name): ${JSON.stringify(row).slice(0, 100)}`);
        errorCount++;
        continue;
      }
      
      // 檢查是否已存在
      const existing = await prisma.parts.findUnique({ 
        where: { sku: String(sku).trim() } 
      });
      const isUpdate = !!existing;
      
      // ===== 價格 =====
      const msrp = parseIntSafe(row['msrp'] || row['msrp_twd'] || row['建議售價']);
      const wholesale = parseIntSafe(row['wholesale'] || row['wholesale_twd'] || row['批發價']);
      
      // ===== 庫存與供貨狀態 =====
      const stock_qty = parseIntSafe(row['stock_qty'] || row['庫存數量']) || 0;
      const supply_status = normalizeSupplyStatus(row['supply_status'] || row['供貨狀態'], stock_qty);
      const availability_mode = normalizeMode(row['availability_mode'] || row['可用性模式'], stock_qty);
      
      // ===== 交期 =====
      const preorder_days = supply_status === "IN_STOCK" ? 0 : (parseIntSafe(row['preorder_days'] || row['預訂天數']) || 21);
      const lead_time_days = availability_mode === "stock" ? 0 : (parseIntSafe(row['lead_time_days'] || row['交期天數']) || preorder_days);
      
      // ===== 其他 =====
      const image_url = row['image_url'] || row['圖片網址'] || null;
      const description = row['description'] || row['說明'] || null;
      const is_active = toBoolean(row['is_active'] || row['是否啟用'], true);
      
      // ===== 查找或建立關聯 ID =====
      const brand_id = brand ? await findOrCreateBrand(brand) : null;
      const category_id = category ? await findOrCreateCategory(category) : null;
      const subcategory_id = (subcategory && category_id) 
        ? await findOrCreateSubcategory(subcategory, category_id) 
        : null;
      
      // ===== 建立/更新零件 =====
      const partData = {
        name: String(name).trim(),
        brand: brand || null,
        brand_id,
        category: category || null,
        subcategory_id,
        msrp_twd: msrp,
        wholesale_twd: wholesale,
        msrp,
        wholesale_price: wholesale,
        image_url,
        description,
        stock_qty,
        availability_mode,
        lead_time_days,
        supply_status,
        preorder_days,
        is_active
      };
      
      const part = await upsertPart(String(sku).trim(), partData);
      
      // ===== 同步分類關聯 =====
      const categoryIds = [category_id].filter(Boolean);
      if (categoryIds.length > 0) {
        await syncPartCategories(part.id, categoryIds);
      }
      
      // ===== 同步車型相容性 (支援多個車型,以分號或逗號分隔) =====
      const compatMakes = (row['相容製造商'] || row['make'] || '').split(/[;,，；]/).map(s => s.trim()).filter(Boolean);
      const compatModels = (row['相容車系'] || row['model'] || '').split(/[;,，；]/).map(s => s.trim()).filter(Boolean);
      const compatVariants = (row['相容車型'] || row['variant'] || '').split(/[;,，；]/).map(s => s.trim()).filter(Boolean);
      const compatEngines = (row['相容引擎'] || row['engine_code'] || '').split(/[;,，；]/).map(s => s.trim()).filter(Boolean);
      const compatYearFrom = row['年份開始'] || row['year_from'];
      const compatYearTo = row['年份結束'] || row['year_to'];
      
      const variantIds = [];
      
      // 支援多組車型 (make, model 配對)
      const maxLength = Math.max(compatMakes.length, compatModels.length);
      for (let i = 0; i < maxLength; i++) {
        const make = compatMakes[i] || compatMakes[0]; // 如果只有一個製造商,就套用到所有
        const model = compatModels[i];
        const variant = compatVariants[i] || '';
        const engine = compatEngines[i] || '';
        
        if (make && model) {
          const variantId = await findVariantId({
            make,
            model,
            variant_name: variant,
            engine_code: engine,
            year_from: compatYearFrom,
            year_to: compatYearTo
          });
          
          if (variantId) {
            variantIds.push(variantId);
          }
        }
      }
      
      if (variantIds.length > 0) {
        await syncPartCompatibilities(part.id, variantIds);
      }
      
      if (isUpdate) {
        updateCount++;
        process.stdout.write('U');
      } else {
        createCount++;
        process.stdout.write('.');
      }
      
      // 每 50 筆顯示進度
      if ((createCount + updateCount) % 50 === 0) {
        console.log(` ${createCount + updateCount} 筆 (新增: ${createCount}, 更新: ${updateCount})`);
      }
      
    } catch (error) {
      console.error(`\n❌ 處理資料錯誤 (SKU: ${row['sku'] || row['SKU']}):`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n\n🎉 零件資料匯入完成！`);
  console.log(`✅ 新增: ${createCount} 筆`);
  console.log(`🔄 更新: ${updateCount} 筆`);
  console.log(`❌ 失敗: ${errorCount} 筆`);
  console.log(`📊 總計: ${createCount + updateCount} 筆零件`);
}

main()
  .catch((e) => {
    console.error('❌ 執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });