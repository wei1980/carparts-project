const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function importVehicles() {
  const workbook = XLSX.readFile('Vehicles.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    await prisma.vehicle_variants.upsert({
      where: { id: row.vehicle_variant_id },
      update: {
        model_id: 1, // ⚠️ 這裡暫時先寫死，需要和 models 表對應
        generation_id: null,
        variant_name: row.variant_name,
        year_from: row.year_from,
        year_to: row.year_to,
        engine_code: row.engine_code,
        displacement_cc: row.displacement_cc || null,
        drive_type: row.drive_type,
        fuel_type: row.fuel_type,
      },
      create: {
        id: row.vehicle_variant_id,
        model_id: 1,
        generation_id: null,
        variant_name: row.variant_name,
        year_from: row.year_from,
        year_to: row.year_to,
        engine_code: row.engine_code,
        displacement_cc: row.displacement_cc || null,
        drive_type: row.drive_type,
        fuel_type: row.fuel_type,
      },
    });
  }

  console.log('✅ Vehicles 匯入完成');
}

async function importFitments() {
  const workbook = XLSX.readFile('Fitment.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    const part = await prisma.parts.findUnique({
      where: { sku: row.part_sku },
    });

    if (!part) {
      console.warn(`⚠️ 找不到零件 SKU: ${row.part_sku}`);
      continue;
    }

    await prisma.part_compatibilities.upsert({
      where: {
        part_id_vehicle_variant_id: {
          part_id: part.id,
          vehicle_variant_id: row.vehicle_variant_id,
        },
      },
      update: {
        note: row.note || null,
      },
      create: {
        part_id: part.id,
        vehicle_variant_id: row.vehicle_variant_id,
        note: row.note || null,
      },
    });
  }

  console.log('✅ Fitments 匯入完成');
}

async function main() {
  try {
    await importVehicles();
    await importFitments();
  } catch (e) {
    console.error('❌ 匯入失敗:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
