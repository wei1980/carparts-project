const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const sample = await p.vehicleVariant.findMany({
    where: { make: { in: ['BMW', 'Toyota', 'Volkswagen'] } },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, variant_name: true, year_start: true, year_end: true },
    take: 30,
    orderBy: [{ make: 'asc' }, { model: 'asc' }, { year_start: 'asc' }],
  });
  console.log(JSON.stringify(sample, null, 1));

  const supra = await p.vehicleVariant.findMany({
    where: { OR: [{ model: { contains: 'Supra', mode: 'insensitive' } }, { engine_code: { contains: '2JZ', mode: 'insensitive' } }] },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, variant_name: true, year_start: true, year_end: true },
  });
  console.log('SUPRA:', JSON.stringify(supra, null, 1));

  const b58 = await p.vehicleVariant.findMany({
    where: { engine_code: { contains: 'B58', mode: 'insensitive' } },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, variant_name: true, year_start: true, year_end: true },
    take: 20,
  });
  console.log('B58:', JSON.stringify(b58, null, 1));

  await p.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
