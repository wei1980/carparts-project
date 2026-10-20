// scripts/export-air-filter-review.js
// 匯出空濾相關資料供人工審核：Excel 多工作表

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

const BASE = path.join('C:', 'Users', 'User', 'Dropbox', '公司資料', '車大師', '資料庫', '空濾');
const OUT_XLSX = path.join(BASE, 'air_filter_review_20260920_v2.xlsx');

async function main() {
  console.log('📊 讀取資料中...');
  
  // 1. 讀 aligned_import_new.csv
  const aligned = parseCSV(path.join(BASE, 'aligned_import_new.csv'));
  console.log(`  aligned_import: ${aligned.length} 列`);
  
  // 2. 讀 link_table_new.csv
  const links = parseCSV(path.join(BASE, 'link_table_new.csv'));
  console.log(`  link_table: ${links.length} 列`);
  
  // 3. 讀 review_queue_new.xlsx (失敗清單)
  const review = await parseXLSX(path.join(BASE, 'review_queue_new.xlsx'), '待審佇列');
  console.log(`  review_queue: ${review.length} 列`);
  
  // 4. 失敗品牌
  const failedMakes = [...new Set(review.filter(r => r.match_strategy === 'no_match' || r.match_strategy?.startsWith('review_')).map(r => r.source_make))];
  console.log('  失敗品牌:', failedMakes);
  
  // 5. 查 vehicle_variants: 失敗的品牌/車系
  const variants = await prisma.vehicleVariant.findMany({
    where: { make: { in: failedMakes }, is_approved: true },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true, year_end: true, specs: true },
    orderBy: [{ make: 'asc' }, { model: 'asc' }, { generation: 'asc' }, { year_start: 'asc' }],
  });
  console.log(`  vehicle_variants 相關筆數: ${variants.length}`);
  
  // 6. 查 parts (Pipercross/BMC/K&N 空濾) - 匯入的零件 subcategory_id 為 null
  const parts = await prisma.part.findMany({
    where: { 
      brand: { in: ['Pipercross', 'BMC', 'K&N'] },
      is_active: true,
    },
    select: { id: true, sku: true, name: true, brand: true, specs: true, msrp_price: true, wholesale_price: true, stock_qty: true },
  });
  console.log(`  空濾零件筆數: ${parts.length}`);
  
  // 7. 查 part_vehicle_compatibility (已匯入的關係)
  const compat = await prisma.partCompatibility.findMany({
    include: {
      part: { select: { id: true, sku: true, brand: true, name: true } },
      vehicle: { select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true, engine_code: true } },
    },
    orderBy: [{ part: { brand: 'asc' } }, { vehicle: { make: 'asc' } }],
  });
  console.log(`  已匯入相容關係: ${compat.length} 筆`);
  
  // 8. 產生 Excel
  const wb = new ExcelJS.Workbook();
  
  // Sheet 1: aligned_import (原始對齊資料)
  addSheet(wb, 'aligned_import', aligned, [
    'make', 'year', 'model', 'generation', 'engine', 'displacement', 'horsepower',
    'drive', 'transmission', 'doors_passengers', 'power', 'cylinders', 'compression',
    'bore', 'stroke', 'weight', 'wheel', 'front_tire', 'front_suspension',
    'rear_tire', 'rear_suspension', 'intake', 'torque', 'dimensions',
    'pipercross', 'bmc', 'kn', 'source_record_id'
  ]);
  
  // Sheet 2: link_table (比對連結)
  addSheet(wb, 'link_table', links, [
    'source_id', 'target_id', 'match_strategy', 'match_score',
    'source_make', 'source_model', 'source_generation', 'source_year_range',
    'target_make', 'target_model', 'target_generation', 'target_year'
  ]);
  
  // Sheet 3: vehicle_variants (資料庫車型 - 失敗品牌)
  addSheet(wb, 'db_variants_failed_makes', variants.map(v => ({
    id: v.id,
    make: v.make,
    model: v.model,
    generation: v.generation,
    engine_code: v.engine_code,
    year_start: v.year_start,
    year_end: v.year_end,
    displacement_cc: v.specs?.displacement_cc || '',
    horsepower_ps: v.specs?.horsepower_ps || '',
  })), ['id', 'make', 'model', 'generation', 'engine_code', 'year_start', 'year_end', 'displacement_cc', 'horsepower_ps']);
  
  // Sheet 4: parts (空濾零件)
  addSheet(wb, 'parts_air_filter', parts.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    msrp_price: p.msrp_price,
    wholesale_price: p.wholesale_price,
    stock_qty: p.stock_qty,
    specs: JSON.stringify(p.specs || {}),
  })), ['id', 'sku', 'name', 'brand', 'msrp_price', 'wholesale_price', 'stock_qty', 'specs']);
  
  // Sheet 5: compatibility (已匯入關係)
  addSheet(wb, 'compatibility_imported', compat.map(c => ({
    part_id: c.part_id,
    part_sku: c.part.sku,
    part_brand: c.part.brand,
    part_name: c.part.name,
    vehicle_id: c.vehicle_id,
    vehicle_make: c.vehicle.make,
    vehicle_model: c.vehicle.model,
    vehicle_generation: c.vehicle.generation,
    vehicle_year: `${c.vehicle.year_start}-${c.vehicle.year_end}`,
    vehicle_engine: c.vehicle.engine_code,
  })), ['part_id', 'part_sku', 'part_brand', 'part_name', 'vehicle_id', 'vehicle_make', 'vehicle_model', 'vehicle_generation', 'vehicle_year', 'vehicle_engine']);
  
  // Sheet 6: 失敗清單 (從 review_queue)
  const failed = review.filter(r => r.match_strategy === 'no_match' || r.match_strategy?.startsWith('review_'));
  addSheet(wb, 'failed_review_queue', failed, [
    'source_id', 'source_status', 'match_strategy', 'match_score',
    'source_make', 'source_model', 'source_generation', 'source_engine',
    'source_displacement', 'source_horsepower', 'source_year_range',
    'candidate_count', 'pipercross', 'bmc', 'kn', 'candidates'
  ]);
  
  // Sheet 7: 21 筆完全失敗 (no_match)
  const noMatch = review.filter(r => r.match_strategy === 'no_match');
  addSheet(wb, 'failed_21_no_match', noMatch, [
    'source_id', 'source_status', 'match_strategy', 'match_score',
    'source_make', 'source_model', 'source_generation', 'source_engine',
    'source_displacement', 'source_horsepower', 'source_year_range',
    'candidate_count', 'pipercross', 'bmc', 'kn', 'candidates'
  ]);
  
  // 設定欄寬、凍結、篩選
  wb.eachSheet(ws => {
    ws.columns.forEach(col => {
      if (col.header) col.width = Math.min(Math.max(col.header.length + 2, 15), 50);
    });
    ws.views = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  });
  
  await wb.xlsx.writeFile(OUT_XLSX);
  console.log(`\n✅ 已輸出: ${OUT_XLSX}`);
  
  await prisma.$disconnect();
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ 檔案不存在: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanContent = content.replace(/^\uFEFF/, '');
  const lines = cleanContent.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    values.push(current.trim());
    const row = {};
    header.forEach((h, idx) => row[h] = values[idx] || '');
    rows.push(row);
  }
  return rows;
}

async function parseXLSX(filePath, sheetName) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️ 檔案不存在: ${filePath}`);
    return [];
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fs.readFileSync(filePath));
  const ws = wb.getWorksheet(sheetName) || wb.worksheets[0];
  const rows = [];
  const header = [];
  ws.getRow(1).eachCell((cell, colNumber) => { header[colNumber - 1] = cell.value; });
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    row.eachCell((cell, colNumber) => { obj[header[colNumber - 1]] = cell.value; });
    rows.push(obj);
  });
  return rows;
}

function addSheet(wb, name, data, columns) {
  const ws = wb.addWorksheet(name);
  ws.addRow(columns);
  for (const row of data) {
    ws.addRow(columns.map(c => row[c] ?? ''));
  }
  return ws;
}

main().catch(async e => {
  console.error('❌ 失敗:', e);
  await prisma.$disconnect();
  process.exit(1);
});