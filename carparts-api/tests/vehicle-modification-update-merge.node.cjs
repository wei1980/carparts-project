const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// DB-free unit evidence for the vehicleModifications update merge: the express
// handler is executed with only Prisma replaced (no server, no database).
async function runUpdate(existing, input) {
  const filename = require.resolve('../src/routes/vehicleModifications');
  const realRequire = createRequire(filename);
  const writes = [];
  const prisma = {
    vehicleProfile: { findFirst: async () => ({ id: 'vehicle-1' }), update: async () => ({}) },
    vehicleModification: {
      findFirst: async () => existing,
      findMany: async () => [],
      update: async ({ data }) => {
        const defined = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
        writes.push({ ...existing, ...defined });
        return writes.at(-1);
      },
    },
  };
  const noop = () => {};
  const context = {
    require(name) {
      if (name === '../lib/prisma' || name === './lib/prisma' || name.endsWith('/lib/prisma')) return prisma;
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      if (name === '../middleware/authMiddleware') return noop;
      if (name === '../middleware/fileUploadValidation') {
        return { uploadFields: () => noop, handleUploadError: noop, processUploadedFiles: (req, res, next) => next() };
      }
      return realRequire(name);
    },
    module: { exports: {} }, console, process, Date, Buffer,
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const route = context.module.exports.stack.find(entry => entry.route?.path === '/:id/modifications' && entry.route.methods.post).route;
  const handler = route.stack.at(-1).handle;
  let statusCode = 200, body;
  await handler({ params: { id: 'vehicle-1' }, userId: 'owner-1', body: { category: 'brake', partType: 'caliper', ...input } }, {
    status(code) { statusCode = code; return this; }, json(value) { body = value; return this; },
  });
  assert.equal(statusCode, 200);
  return { writes, body };
}

test('explicit zero mileage and labor cost remain zero rather than clearing history', async () => {
  const { body } = await runUpdate({ id: 'mod-1', ...constructionHistory }, {
    brand: 'Brembo', model: 'GT4', installedMileageKm: 0, laborCost: 0,
  });
  assert.equal(body.installedMileageKm, 0);
  assert.equal(body.laborCost, 0);
});

test('explicit history edits and null clears still apply', async () => {
  const { body } = await runUpdate({ id: 'mod-1', ...constructionHistory }, {
    brand: 'Brembo', model: 'GT4', installedAt: null, warrantyUntil: null,
    installedMileageKm: '56000', laborCost: null, garageId: null,
    beforePhotoUrls: [], afterPhotoUrls: ['replacement.jpg'],
  });
  assert.equal(body.installedAt, null);
  assert.equal(body.warrantyUntil, null);
  assert.equal(body.installedMileageKm, 56000);
  assert.equal(body.laborCost, null);
  assert.equal(body.garageId, null);
  assert.deepEqual(body.beforePhotoUrls, []);
  assert.deepEqual(body.afterPhotoUrls, ['replacement.jpg']);
});

const constructionHistory = {
  installedAt: new Date('2026-01-10T00:00:00.000Z'),
  installedMileageKm: 52000,
  laborCost: 3500,
  warrantyUntil: new Date('2027-01-10T00:00:00.000Z'),
  garageId: 7,
  beforePhotoUrls: ['before.jpg'],
  afterPhotoUrls: ['after.jpg'],
};

test('update with only brand/model/specJson/note keeps omitted construction-history fields', async () => {
  const { writes } = await runUpdate({ id: 'mod-1', ...constructionHistory }, { brand: 'Brembo', model: 'GT4', specJson: { axle: 'front' }, note: 'changed' });
  assert.deepEqual(writes[0], {
    id: 'mod-1',
    brand: 'Brembo', model: 'GT4', specJson: { axle: 'front' }, note: 'changed',
    installedAt: constructionHistory.installedAt,
    installedMileageKm: 52000,
    laborCost: 3500,
    warrantyUntil: constructionHistory.warrantyUntil,
    garageId: 7,
    beforePhotoUrls: ['before.jpg'],
    afterPhotoUrls: ['after.jpg'],
  });
});
