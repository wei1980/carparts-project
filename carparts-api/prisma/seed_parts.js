// seed_parts.js — 零件資料播種腳本 (專注於商品主檔)
// 使用方式：node seed_parts.js parts.csv

const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/* ============================== Utility Functions (保留原本邏輯) ============================== */

function parseIntSafe(value) {
  if (!value) return null;
  const cleanVal = String(value).replace(/,/g, '').trim();
  if (cleanVal === '電動' || cleanVal === '-' || cleanVal === '0' || cleanVal.toLowerCase() === 'null') {
    return null;
  }
  const parsed = parseInt(cleanVal, 10);
  return isNaN(parsed) ? null : parsed;
}

function normalizeMode(val, stockQty = null) {
  if (val == null || val === "") {
    if (stockQty != null) return parseInt(stockQty) > 0 ? "stock" : "preorder";
    return "stock"; 
  }
  const v = String(val).trim().toLowerCase();
  if (v === "stock" || v === "現貨") return "stock";
  if (v === "preorder" || v === "預訂") return "preorder";
  return stockQty != null ? (parseInt(stockQty) > 0 ? "stock" : "preorder") : "stock";
}

function normalizeSupplyStatus(val, stockQty) {
  if (val != null && val !== "") {
    const up = String(val).trim().toUpperCase();
    if (["IN_STOCK", "PREORDER", "DISCONTINUED"].includes(up)) return up;
  }
  const qty = parseIntSafe(stockQty) || 0;
  return qty > 0 ? "IN_STOCK" : "PREORDER";
}

function toBoolean(val, defaultValue = true) {
  if (val == null || val === "") return defaultValue;
  if (typeof val === "boolean") return val;
  const normalized = String(val).trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "y", "on", "是"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off", "否"].includes(normalized)) return false;
  return defaultValue;
}

/* ============================== Lookup Helpers ============================== */

// 查找或建立分類
async function findOrCreateCategory(categoryName) {
  if (!categoryName) return null;
  const name = String(categoryName).trim();
  
  // 嘗試查找
  let category = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, parentId: null }
  });

  // 不存在則建立
  if (!category) {
    category = await prisma.category.create({
      data: { 
        name, 
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        isActive: true,
      }
    });
  }
  return category.id;
}

// 查找或建立子分類
async function findOrCreateSubcategory(subcategoryName, parentId) {
  if (!subcategoryName || !parentId) return null;
  const name = String(subcategoryName).trim();

  let subcategory = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      parentId: parentId
    }
  });

  if (!subcategory) {
    subcategory = await prisma.category.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        parentId: parentId,
        isActive: true
      }
    });
  }
  return subcategory.id;
}

// 查找或建立品牌
async function findOrCreateBrand(brandName) {
  if (!brandName) return null;
  const name = String(brandName).trim();

  let brand = await prisma.brand.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });

  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '_'),
        isActive: true
      }
    });
  }
  return brand.id;
}

// 同步分類關聯 (PartsOnCategories)
async function syncPartCategories(partId, categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return;

  // 1. 先刪除舊關聯
  await prisma.partsOnCategories.deleteMany({
    where: { partId: partId }
  });

  // 2. 建立新關聯
  for (const categoryId of categoryIds) {
    await prisma.partsOnCategories.create({
      data: {
        partId: partId,
        categoryId: categoryId
      }
    }).catch(err => {
        // 忽略唯一性約束錯誤 (如果有的話)
    });
  }
}

/* ============================== Main Logic ============================== */

async function main() {
  const args = process.argv.slice(2);
  const csvFile = args[0] || 'parts.csv';
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ 找不到檔案: ${csvFile}`);
    process.exit(1);
  }
  
  console.log(`📖 正在讀取 ${csvFile} (純商品資料模式)...`);
  
  const results = [];
  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      
      let createCount = 0;
      let updateCount = 0;
      let errorCount = 0;

      for (const row of results) {
        try {
          // ===== 1. 基本欄位解析 =====
          const sku = row['sku'] || row['SKU'] || row['零件編號'];
          const name = row['name'] || row['零件名稱'] || row['品名'];
          
          if (!sku || !name) {
            errorCount++;
            continue;
          }

          // 價格
          const msrp = parseIntSafe(row['msrp'] || row['msrp_twd'] || row['建議售價']);
          const wholesale = parseIntSafe(row['wholesale'] || row['wholesale_twd'] || row['批發價']);
          
          // 庫存與狀態
          const stock_qty = parseIntSafe(row['stock_qty'] || row['庫存數量']) || 0;
          const supply_status = normalizeSupplyStatus(row['supply_status'] || row['供貨狀態'], stock_qty);
          const availability_mode = normalizeMode(row['availability_mode'] || row['可用性模式'], stock_qty);
          
          // 交期
          const preorder_days = supply_status === "IN_STOCK" ? 0 : (parseIntSafe(row['preorder_days'] || row['預訂天數']) || 21);
          const lead_time_days = availability_mode === "stock" ? 0 : (parseIntSafe(row['lead_time_days'] || row['交期天數']) || preorder_days);
          
          // 其他
          const image_url = row['image_url'] || row['圖片網址'] || null;
          const description = row['description'] || row['說明'] || null;
          const is_active = toBoolean(row['is_active'] || row['是否啟用'], true);

          // 品牌與分類
          const brandName = row['brand'] || row['品牌'];
          const categoryName = row['category'] || row['主分類'];
          const subcategoryName = row['subcategory'] || row['子分類'];

          // ===== 2. 準備關聯 ID =====
          const brandId = await findOrCreateBrand(brandName);
          
          // 分類邏輯 (先主後子)
          const mainCategoryId = await findOrCreateCategory(categoryName);
          let targetCategoryId = mainCategoryId; // 預設關聯到主分類

          // 如果有子分類，且主分類存在，則嘗試找子分類
          if (subcategoryName && mainCategoryId) {
             const subId = await findOrCreateSubcategory(subcategoryName, mainCategoryId);
             if (subId) targetCategoryId = subId; // 如果找到子分類，就關聯子分類
          }

          // ===== 3. 寫入 Part 資料表 =====
          // 這裡使用 Prisma 的 upsert (存在則更新，不存在則新增)
          const partData = {
            name: String(name).trim(),
            brandId: brandId,
            price_msrp: msrp,
            price_wholesale: wholesale,
            imageUrl: image_url,
            description: description,
            stock_qty: stock_qty,
            availability_mode: availability_mode,
            lead_time_days: lead_time_days,
            supply_status: supply_status,
            preorder_days: preorder_days,
            isActive: is_active
          };

          const part = await prisma.part.upsert({
            where: { sku: String(sku).trim() },
            update: partData,
            create: {
              sku: String(sku).trim(),
              ...partData
            }
          });

          // 判斷是新增還是更新 (根據 createdAt 簡單判斷，或直接統計)
          // 這裡簡化統計邏輯
          updateCount++; 

          // ===== 4. 處理商品分類關聯 =====
          if (targetCategoryId) {
            await syncPartCategories(part.id, [targetCategoryId]);
          }

          process.stdout.write('.');
          if ((createCount + updateCount) % 50 === 0) process.stdout.write(` ${createCount + updateCount} `);

        } catch (error) {
          console.error(`\n❌ Error SKU [${row['sku']}]: ${error.message}`);
          errorCount++;
        }
      }

      console.log(`\n\n🎉 商品資料匯入完成！`);
      console.log(`📊 總共處理: ${updateCount} 筆 (包含新增與更新)`);
      console.log(`❌ 失敗/跳過: ${errorCount} 筆`);
    });
}

main()
  .catch((e) => {
    console.error('❌ 執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });