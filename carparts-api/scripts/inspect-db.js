// Quick DB inspection for PFS import planning
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const cats = await p.categories.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
  console.log('CATEGORIES:', cats.map((c) => `${c.id}:${c.name}`).join(' | '));

  const subs = await p.subcategories.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
  console.log('SUBCATEGORIES:', subs.map((s) => `${s.id}:${s.name}(cat ${s.category_id})`).join(' | '));

  const parts = await p.part.count();
  const vv = await p.vehicleVariant.count();
  const pc = await p.partCompatibility.count();
  console.log({ parts, vehicleVariants: vv, partCompat: pc });

  const brands = await p.part.groupBy({ by: ['brand'], _count: { brand: true }, orderBy: { brand: 'asc' } });
  console.log('BRANDS:', brands.map((b) => `${b.brand}(${b._count.brand})`).join(' | '));

  const makes = await p.$queryRaw`SELECT make, count(*)::int AS n FROM vehicle_variants GROUP BY make ORDER BY make`;
  console.log('MAKES:', makes.map((m) => `${m.make}(${m.n})`).join(' | '));

  // sample variants for BMW/Toyota to see naming style
  const sample = await p.vehicleVariant.findMany({
    where: { make: { in: ['bmw', 'toyota'] } },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, variant_name: true, year_start: true, year_end: true },
    take: 25,
  });
  console.log('VARIANT SAMPLE:', JSON.stringify(sample, null, 1));

  await p.$disconnect();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
