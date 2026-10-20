// scripts/export-air-filter-parts-for-failed-makes.js
// 產生：13,085 筆失敗品牌車型對應的空濾料號表（用屬性比對）

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

const BASE = path.join('C:', 'Users', 'User', 'Dropbox', '公司資料', '車大師', '資料庫', '空濾');
const OUT_XLSX = path.join(BASE, 'air_filter_parts_for_failed_makes.xlsx');

async function main() {
  console.log('📊 讀取資料...');
  
  // 1. 讀 aligned_import_new.csv (這裡有 target 車屬性 + SKUs)
  const aligned = parseCSV(path.join(BASE, 'aligned_import_new.csv'));
  console.log(`  aligned_import: ${aligned.length} 列`);
  
  // 2. 失敗品牌
  const failedMakes = [
    'Alfa Romeo', 'Audi', 'BMW', 'Dodge', 'Ford', 'Honda', 'Hyundai',
    'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Mazda',
    'Mercedes-Benz', 'Mini (BMW)', 'Mitsubishi', 'Nissan', 'Peugeot',
    'Porsche', 'Ram', 'Rover', 'Saab', 'Skoda', 'Smart', 'Subaru',
    'Suzuki', 'Toyota', 'Volkswagen', 'Volvo'
  ];
  
  // 3. 查這 28 個品牌的所有 vehicle_variants，建立查找鍵
  const variants = await prisma.vehicleVariant.findMany({
    where: { make: { in: failedMakes }, is_approved: true },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true, year_end: true, specs: true },
  });
  console.log(`  目標車型: ${variants.length} 筆`);
  
  // 建立查找 map：key = make|model|generation|engine_code|year
  const variantMap = new Map();
  for (const v of variants) {
    for (let yr = v.year_start; yr <= v.year_end; yr++) {
      const key = `${v.make}|${v.model}|${v.generation}|${v.engine_code}|${yr}`;
      if (!variantMap.has(key)) variantMap.set(key, []);
      variantMap.get(key).push(v);
    }
  }
  console.log(`  查找鍵: ${variantMap.size} 組`);
  
  // 4. 對齊 aligned_import 的每一列
  const outputRows = [];
  const matchedVariantIds = new Set();
  
  for (const row of aligned) {
    const make = row.make?.trim();
    const model = row.model?.trim();
    const generation = row.generation?.trim();
    const engine = row.engine?.trim();
    const year = parseInt(row.year?.trim());
    if (!make || !model || !generation || !engine || isNaN(year)) continue;
    
    const key = `${make}|${model}|${generation}|${engine}|${year}`;
    const matchedVariants = variantMap.get(key);
    
    if (!matchedVariants || matchedVariants.length === 0) continue;
    
    // SKUs
    const skus = [
      { brand: 'Pipercross', sku: row.pipercross?.trim() },
      { brand: 'BMC', sku: row.bmc?.trim() },
      { brand: 'K&N', sku: row.kn?.trim() },
    ].filter(s => s.sku);
    
    for (const v of matchedVariants) {
      for (const s of skus) {
        outputRows.push({
          vehicle_id: v.id,
          make: v.make,
          model: v.model,
          generation: v.generation,
          engine_code: v.engine_code,
          year_range: `${v.year_start}-${v.year_end}`,
          displacement_cc: v.specs?.displacement_cc || '',
          horsepower_ps: v.specs?.horsepower_ps || '',
          brand: s.brand,
          sku: s.sku,
          source_record_id: row.source_record_id,
          aligned_year: year,
        });
        matchedVariantIds.add(v.id);
      }
    }
  }
  
  console.log(`  產生對應列: ${outputRows.length}`);
  console.log(`  匹配到的車型: ${matchedVariantIds.size} 筆`);
  
  // 5. 無對應 SKU 的車型
  const variantsWithoutSkus = variants.filter(v => !matchedVariantIds.has(v.id));
  console.log(`  無對應 SKU: ${variantsWithoutSkus.length} 筆`);
  
  // 6. SKU 彙總
  const skuToVariants = new Map();
  for (const row of outputRows) {
    const key = `${row.brand}|${row.sku}`;
    if (!skuToVariants.has(key)) skuToVariants.set(key, { brand: row.brand, sku: row.sku, variants: [], variantKeys: new Set() });
    const entry = skuToVariants.get(key);
    const variantKey = `${row.vehicle_id}|${row.make}|${row.model}|${row.generation}|${row.year_range}`;
    if (!entry.variantKeys.has(variantKey)) {
      entry.variantKeys.add(variantKey);
      entry.variants.push({
        vehicle_id: row.vehicle_id,
        make: row.make,
        model: row.model,
        generation: row.generation,
        year_range: row.year_range,
      });
    }
  }
  
  const skuSummary = [];
  for (const [, data] of skuToVariants) {
    skuSummary.push({
      brand: data.brand,
      sku: data.sku,
      variant_count: data.variants.length,
      variants: data.variants.map(v => `${v.make} ${v.model} ${v.generation} (${v.year_range})`).join('; '),
    });
  }
  
  // 7. 寫 Excel
  const wb = new ExcelJS.Workbook();
  
  // Sheet 1: 車型 x SKU 明細
  addSheet(wb, 'variant_sku_mapping', outputRows, [
    'vehicle_id', 'make', 'model', 'generation', 'engine_code', 'year_range',
    'displacement_cc', 'horsepower_ps', 'brand', 'sku', 'source_record_id', 'aligned_year'
  ]);
  
  // Sheet 2: 無對應 SKU 的車型
  addSheet(wb, 'variant_no_sku', variantsWithoutSkus.map(v => ({
    vehicle_id: v.id,
    make: v.make,
    model: v.model,
    generation: v.generation,
    engine_code: v.engine_code,
    year_range: `${v.year_start}-${v.year_end}`,
    displacement_cc: v.specs?.displacement_cc || '',
    horsepower_ps: v.specs?.horsepower_ps || '',
  })), ['vehicle_id', 'make', 'model', 'generation', 'engine_code', 'year_range', 'displacement_cc', 'horsepower_ps']);
  
  // Sheet 3: SKU 彙總
  addSheet(wb, 'sku_summary', skuSummary, ['brand', 'sku', 'variant_count', 'variants']);
  
  // 設定格式
  wb.eachSheet(ws => {
    ws.columns.forEach(col => {
      if (col.header) col.width = Math.min(Math.max(col.header.length + 2, 15), 80);
    });
    ws.views = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  });
  
  await wb.xlsx.writeFile(OUT_XLSX);
  console.log(`\n✅ 已輸出: ${OUT_XLSX}`);
  
  await prisma.$disconnect();
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
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