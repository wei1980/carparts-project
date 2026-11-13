// tests/auth-state-recheck.node.cjs — 認證中介軟體必須回查資料庫
//
// 為什麼需要這個測試：JWT 有效期 7 天。若中介軟體只驗簽章，
// 「帳號被停用 / 未通過審核」在 token 到期前完全不生效，
// 而 isAdmin 也會沿用 token 內的舊宣告。
//
// 這些測試不連任何資料庫：用假的 prisma 與 jsonwebtoken 簽出的真 token，
// 直接呼叫各 middleware，只驗證「放不放行」與 req 上寫了什麼。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-for-auth-recheck';
process.env.JWT_SECRET = SECRET;

function loadMiddleware(file, prisma) {
  const filename = require.resolve(path.join('../src/middleware', file));
  const realRequire = createRequire(filename);
  const noop = (req, res, next) => next();
  const context = {
    require(name) {
      if (name === '../lib/prisma') return prisma;
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { return prisma; } } };
      return realRequire(name);
    },
    module: { exports: {} }, exports: {}, console, process, Buffer,
    __dirname: path.dirname(filename),
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  return context.module.exports;
}

function mockRes() {
  const track = { status: 200, body: null };
  const res = {
    status(code) { track.status = code; return res; },
    json(value) { track.body = value; return res; },
    setHeader() { return res; },
    cookie() { return res; },
    clearCookie() { return res; },
  };
  return { res, track };
}

async function run(mw, req) {
  const { res, track } = mockRes();
  let nexted = false;
  await mw(req, res, () => { nexted = true; });
  return { nexted, ...track };
}

const userToken = (over = {}) => jwt.sign({ userId: 'u1', phone: '0900000001', ...over }, SECRET, { expiresIn: '1h' });
const workshopToken = (over = {}) => jwt.sign({ workshopId: 7, phone: '0900000002', role: 'ADMIN', ...over }, SECRET, { expiresIn: '1h' });

test('authMiddleware: 已審核且啟用 → 放行，userId 來自 DB 結果', async () => {
  const prisma = { endUser: { findUnique: async () => ({ id: 'u1', is_active: true, is_approved: true }) } };
  const mw = loadMiddleware('authMiddleware.js', prisma);
  const req = { headers: { authorization: 'Bearer ' + userToken() }, requestId: 'r1' };
  const out = await run(mw, req);
  assert.equal(out.nexted, true);
  assert.equal(req.userId, 'u1');
  assert.equal(req.isAdmin, false);
});

test('authMiddleware: 未通過審核 → 403（即使 token 有效）', async () => {
  const prisma = { endUser: { findUnique: async () => ({ id: 'u1', is_active: true, is_approved: false }) } };
  const mw = loadMiddleware('authMiddleware.js', prisma);
  const out = await run(mw, { headers: { authorization: 'Bearer ' + userToken() }, requestId: 'r2' });
  assert.equal(out.nexted, false);
  assert.equal(out.status, 403);
});

test('authMiddleware: 帳號停用 → 403（撤銷 7 天 token 的存取）', async () => {
  const prisma = { endUser: { findUnique: async () => ({ id: 'u1', is_active: false, is_approved: true }) } };
  const mw = loadMiddleware('authMiddleware.js', prisma);
  const out = await run(mw, { headers: { authorization: 'Bearer ' + userToken() }, requestId: 'r3' });
  assert.equal(out.status, 403);
  assert.equal(out.body.error, '帳號已被停用');
});

test('authMiddleware: 帳號不存在 → 401', async () => {
  const prisma = { endUser: { findUnique: async () => null } };
  const mw = loadMiddleware('authMiddleware.js', prisma);
  const out = await run(mw, { headers: { authorization: 'Bearer ' + userToken() }, requestId: 'r4' });
  assert.equal(out.status, 401);
});

test('authMiddleware: workshop token → isAdmin 以 DB 的 role 為準（token 寫 ADMIN 但 DB 是 VERIFIED）', async () => {
  const prisma = { workshop: { findUnique: async () => ({ id: 7, is_active: true, role: 'VERIFIED', is_approved: true, is_garage: true }) } };
  const mw = loadMiddleware('authMiddleware.js', prisma);
  const req = { headers: { authorization: 'Bearer ' + workshopToken({ role: 'ADMIN' }) }, requestId: 'r5' };
  const out = await run(mw, req);
  assert.equal(out.nexted, true);
  assert.equal(req.isAdmin, false, 'role 必須來自 DB，不可信任 token 內的宣告');
});

test('adminAuth: 只接受 Authorization: Bearer（query token 一律 401）', async () => {
  const prisma = { workshop: { findUnique: async () => ({ id: 7, role: 'ADMIN', is_active: true }) } };
  const mw = loadMiddleware('adminAuth.js', prisma);
  const out = await run(mw, { query: { admin_token: workshopToken() }, headers: {}, path: '/parts', requestId: 'r6' });
  assert.equal(out.status, 401, 'admin_token query 參數已移除，不得再被接受');
});

test('adminAuth: role 非 ADMIN → 403', async () => {
  const prisma = { workshop: { findUnique: async () => ({ id: 7, role: 'VERIFIED', is_active: true }) } };
  const mw = loadMiddleware('adminAuth.js', prisma);
  const out = await run(mw, { headers: { authorization: 'Bearer ' + workshopToken({ role: 'VERIFIED' }) }, path: '/parts', requestId: 'r7' });
  assert.equal(out.status, 403);
});

test('garageAuth: 非車廠帳號不得進車廠路由', async () => {
  const prisma = { workshop: { findUnique: async () => ({ id: 7, is_active: true, is_approved: true, is_garage: false, role: 'TRIAL' }) } };
  const mw = loadMiddleware('garageAuth.js', prisma);
  const out = await run(mw, { headers: { authorization: 'Bearer ' + workshopToken({ role: 'TRIAL' }) }, requestId: 'r8' });
  assert.equal(out.status, 403);
});

test('garageAuth: 未審核車廠 → 403', async () => {
  const prisma = { workshop: { findUnique: async () => ({ id: 7, is_active: true, is_approved: false, is_garage: true, role: 'TRIAL' }) } };
  const mw = loadMiddleware('garageAuth.js', prisma);
  const out = await run(mw, { headers: { authorization: 'Bearer ' + workshopToken({ role: 'TRIAL' }) }, requestId: 'r9' });
  assert.equal(out.status, 403);
  assert.equal(out.body.error, '帳號尚未通過審核');
});