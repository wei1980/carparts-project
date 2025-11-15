const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 品牌
  const audi = await prisma.makes.upsert({
    where: { name: 'Audi' },
    update: {},
    create: { name: 'Audi', country: 'Germany' },
  });

  // 車系
  const a4 = await prisma.models.upsert({
    where: { make_id_name: { make_id: audi.id, name: 'A4' } }, // 依你 @@unique([make_id, name])
    update: {},
    create: { name: 'A4', make_id: audi.id },
  });

  // 世代
  const b9 = await prisma.generations.create({
    data: { model_id: a4.id, name: 'B9', year_from: 2016, year_to: 2023 },
  });

  // 車型 (variant)
  const a4_20tfsi = await prisma.vehicle_variants.create({
    data: {
      model_id: a4.id,
      generation_id: b9.id,
      variant_name: 'A4 2.0 TFSI',
      year_from: 2016, year_to: 2019,
      fuel_type: 'Petrol',
      engine_code: 'DNUE',
      displacement_cc: 1984,
      power_ps: 190
    }
  });

  // 零件
  const part = await prisma.parts.upsert({
    where: { sku: 'PF-A4-001' },
    update: {},
    create: {
      sku: 'PF-A4-001',
      name: 'Powerflex Front Wishbone Bush',
      category: 'Suspension',
      brand: 'Powerflex',
      price_twd: '3200.00',
      description: 'A4 B9 前下叉臂膠套',
      image_url: '/images/pf-a4-001.webp',
      stock_qty: 10
    }
  });

  // 綁定零件 ↔ 車型
  await prisma.part_compatibilities.upsert({
    where: { part_id_vehicle_variant_id: { part_id: part.id, vehicle_variant_id: a4_20tfsi.id } },
    update: {},
    create: { part_id: part.id, vehicle_variant_id: a4_20tfsi.id, note: { position: 'front wishbone' } },
  });

  console.log('✅ Seed 完成：', { make: audi.name, model: a4.name, gen: b9.name, variant: a4_20tfsi.variant_name, part: part.sku });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
