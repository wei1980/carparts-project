const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CSV_FILENAME = 'Parts_Filter.csv';
const CSV_PATH = path.join(__dirname, '..', 'media', 'Data', CSV_FILENAME);

async function main() {
  console.log(`🚀 開始匯入商品資料 from ${CSV_FILENAME}...`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ 找不到檔案: ${CSV_PATH}`);
    process.exit(1);
  }

  // 1. 讀取並解析 CSV
  const fileContent = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });

  if (parsed.errors.length > 0) {
    console.warn('⚠️ CSV 解析出現警告 (前3筆):', parsed.errors.slice(0, 3));
  }

  const rows = parsed.data;
  console.log(`📊 讀取到 ${rows.length} 筆商品資料，準備寫入資料庫...`);

  // 2. 確認分類存在
  const category = await prisma.categories.findFirst({ where: { name: '進氣' } });
  if (!category) {
    console.error('❌ 找不到分類「進氣」');
    process.exit(1);
  }
  const subcategory = await prisma.subcategories.findFirst({
    where: { name: '濾芯', category_id: category.id }
  });
  if (!subcategory) {
    console.error('❌ 找不到子分類「濾芯」');
    process.exit(1);
  }
  console.log(`✅ 分類確認: ${category.name} (id: ${category.id}) > ${subcategory.name} (id: ${subcategory.id})`);

  // 3. 逐筆寫入
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const row of rows) {
    try {
      const sku = String(row['sku'] || '').trim();
      const name = String(row['name'] || '').trim();
      const brand = String(row['brand'] || '').trim();
      const msrp_twd = parseFloat(row['msrp_twd']) || 0;
      const wholesale_twd = parseFloat(row['wholesale_twd']) || 0;
      const stock_qty = parseInt(row['stock_qty']) || 0;
      const is_universal = String(row['is_universal'] || '').toLowerCase() === 'true';
      const image_url = String(row['image_url'] || '').trim() || null;
      const description = String(row['description'] || '').trim() || null;

      // 檢查必填欄位
      if (!sku || !name) {
        errors.push({ sku, error: '缺少 SKU 或名稱' });
        errorCount++;
        continue;
      }

      // 檢查 SKU 是否已存在
      const existing = await prisma.part.findUnique({ where: { sku } });
      if (existing) {
        errors.push({ sku, error: 'SKU 已存在' });
        errorCount++;
        continue;
      }

      // 寫入商品
      const createdPart = await prisma.part.create({
        data: {
          sku,
          name,
          brand,
          subcategory_id: subcategory.id,
          category: category.name,
          image_url,
          description,
          msrp_price: msrp_twd,
          wholesale_price: wholesale_twd,
          stock_qty,
          is_universal,
          is_active: true,
        }
      });

      // 建立商品-分類關聯
      await prisma.partsOnCategories.create({
        data: {
          part_id: createdPart.id,
          category_id: category.id
        }
      }).catch(() => {}); // Ignore if fails

      successCount++;
      if (successCount % 50 === 0) process.stdout.write('.');

    } catch (e) {
      errorCount++;
      errors.push({ sku: row['sku'], error: e.message });
      if (errorCount <= 3) console.error(`\n❌ 寫入失敗範例:`, e.message);
    }
  }

  console.log(`\n\n✅ 匯入完成！`);
  console.log(`成功: ${successCount} 筆`);
  console.log(`失敗: ${errorCount} 筆`);
  
  if (errors.length > 0) {
    console.log('\n❌ 錯誤詳情 (前10筆):');
    errors.slice(0, 10).forEach(e => console.log(`  ${e.sku}: ${e.error}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });