// scripts/import-fixed-air-filter-skus.js
// 讀取修正後的 Excel → 建立 Part → 建立 Compatibility

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

const BASE = path.join('C:', 'Users', 'User', 'Dropbox', '公司資料', '車大師', '資料庫', '空濾');
const INPUT_XLSX = path.join(BASE, 'air_filter_parts_for_failed_makes.xlsx');
const SHEET_NAME = 'variant_no_sku_fixed';  // 修正後的工作表名

async function main() {
  if (!fs.existsSync(INPUT_XLSX)) {
    console.error(`❌ 找不到檔案: ${INPUT_XLSX}`);
    process.exit(1);
  }

  console.log(`📖 讀取 ${INPUT_XLSX} [${SHEET_NAME}]...`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(INPUT_XLSX));
  const ws = wb.getWorksheet(SHEET_NAME);
  
  if (!ws) {
    console.error(`❌ 找不到工作表: ${SHEET_NAME}`);
    console.log('可用工作表:', wb.worksheets.map(w => w.name));
    process.exit(1);
  }

  // 讀取標題列
  const header = [];
  ws.getRow(1).eachCell((cell, colNumber) => { header[colNumber - 1] = String(cell.value).trim(); });
  console.log('欄位:', header);

  // 必要欄位檢查
  const required = ['vehicle_id', 'brand', 'sku'];
  for (const col of required) {
    if (!header.includes(col)) {
      console.error(`❌ 缺少必要欄位: ${col}`);
      process.exit(1);
    }
  }

  // 讀取資料列
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    row.eachCell((cell, colNumber) => { obj[header[colNumber - 1]] = cell.value; });
    // 只處理有 brand 和 sku 的列
    if (obj.brand && obj.sku) rows.push(obj);
  });
  console.log(`  讀取 ${rows.length} 筆有效修正資料`);

  if (rows.length === 0) {
    console.log('⚠️ 無有效資料，結束');
    return;
  }

  // 統計
  let createdParts = 0;
  let createdCompat = 0;
  let skippedCompat = 0;
  let errors = [];

  // 逐筆處理
  for (const row of rows) {
    const vehicleId = parseInt(row.vehicle_id);
    const brand = String(row.brand).trim();
    const sku = String(row.sku).trim();

    if (!vehicleId || !brand || !sku) {
      errors.push(`缺少必要欄位: ${JSON.stringify(row)}`);
      continue;
    }

    // 1. 檢查 vehicle 存在
    const vehicle = await prisma.vehicleVariant.findUnique({
      where: { id: vehicleId },
      select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true },
    });
    if (!vehicle) {
      errors.push(`vehicle_id ${vehicleId} 不存在`);
      continue;
    }

    // 2. 找或建立 Part
    let part = await prisma.part.findUnique({ where: { sku } });
    if (!part) {
      part = await prisma.part.create({
        data: {
          sku,
          name: `${brand} 高流量空濾 ${sku}`,
          brand,
          subcategory_id: await getOrCreateSubcategoryId('濾芯'),
          is_active: true,
          is_universal: false,
          specs: { filter_type: 'high_flow', brand, source: 'manual_fix' },
        },
      });
      createdParts++;
      console.log(`  ✅ 新增零件: ${brand} ${sku} (id=${part.id})`);
    }

    // 3. 建立 Compatibility
    const existing = await prisma.partCompatibility.findUnique({
      where: { part_id_vehicle_id: { part_id: part.id, vehicle_id: vehicleId } },
    });

    if (existing) {
      skippedCompat++;
    } else {
      await prisma.partCompatibility.create({
        data: { part_id: part.id, vehicle_id: vehicleId },
      });
      createdCompat++;
      console.log(`  🔗 相容: ${brand} ${sku} → ${vehicle.make} ${vehicle.model} ${vehicle.generation} (${vehicle.year_start}-${vehicle.year_end})`);
    }
  }

  console.log('\n=== 匯入完成 ===');
  console.log(`新增零件: ${createdParts}`);
  console.log(`新增相容關係: ${createdCompat}`);
  console.log(`略過(已存在): ${skippedCompat}`);
  console.log(`錯誤: ${errors.length}`);
  if (errors.length) {
    console.log('\n錯誤明細:');
    errors.forEach(e => console.log('  -', e));
  }

  await prisma.$disconnect();
}

async function getOrCreateSubcategoryId(name) {
  let sub = await prisma.subcategories.findFirst({ where: { name } });
  if (!sub) {
    let cat = await prisma.categories.findFirst({ where: { name: '進氣' } });
    if (!cat) {
      cat = await prisma.categories.create({ data: { name: '進氣', slug: 'intake', is_nav: true } });
    }
    sub = await prisma.subcategories.create({
      data: { name, category_id: cat.id, is_active: true },
    });
  }
  return sub.id;
}

main().catch(async e => {
  console.error('❌ 匯入失敗:', e);
  await prisma.$disconnect();
  process.exit(1);
});