// DB-free regression for PATCH /api/admin/orders/:orderId (adminBank router).
// Exercises the actual handler via vm-loaded module; payment statuses must be
// rejected (bank reconciliation owns them), CANCELLED goes through the shared
// cancellation service, COMPLETED only from SHIPPED.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');

function loadRouter({ order, updateManyCount = 1, cancelImpl } = {}) {
  const filename = require.resolve('../src/routes/adminBank');
  const realRequire = createRequire(filename);
  const prisma = {
    consumerOrder: {
      findUnique: async () => order,
      updateMany: async () => ({ count: updateManyCount }),
    },
    $transaction: async fn => fn(prisma),
  };
  const calls = { cancel: [], updateMany: [] };
  const context = {
    module: { exports: {} },
    console: { error: () => {}, warn: () => {}, debug: () => {}, info: () => {} },
    require(name) {
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      if (name === '../middleware/adminAuth') return (req, res, next) => next();
      if (name === '../services/lineService') return { notifyOrderUpdate: async () => {} };
      if (name === '../services/bankExcelService') return { readBankExcel: async () => [], EXCEL_PATH: 'x' };
      if (name === '../services/bankClaim') return { fingerprintTransaction: () => null, claimBankPayment: async () => ({}) };
      if (name === '../services/orderCancellation') {
        return { cancelConsumerOrder: async (tx, target) => { calls.cancel.push(target); return { cancelled: true, orderId: target.id }; } };
      }
      return realRequire(name);
    },
    process, Date, Set, Map, parseInt, __dirname: path.dirname(filename),
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const entry = context.module.exports.stack.find(s => s.route?.path === '/orders/:orderId' && s.route.methods?.patch);
  assert.ok(entry, 'PATCH /orders/:orderId route must exist');
  const handler = entry.route.stack.at(-1).handle;
  return { handler, calls, prisma };
}

function mockRes(track) {
  return {
    status(code) { track.status = code; return this; },
    json(body) { track.body = body; },
  };
}

test('付款類狀態被拒絕，導向銀行對帳流程', async () => {
  const { handler } = loadRouter({ order: { id: 1, status: 'PENDING_PAYMENT', userId: 'u1', orderType: 'INSTOCK' } });
  const track = {};
  await handler({ params: { orderId: '1' }, body: { status: 'PAID' } }, mockRes(track));
  assert.equal(track.status, 400);
  assert.equal(track.body.code, 'PAYMENT_STATUS_VIA_BANK');
});

test('SHIPPED → COMPLETED 條件式轉換成功', async () => {
  const { handler, calls } = loadRouter({ order: { id: 2, status: 'SHIPPED', userId: 'u2' } });
  const track = {};
  await handler({ params: { orderId: '2' }, body: { status: 'COMPLETED' } }, mockRes(track));
  assert.equal(track.status, 200);
  assert.equal(track.body.status, 'COMPLETED');
  assert.equal(calls.cancel.length, 0);
});

test('非 SHIPPED 訂單不可標記完成（409）', async () => {
  const { handler } = loadRouter({ order: { id: 3, status: 'PAID', userId: 'u3' }, updateManyCount: 0 });
  const track = {};
  await handler({ params: { orderId: '3' }, body: { status: 'COMPLETED' } }, mockRes(track));
  assert.equal(track.status, 409);
  assert.equal(track.body.code, 'INVALID_STATUS_TRANSITION');
});

test('CANCELLED 走 cancelConsumerOrder（庫存回補服務）', async () => {
  const { handler, calls } = loadRouter({ order: { id: 4, status: 'PENDING_PAYMENT', userId: 'u4' } });
  const track = {};
  await handler({ params: { orderId: '4' }, body: { status: 'CANCELLED' } }, mockRes(track));
  assert.equal(track.status, 200);
  assert.deepEqual(calls.cancel.map(c => ({ id: c.id, userId: c.userId })), [{ id: 4, userId: 'u4' }]);
});

test('取消服務的 ORDER_NOT_CANCELLABLE 對應 409', async () => {
  const filename = require.resolve('../src/routes/adminBank');
  const realRequire = createRequire(filename);
  const prisma = {
    consumerOrder: { findUnique: async () => ({ id: 5, status: 'PAID', userId: 'u5' }), updateMany: async () => ({ count: 0 }) },
    $transaction: fn => fn(prisma),
  };
  const context = {
    module: { exports: {} }, console: { error: () => {}, warn: () => {}, debug: () => {}, info: () => {} },
    require(name) {
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      if (name === '../middleware/adminAuth') return (req, res, next) => next();
      if (name === '../services/lineService') return { notifyOrderUpdate: async () => {} };
      if (name === '../services/bankExcelService') return { readBankExcel: async () => [], EXCEL_PATH: 'x' };
      if (name === '../services/bankClaim') return { fingerprintTransaction: () => null, claimBankPayment: async () => {} };
      if (name === '../services/orderCancellation') {
        return { cancelConsumerOrder: async () => { throw Object.assign(new Error('只有待付款訂單可以取消'), { code: 'ORDER_NOT_CANCELLABLE' }); } };
      }
      return realRequire(name);
    },
    process, Date, Set, Map, parseInt, __dirname: path.dirname(filename),
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const entry = context.module.exports.stack.find(s => s.route?.path === '/orders/:orderId' && s.route.methods?.patch);
  const track = {};
  await entry.route.stack.at(-1).handle({ params: { orderId: '5' }, body: { status: 'CANCELLED' } }, mockRes(track));
  assert.equal(track.status, 409);
  assert.equal(track.body.code, 'ORDER_NOT_CANCELLABLE');
});

test('CANCELLED：訂單不存在 → 404', async () => {
  const { handler } = loadRouter({ order: null });
  const track = {};
  await handler({ params: { orderId: '999' }, body: { status: 'CANCELLED' } }, mockRes(track));
  assert.equal(track.status, 404);
});
