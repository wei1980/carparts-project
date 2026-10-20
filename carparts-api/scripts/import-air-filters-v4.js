#!/usr/bin/env node
/**
 * Import air filter vehicle compatibility from normalized Excel
 * Matches at model+generation level (any year), links to ALL matching vehicle variants
 */

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const AIR_FILTER_SUBCATEGORY_ID = 1;

async function importAirFilters() {
  const excelPath = 'C:/Users/User/Dropbox/公司資料/車大師/資料庫/空濾/空濾車型關係表_20260921_normalized.xlsx';
  
  console.log('Loading normalized Excel...');
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['空濾車型關係表_正規化'];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  console.log(`Total rows: ${rows.length}`);

  // Pre-load all vehicle variants grouped by make+model+generation
  console.log('Loading all vehicle variants...');
  const allVehicles = await prisma.vehicleVariant.findMany({
    select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true, year_end: true }
  });
  console.log(`Loaded ${allVehicles.length} vehicle variants`);

  // Group by make+model+generation for fast lookup
  const vehicleGroups = new Map();
  for (const v of allVehicles) {
    const key = `${v.make}|${v.model}|${v.generation}`;
    if (!vehicleGroups.has(key)) vehicleGroups.set(key, []);
    vehicleGroups.get(key).push(v);
  }
  console.log(`Created ${vehicleGroups.size} model+generation groups`);

  let stats = {
    processed: 0,
    vehiclesFound: 0,
    vehiclesNotFound: 0,
    partsCreated: 0,
    partsExisting: 0,
    compatCreated: 0,
    compatExisting: 0,
    errors: 0,
  };

  const notFoundVehicles = [];

  for (const row of rows) {
    const make = row['Makes']?.toString().trim();
    const model = row['Norm_Model']?.toString().trim() || row['Model']?.toString().trim();
    const generation = row['Norm_Generation']?.toString().trim() || row['Generation']?.toString().trim();
    
    const pipercross = row['Pipercross']?.toString().trim();
    const bmc = row['BMC']?.toString().trim();
    const kn = row['KN']?.toString().trim();
    
    if (!make || !model) {
      stats.errors++;
      continue;
    }

    stats.processed++;

    // Find matching vehicle group by make + model (prefix) + generation
    const matchingGroups = [];
    for (const [key, vehicles] of vehicleGroups.entries()) {
      const [vMake, vModel, vGen] = key.split('|');
      if (vMake !== make) continue;
      // Model prefix match: Excel base model matches DB trim model
      if (!vModel.startsWith(model) && !model.startsWith(vModel)) continue;
      // Generation match (if specified)
      if (generation && vGen !== generation) continue;
      matchingGroups.push(vehicles);
    }

    const matchingVehicles = matchingGroups.flat();

    if (matchingVehicles.length === 0) {
      stats.vehiclesNotFound++;
      notFoundVehicles.push({ make, model, generation });
      if (stats.vehiclesNotFound <= 20) {
        console.log(`  ⚠️ No matching vehicles: ${make} ${model} ${generation}`);
      }
      continue;
    }

    stats.vehiclesFound += matchingVehicles.length;

    // Process each brand's part number
    const brands = [
      { sku: pipercross, brand: 'Pipercross', namePrefix: 'Pipercross 高流量空濾' },
      { sku: bmc, brand: 'BMC', namePrefix: 'BMC 高流量空濾' },
      { sku: kn, brand: 'KN', namePrefix: 'KN 高流量空濾' },
    ];

    for (const { sku, brand, namePrefix } of brands) {
      if (!sku) continue;

      // Find or create Part
      let part = await prisma.part.findUnique({ where: { sku } });
      
      if (!part) {
        part = await prisma.part.create({
          data: {
            sku,
            name: `${namePrefix} ${sku}`,
            brand,
            subcategory_id: AIR_FILTER_SUBCATEGORY_ID,
            category: '進氣',
            is_active: true,
            msrp_price: 0,
            wholesale_price: 0,
            stock_qty: 0,
            specs: {
              type: 'air_filter',
              brand,
              application: 'replacement',
            },
          },
        });
        stats.partsCreated++;
      } else {
        stats.partsExisting++;
      }

      // Create PartCompatibility for ALL matching vehicles
      for (const vehicle of matchingVehicles) {
        const existingCompat = await prisma.partCompatibility.findUnique({
          where: {
            part_id_vehicle_id: {
              part_id: part.id,
              vehicle_id: vehicle.id,
            },
          },
        });

        if (!existingCompat) {
          await prisma.partCompatibility.create({
            data: {
              part_id: part.id,
              vehicle_id: vehicle.id,
            },
          });
          stats.compatCreated++;
        } else {
          stats.compatExisting++;
        }
      }
    }

    if (stats.processed % 100 === 0) {
      console.log(`Progress: ${stats.processed} rows, ${stats.vehiclesFound} vehicles matched...`);
    }
  }

  console.log('\n========== IMPORT SUMMARY ==========');
  console.log(`Rows processed: ${stats.processed}`);
  console.log(`Vehicle variants matched: ${stats.vehiclesFound}`);
  console.log(`Rows not matched: ${stats.vehiclesNotFound}`);
  console.log(`Parts created: ${stats.partsCreated}`);
  console.log(`Parts already existed: ${stats.partsExisting}`);
  console.log(`Compatibilities created: ${stats.compatCreated}`);
  console.log(`Compatibilities already existed: ${stats.compatExisting}`);
  console.log(`Errors: ${stats.errors}`);

  if (notFoundVehicles.length > 0) {
    console.log('\n========== ROWS NOT MATCHED (first 30) ==========');
    notFoundVehicles.slice(0, 30).forEach(v => {
      console.log(`  ${v.make} | ${v.model} | Gen:${v.generation}`);
    });
    
    const fs = require('fs');
    const outputPath = 'C:/Users/User/Dropbox/公司資料/車大師/資料庫/空濾/import_not_found_v4.json';
    fs.writeFileSync(outputPath, JSON.stringify(notFoundVehicles, null, 2));
    console.log(`\nFull not-found list saved to: ${outputPath}`);
  }

  await prisma.$disconnect();
}

importAirFilters().catch(async (e) => {
  console.error('Import failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});