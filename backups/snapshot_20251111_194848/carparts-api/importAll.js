const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();
const logFile = './error.log';

// Summary 統計
let summary = {
  makes: { success: 0 },
  vehicles: { success: 0, skipped: 0 },
  fitments: { success: 0, skipped: 0 },
};

// 簡單記錄器
function logWarning(msg) {
  console.warn(msg);
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
}

//
// 匯入車型 (data/Vehicles.xlsx)
//
async function importVehicles() {
  const workbook = XLSX.readFile('./data/Vehicles.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    if (!row.make || !row.series || !row.variant_name) {
      logWarning("⚠️ [Vehicles] 缺少必要欄位 (make/series/variant_name)，跳過一筆");
      summary.vehicles.skipped++;
      continue;
    }

    // 建立或取得車廠
    const make = await prisma.makes.upsert({
      where: { name: row.make },
      update: {},
      create: { name: row.make },
    });
    summary.makes.success++;

    // 建立或取得車系
    const model = await prisma.models.upsert({
      where: {
        make_id_name: {
          make_id: make.id,
          name: row.series,
        },
      },
      update: {},
      create: {
        make_id: make.id,
        name: row.series,
      },
    });

    // 建立或取得世代
    let generation = null;
    if (row.generation) {
      generation = await prisma.generations.upsert({
        where: {
          model_id_name: {
            model_id: model.id,
            name: row.generation,
          },
        },
        update: {
          year_from: row.year_from,
          year_to: row.year_to,
        },
        create: {
          model_id: model.id,
          name: row.generation,
          year_from: row.year_from,
          year_to: row.year_to,
        },
      });
    }

    // 建立或更新車型
    await prisma.vehicle_variants.upsert({
      where: row.vehicle_variant_id
        ? { id: row.vehicle_variant_id }
        : {
            model_id_engine_code_year_from_year_to_variant_name: {
              model_id: model.id,
              engine_code: row.engine_code || null,
              year_from: row.year_from,
              year_to: row.year_to,
              variant_name: row.variant_name,
            },
          },
      update: {
        generation_id: generation ? generation.id : null,
        displacement_cc: row.displacement_cc || null,
        drive_type: row.drive_type,
        fuel_type: row.fuel_type,
      },
      create: {
        model_id: model.id,
        generation_id: generation ? generation.id : null,
        variant_name: row.variant_name,
        year_from: row.year_from,
        year_to: row.year_to,
        engine_code: row.engine_code || null,
        displacement_cc: row.displacement_cc || null,
        drive_type: row.drive_type,
        fuel_type: row.fuel_type,
      },
    });

    summary.vehicles.success++;
  }

  console.log('✅ Vehicles 匯入完成');
}

//
// 匯入零件配對 (data/Fitment.xlsx)
//
async function importFitments() {
  const workbook = XLSX.readFile('./data/Fitment.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    if (!row.part_sku || !row.make || !row.series || !row.variant_name) {
      logWarning("⚠️ [Fitments] 缺少必要欄位 (part_sku/make/series/variant_name)，跳過一筆");
      summary.fitments.skipped++;
      continue;
    }

    // 確認零件存在
    const part = await prisma.parts.findUnique({
      where: { sku: row.part_sku },
    });
    if (!part) {
      logWarning(`⚠️ [Fitments] 找不到零件 SKU: ${row.part_sku}`);
      summary.fitments.skipped++;
      continue;
    }

    // 找車廠
    const make = await prisma.makes.findUnique({
      where: { name: row.make },
    });
    if (!make) {
      logWarning(`⚠️ [Fitments] 找不到廠牌: ${row.make}`);
      summary.fitments.skipped++;
      continue;
    }

    // 找車系
    const model = await prisma.models.findFirst({
      where: { make_id: make.id, name: row.series },
    });
    if (!model) {
      logWarning(`⚠️ [Fitments] 找不到車系: ${row.series}`);
      summary.fitments.skipped++;
      continue;
    }

    // 找車型
    const vehicle = await prisma.vehicle_variants.findFirst({
      where: {
        model_id: model.id,
        variant_name: row.variant_name,
        year_from: row.year_from,
        year_to: row.year_to,
        engine_code: row.engine_code || undefined,
      },
    });
    if (!vehicle) {
      logWarning(`⚠️ [Fitments] 找不到車型: ${row.make} ${row.series} ${row.variant_name}`);
      summary.fitments.skipped++;
      continue;
    }

    // 建立配對
    await prisma.part_compatibilities.upsert({
      where: {
        part_id_vehicle_variant_id: {
          part_id: part.id,
          vehicle_variant_id: vehicle.id,
        },
      },
      update: {
        note: row.note || null,
      },
      create: {
        part_id: part.id,
        vehicle_variant_id: vehicle.id,
        note: row.note || null,
      },
    });

    summary.fitments.success++;
  }

  console.log('✅ Fitments 匯入完成');
}

//
// 主程式
//
async function main() {
  try {
    fs.writeFileSync(logFile, ''); // 清空 log
    await importVehicles();
    await importFitments();

    console.log('\n🎉 匯入完成 Summary:');
    console.log(`  🏭 Makes:     新增 ${summary.makes.success} 筆`);
    console.log(`  🚗 Vehicles:  成功 ${summary.vehicles.success} 筆，跳過 ${summary.vehicles.skipped} 筆`);
    console.log(`  🔧 Fitments:  成功 ${summary.fitments.success} 筆，跳過 ${summary.fitments.skipped} 筆`);
    console.log('📄 錯誤與 Summary 詳情請查看 error.log');
  } catch (e) {
    console.error('❌ 匯入失敗:', e);
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ❌ 匯入失敗: ${e.message}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
