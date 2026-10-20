#!/usr/bin/env node
/**
 * Import air filter vehicle compatibility from aligned_import_v11.csv
 * Creates Part records and PartCompatibility links
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Subcategory ID for 濾芯 (filter element) under 進氣 category
const AIR_FILTER_SUBCATEGORY_ID = 1;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function importAirFilters() {
  const csvPath = 'C:/Users/User/Dropbox/公司資料/車大師/資料庫/空濾/aligned_import_v11.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const header = parseCSVLine(lines[0]);
  
  console.log('CSV columns:', header.length);
  console.log('Total rows:', lines.length - 1);

  // Column indices
  const idx = {
    make: header.indexOf('make'),
    year: header.indexOf('year'),
    model: header.indexOf('model'),
    generation: header.indexOf('generation'),
    engine: header.indexOf('engine'),
    displacement: header.indexOf('displacement'),
    horsepower: header.indexOf('horsepower'),
    pipercross: header.indexOf('pipercross'),
    bmc: header.indexOf('bmc'),
    kn: header.indexOf('kn'),
    source_record_id: header.indexOf('source_record_id'),
    match_strategy: header.indexOf('match_strategy'),
  };

  console.log('Column indices:', idx);

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

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < header.length) continue;

    const make = row[idx.make]?.trim();
    const year = parseInt(row[idx.year]?.trim()) || null;
    const model = row[idx.model]?.trim();
    const generation = row[idx.generation]?.trim();
    const engine = row[idx.engine]?.trim();
    
    const pipercross = row[idx.pipercross]?.trim();
    const bmc = row[idx.bmc]?.trim();
    const kn = row[idx.kn]?.trim();
    
    if (!make || !model || !year) {
      stats.errors++;
      continue;
    }

    stats.processed++;

    // Find matching VehicleVariant
    // Match by make, model, generation, engine_code, and year range
    let vehicle = await prisma.vehicleVariant.findFirst({
      where: {
        make: make,
        model: model,
        generation: generation,
        engine_code: engine,
        year_start: { lte: year },
        year_end: { gte: year },
      },
    });

    // Fallback: try without exact engine match
    if (!vehicle) {
      vehicle = await prisma.vehicleVariant.findFirst({
        where: {
          make: make,
          model: model,
          generation: generation,
          year_start: { lte: year },
          year_end: { gte: year },
        },
      });
    }

    // Fallback: try model + generation only
    if (!vehicle) {
      vehicle = await prisma.vehicleVariant.findFirst({
        where: {
          make: make,
          model: model,
          generation: generation,
        },
      });
    }

    // Fallback: try model only
    if (!vehicle) {
      vehicle = await prisma.vehicleVariant.findFirst({
        where: {
          make: make,
          model: model,
        },
      });
    }

    if (!vehicle) {
      stats.vehiclesNotFound++;
      notFoundVehicles.push({ make, model, generation, engine, year, source_row: i });
      if (stats.vehiclesNotFound <= 20) {
        console.log(`  ⚠️ Vehicle not found: ${make} ${model} ${generation} ${engine} ${year}`);
      }
      continue;
    }

    stats.vehiclesFound++;

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
        // Create new part
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
        console.log(`  ✅ Created part: ${sku} (${brand})`);
      } else {
        stats.partsExisting++;
      }

      // Create PartCompatibility link
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

    // Progress
    if (stats.processed % 100 === 0) {
      console.log(`Progress: ${stats.processed} rows processed...`);
    }
  }

  console.log('\n========== IMPORT SUMMARY ==========');
  console.log(`Rows processed: ${stats.processed}`);
  console.log(`Vehicles found: ${stats.vehiclesFound}`);
  console.log(`Vehicles not found: ${stats.vehiclesNotFound}`);
  console.log(`Parts created: ${stats.partsCreated}`);
  console.log(`Parts already existed: ${stats.partsExisting}`);
  console.log(`Compatibilities created: ${stats.compatCreated}`);
  console.log(`Compatibilities already existed: ${stats.compatExisting}`);
  console.log(`Errors: ${stats.errors}`);

  if (notFoundVehicles.length > 0) {
    console.log('\n========== VEHICLES NOT FOUND (first 50) ==========');
    notFoundVehicles.slice(0, 50).forEach(v => {
      console.log(`  ${v.make} | ${v.model} | Gen:${v.generation} | Engine:${v.engine} | Year:${v.year}`);
    });
    
    // Save not found to file
    const outputPath = 'C:/Users/User/Dropbox/公司資料/車大師/資料庫/空濾/import_not_found.json';
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