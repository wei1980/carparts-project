const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');

// Execute the actual app route with only infrastructure replaced. No server,
// credentials, Prisma connection, database operations or filesystem writes.
async function compatibility(vehicle, part) {
  const filename = require.resolve('../src/app');
  const realRequire = createRequire(filename);
  const reads = {};
  const prisma = {
    endUser: { findUnique: async () => ({ currentVehicleId: 'vehicle-1' }) },
    vehicleProfile: { findFirst: async (query) => {
      reads.vehicle = query;
      return vehicle && { ...vehicle, modifications_detail: query.include?.modifications_detail ? vehicle.modifications_detail : undefined };
    } },
    part: { findUnique: async (query) => {
      reads.part = query;
      if (!part) return null;
      return Object.fromEntries(Object.keys(query.select).filter(key => key in part).map(key => [key, part[key]]));
    } },
  };
  const noop = (req, res, next) => next();
  const context = {
    require(name) {
      if (name === '../lib/prisma' || name === './lib/prisma' || name.endsWith('/lib/prisma')) return prisma;
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      if (name.startsWith('./routes/')) return noop;
      if (name === './middleware/csrfProtection') return { csrfProtection: noop, verifyCsrfToken: noop };
      if (name.startsWith('./middleware/')) return noop;
      if (name === 'fs') return { ...fs, existsSync: () => true };
      return realRequire(name);
    },
    module: { exports: {} }, __dirname: path.dirname(filename), console,
    process: { env: { NODE_ENV: 'test' } }, Buffer,
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const route = context.module.exports._router.stack.find(entry => entry.route?.path === '/api/parts/:id/compatibility').route;
  const handler = route.stack.at(-1).handle;
  let statusCode = 200, body;
  await handler({ params: { id: '10' }, userId: 'owner-1' }, {
    status(code) { statusCode = code; return this; }, json(value) { body = value; return this; },
  });
  assert.equal(statusCode, 200);
  return { body, reads };
}

test('legacy caliper overrides universal brake part confirmation', async () => {
  const { body } = await compatibility({ ...stockVehicle, modifications: { brake: { caliper } } }, { ...mappedPad, is_universal: true });
  assert.equal(body.status, 'NEEDS_REVIEW');
});

const stockVehicle = { id: 'vehicle-1', variantId: 100, modifications: {}, modifications_detail: [] };
const caliper = { category: 'brake', partType: 'caliper', brand: 'AP Racing', model: 'CP', specJson: { axle: 'front', pistons: 6 } };
const mappedPad = { id: 10, name: 'Street pad', category: '煞車', is_universal: false, compatible_vehicles: [{ vehicle_id: 100 }] };
const coilover = { ...caliper, partType: 'coilover' };

for (const category of ['brakes', '煞車']) {
  test(`legacy ${category}.caliper is guarded even with no structured records`, async () => {
    const { body } = await compatibility({ ...stockVehicle, modifications: { [category]: { caliper } } }, mappedPad);
    assert.equal(body.status, 'NEEDS_REVIEW');
  });
}

for (const [label, fields] of [
  ['pad category', { category: '來令片', name: 'CP9660' }],
  ['pad name without category', { category: null, name: 'Front brake pads' }],
  ['rotor name', { category: null, name: '煞車碟盤' }],
  ['subcategory', { category: null, name: 'CP9660', subcategory: { name: '來令片' } }],
  ['subcategory parent', { category: null, name: 'CP9660', subcategory: { name: '其他', category: { name: '煞車' } } }],
  ['category links', { category: null, name: 'CP9660', parts_on_categories: [{ category: { name: '煞車' } }] }],
]) {
  test(`brake classification uses ${label} before universal confirmation`, async () => {
    const { body } = await compatibility({ ...stockVehicle, modifications_detail: [caliper] }, { ...mappedPad, is_universal: true, ...fields });
    assert.equal(body.status, 'NEEDS_REVIEW');
  });
}

for (const axle of ['front', 'rear', 'both', 'unknown', undefined]) {
  test(`caliper axle ${axle} and matching-looking shape/model do not establish verified fitment`, async () => {
    const installed = { ...caliper, model: 'CP9660', specJson: { axle, pistons: 6, shapeCode: 'CP9660', partId: 10, verified: true } };
    const { body } = await compatibility({ ...stockVehicle, modifications_detail: [installed] }, { ...mappedPad, name: 'CP9660 6 piston brake pads', is_universal: true });
    assert.equal(body.status, 'NEEDS_REVIEW');
  });
}

for (const is_universal of [true, false]) {
  test(`unmodified vehicle retains established confirmation (universal=${is_universal})`, async () => {
    const { body } = await compatibility(stockVehicle, { ...mappedPad, is_universal });
    assert.equal(body.status, 'CONFIRMED');
  });
}

test('stock vehicle without mapping remains review', async () => {
  const { body } = await compatibility(stockVehicle, { ...mappedPad, compatible_vehicles: [] });
  assert.equal(body.status, 'NEEDS_REVIEW');
});

test('missing vehicle still requests a vehicle', async () => {
  const { body } = await compatibility(null, mappedPad);
  assert.equal(body.status, 'NEEDS_VEHICLE');
});

test('non-brake parts keep stock vehicle confirmation with caliper installed', async () => {
  const { body } = await compatibility({ ...stockVehicle, modifications_detail: [caliper] }, { ...mappedPad, category: '懸吊' });
  assert.equal(body.status, 'CONFIRMED');
});

test('non-caliper modifications do not trigger the brake consumable review', async () => {
  const { body } = await compatibility({ ...stockVehicle, modifications_detail: [coilover] }, mappedPad);
  assert.equal(body.status, 'CONFIRMED');
});

test('installed structured caliper overrides stock vehicle mapping for brake pads', async () => {
  const { body } = await compatibility({ ...stockVehicle, modifications_detail: [caliper] }, mappedPad);
  assert.equal(body.status, 'NEEDS_REVIEW');
  assert.match(body.reason, /卡鉗/);
  assert.equal(body.vehicle.id, 'vehicle-1');
});
