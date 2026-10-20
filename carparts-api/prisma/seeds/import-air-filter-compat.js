// prisma/seeds/import-air-filter-compat.js
// 匯入空濾相容表：讀 aligned_import_new.csv → 比對 vehicle_variants → 寫入 part_vehicle_compatibility

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ===== 路徑設定 =====
const BASE = path.join('C:', 'Users', 'User', 'Dropbox', '公司資料', '車大師', '資料庫', '空濾');
const ALIGNED_CSV = path.join(BASE, 'aligned_import_new.csv');

// ===== 工具函數 =====
function parseCSV(filePath) {
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
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    const row = {};
    header.forEach((h, idx) => row[h] = values[idx] || '');
    rows.push(row);
  }
  return rows;
}

function cleanSku(sku) {
  if (!sku) return null;
  const s = sku.trim();
  return s ? s : null;
}

// 依車輛屬性查找 vehicle_variants
async function findVehicleVariant(attrs) {
  const { make, model, generation, engine, year } = attrs;
  const yr = parseInt(year);
  if (isNaN(yr)) return null;

  return await prisma.vehicleVariant.findFirst({
    where: {
      make: { equals: make, mode: 'insensitive' },
      model: { equals: model, mode: 'insensitive' },
      generation: { equals: generation, mode: 'insensitive' },
      engine_code: { equals: engine, mode: 'insensitive' },
      year_start: { lte: yr },
      year_end: { gte: yr },
      is_approved: true,
    },
    select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true, engine_code: true },
  });
}

// ===== 主流程 =====
async function main() {
  console.log('📥 讀取 aligned_import_new.csv...');
  const aligned = parseCSV(ALIGNED_CSV);
  console.log(`   讀取 ${aligned.length} 筆對齊記錄`);

  // 去重：同一組 (make, model, generation, engine, year) 只處理一次
  const vehicleKeyMap = new Map();
  for (const row of aligned) {
    const key = `${row.make}|${row.model}|${row.generation}|${row.engine}|${row.year}`;
    if (!vehicleKeyMap.has(key)) {
      vehicleKeyMap.set(key, {
        make: row.make,
        model: row.model,
        generation: row.generation,
        engine: row.engine,
        year: row.year,
        pipercross: cleanSku(row.pipercross),
        bmc: cleanSku(row.bmc),
        kn: cleanSku(row.kn),
      });
    }
  }
  console.log(`   去重後 ${vehicleKeyMap.size} 組唯一車型`);

  // 統計
  let createdParts = 0;
  let createdCompat = 0;
  let skippedCompat = 0;
  let matchedVehicles = 0;
  let unmatchedVehicles = 0;
  let errors = [];

  // 逐筆處理
  for (const [key, vehicleAttrs] of vehicleKeyMap) {
    // 1. 查找對應的 vehicle_variants
    const vehicle = await findVehicleVariant(vehicleAttrs);
    if (!vehicle) {
      unmatchedVehicles++;
      errors.push(`車型不存在: ${key}`);
      continue;
    }
    matchedVehicles++;

    // 2. 三個品牌 - 一車一廠牌：優先序 K&N > BMC > Pipercross
    const brandPriority = ['K&N', 'BMC', 'Pipercross'];
    const skuMap = {
      'K&N': vehicleAttrs.kn,
      'BMC': vehicleAttrs.bmc,
      'Pipercross': vehicleAttrs.pipercross,
    };

    // 找出第一個有 SKU 的品牌
    let selectedBrand = null;
    let selectedSku = null;
    for (const brand of brandPriority) {
      if (skuMap[brand]) {
        selectedBrand = brand;
        selectedSku = skuMap[brand];
        break;
      }
    }

    if (!selectedBrand || !selectedSku) continue;

    // 3. 找或建立 Part
    let part = await prisma.part.findUnique({ where: { sku: selectedSku } });
    if (!part) {
      part = await prisma.part.create({
        data: {
          sku: selectedSku,
          name: `${selectedBrand} 高流量空濾 ${selectedSku}`,
          brand: selectedBrand,
          subcategory_id: await getOrCreateSubcategoryId('濾芯'),
          is_active: true,
          is_universal: false,
          specs: { filter_type: 'high_flow', brand: selectedBrand },
        },
      });
      createdParts++;
      console.log(`   ✅ 新增零件: ${selectedBrand} ${selectedSku} (id=${part.id})`);
    }

    // 建立相容關係
    const existing = await prisma.partCompatibility.findUnique({
      where: { part_id_vehicle_id: { part_id: part.id, vehicle_id: vehicle.id } },
    });

    if (existing) {
      skippedCompat++;
    } else {
      await prisma.partCompatibility.create({
        data: { part_id: part.id, vehicle_id: vehicle.id },
      });
      createdCompat++;
      console.log(`   🔗 相容: ${selectedBrand} ${selectedSku} → ${vehicle.make} ${vehicle.model} ${vehicle.generation} (${vehicle.year_start}-${vehicle.year_end})`);
    }
  }

  console.log('\n=== 匯入完成 ===');
  console.log(`匹配車型: ${matchedVehicles}`);
  console.log(`未匹配車型: ${unmatchedVehicles}`);
  console.log(`新增零件: ${createdParts}`);
  console.log(`新增相容關係: ${createdCompat}`);
  console.log(`略過(已存在): ${skippedCompat}`);
  console.log(`錯誤: ${errors.length}`);
  if (errors.length) {
    console.log('\n前 20 個錯誤:');
    errors.slice(0, 20).forEach(e => console.log('  -', e));
  }

  await prisma.$disconnect();
}

// 取得或建立子分類 ID
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