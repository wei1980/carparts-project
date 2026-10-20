/**
 * Performance Test Script
 */
const { PrismaClient } = require('@prisma/client');
const { QueryOptimizer } = require('../src/utils/queryOptimizer');

const prisma = new PrismaClient();
const optimizer = new QueryOptimizer(prisma);

async function runPerformanceTests() {
  console.log('Starting Performance Tests...');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  async function test(name, fn, thresholdMs = 100) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      const passed = duration <= thresholdMs;

      results.tests.push({ name, duration, passed, threshold: thresholdMs });
      if (passed) {
        results.passed++;
        console.log('PASS ' + name + ': ' + duration + 'ms');
      } else {
        results.failed++;
        console.log('FAIL ' + name + ': ' + duration + 'ms - SLOW');
      }
    } catch (err) {
      results.failed++;
      const duration = Date.now() - start;
      results.tests.push({ name, duration, passed: false, error: err.message });
      console.log('FAIL ' + name + ': ' + duration + 'ms - ERROR: ' + err.message);
    }
  }

  await test('Basic connection query', async () => {
    await prisma.$queryRaw`SELECT 1`;
  }, 50);

  await test('Garage list query', async () => {
    await prisma.workshop.findMany({
      where: { is_garage: true, is_active: true },
      select: { id: true, garage_name: true, garage_address: true },
      take: 20,
    });
  }, 100);

  await test('Part recommendation query', async () => {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { variantId: { not: null } },
      select: { variantId: true },
    });

    if (vehicle?.variantId) {
      await prisma.part.findMany({
        where: {
          is_active: true,
          compatible_vehicles: { some: { vehicle_id: vehicle.variantId } },
        },
        take: 12,
      });
    }
  }, 200);

  await test('Part compatibility query', async () => {
    const compat = await prisma.partCompatibility.findMany({
      where: { vehicle_id: 17327 },
      take: 20,
    });
  }, 100);

  await test('Vehicle variant lookup', async () => {
    const years = await prisma.vehicleVariant.findMany({
      where: { is_approved: true },
      select: { year_start: true },
      distinct: ['year_start'],
      orderBy: { year_start: 'desc' },
    });
  }, 100);

  await test('Part keyword search', async () => {
    await prisma.part.findMany({
      where: {
        is_active: true,
        OR: [
          { name: { contains: 'brake', mode: 'insensitive' } },
          { brand: { contains: 'brembo', mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }, 150);

  await test('Cursor pagination', async () => {
    let cursor = null;
    for (let i = 0; i < 3; i++) {
      await prisma.part.findMany({
        where: { is_active: true },
        take: 50,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
      });
    }
  }, 300);

  await test('Relation preload (no N+1)', async () => {
    await prisma.appointment.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED'] } },
      take: 10,
      include: {
        vehicle: { select: { make: true, model: true } },
        garage: { select: { garage_name: true } },
        user: { select: { name: true } },
      });
  }, 150);

  await test('Aggregation queries', async () => {
    await Promise.all([
      prisma.appointment.count({ where: { status: 'PENDING' } }),
      prisma.part.count({ where: { is_active: true } }),
      prisma.workshop.count({ where: { is_garage: true, is_active: true } }),
    ]);
  }, 100);

  await test('Batch operations', async () => {
    const opt = new (require('../src/utils/queryOptimizer').QueryOptimizer)();
    await opt.batchCreate('part', [
      { sku: 'TEST-001', name: 'Test Part 1', brand: 'Test', is_active: true },
      { sku: 'TEST-002', name: 'Test Part 2', brand: 'Test', is_active: true },
    ], { batchSize: 2 });
  }, 100);

  await test('Exists check optimization', async () => {
    const exists = await optimizer.exists('part', { is_active: true });
  }, 50);

  console.log('\n' + '='.repeat(50));
  console.log('PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(50));
  console.log('Total tests: ' + results.tests.length);
  console.log('Passed: ' + results.passed);
  console.log('Failed: ' + results.failed);
  console.log('Success rate: ' + ((results.passed / results.tests.length) * 100).toFixed(1) + '%');

  const slowTests = results.tests.filter(t => t.duration > 200);
  if (slowTests.length > 0) {
    console.log('\nSLOW QUERIES (>200ms):');
    slowTests.forEach(t => console.log('  - ' + t.name + ': ' + t.duration + 'ms'));
  }

  const avgDuration = results.tests.reduce((sum, t) => sum + t.duration, 0) / results.tests.length;
  console.log('\nAverage duration: ' + avgDuration.toFixed(1) + 'ms');

  if (results.failed > 0) {
    console.log('\nSome tests failed. Check indexes and query optimization.');
    process.exitCode = 1;
  } else {
    console.log('\nAll performance tests passed!');
  }

  await prisma.$disconnect();
}

runPerformanceTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
