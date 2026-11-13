// Integration: the actual GET /bank/transactions handler against the REAL
// 訂單管理.xlsm. Asserts structure and the 註記/備註 mapping without printing
// any transaction content (no memo/remitter values in output).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');

const WORKBOOK = process.env.BANK_EXCEL_PATH || 'C:/carparts/訂單管理.xlsm';
// CI（ubuntu）沒有這份工作簿；沒有就跳過整支，不要讓整個檔案在載入時拋錯。
const WORKBOOK_AVAILABLE = fs.existsSync(WORKBOOK);
const skip = WORKBOOK_AVAILABLE ? false : `workbook not available: ${WORKBOOK}`;

function loadHandler() {
  const filename = require.resolve('../src/routes/adminBank');
  const realRequire = createRequire(filename);
  const prisma = {
    // 2026-10: the handler now reads DB rows first (bankTransaction) and only
    // falls back to the workbook when the table is empty. The mock must model
    // an empty table so this suite keeps exercising the EXCEL path.
    bankTransaction: { count: async () => 0, findMany: async () => [] },
    bankRemittanceClaim: { findMany: async () => [] },
    consumerOrder: { findMany: async () => [] },
  };
  const context = {
    module: { exports: {} }, console: { error: () => {}, debug: () => {}, info: () => {} },
    require(name) {
      if (name === '../lib/prisma' || name === './lib/prisma' || name.endsWith('/lib/prisma')) return prisma;
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      if (name === '../middleware/adminAuth') return (req, res, next) => next();
      if (name === '../services/lineService') return { notifyOrderUpdate: async () => {} };
      return realRequire(name);
    },
    process, Date, Set, Map, __dirname: path.dirname(filename),
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  const entry = context.module.exports.stack.find(s => {
    if (!s.route) return false;
    const p = s.route.path;
    return Array.isArray(p) ? p.includes('/bank/transactions') : p === '/bank/transactions';
  });
  assert.ok(entry, 'route /bank/transactions must exist');
  return entry.route.stack.at(-1).handle;
}

const shaBefore = fs.existsSync(WORKBOOK) ? fs.statSync(WORKBOOK).mtimeMs : 0;

test('GET /bank/transactions 對真實訂單管理工作簿回傳 C/W 交易', { skip }, async () => {
  const handler = loadHandler();
  let statusCode = 0, body = null;
  await handler({ query: {} }, {
    status(c) { statusCode = c; return this; },
    json(b) { body = b; },
  });
  assert.equal(statusCode || 200, 200);
  assert.equal(body.excel_path, WORKBOOK);
  assert.ok(body.transactions.length > 0, 'C/W sheets must yield transactions');
  for (const t of body.transactions) {
    assert.ok(['C', 'W'].includes(t.account), `account must be C or W, got ${t.account}`);
    assert.match(t.date, /^\d{4}-\d{2}-\d{2}/, `date must be YYYY-MM-DD, got ${t.date}`);
    assert.ok(t.amount > 0);
    const fp = t.fingerprint;
    assert.ok(fp === null || (typeof fp === 'string' && /^[0-9a-f]{64}$/.test(fp)), `fingerprint must be sha256 hex or null`);
    // 註記/備註 mapping: memo is the masked bank reference (contains **),
    // never the 摘要 action label. Asserts mapping without leaking values.
    assert.equal(['跨行轉', '轉帳存', '手續費', 'ATM 轉帳'].includes(t.memo), false, 'memo must come from 註記, not 摘要');
    assert.equal(t.claimed, false);
  }
  assert.ok(body.pending_orders.length >= 0);
});

test('讀取過程不修改來源工作簿', { skip }, async () => {
  const stat = fs.statSync(WORKBOOK);
  assert.equal(stat.mtimeMs, shaBefore, 'workbook mtime must not change');
  assert.equal(stat.mtimeMs > 0, true);
});

