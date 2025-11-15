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

    // 找 model
    const model = await prisma.models.findFirst({
      where: { make_id: make.id, name: row.series },
    });
    if (!model) {
      logWarning(`⚠️ [Fitments] 找不到車系: ${row.series}`);
      summary.fitments.skipped++;
      continue;
    }

    // 找車型 (vehicle_variant)
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
