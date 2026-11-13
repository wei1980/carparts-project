// tests/media-access.node.cjs — /media 存取控制
//
// 背景：/media 同時是使用者上傳（行照、施工照、名片、大頭照、AI 上傳）
// 與 importer 工作目錄（CSV/XLSX 大量落地）。express.static 不檢查身分，
// 先前可匿名下載含「車廠批發價」243,559 列的 Powerflex CSV。
//
// 這支測試把 express 換成「只記錄 app.use 掛載點」的假實作物件，
// 取出掛在 /media 前面的守門 middleware 直接呼叫，只驗證「放不放行」，
// 不經 HTTP、不讀檔、不建連線池。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-media-access';
process.env.JWT_SECRET = SECRET;

function loadMediaGate() {
  const filename = require.resolve('../src/app');
  const realRequire = createRequire(filename);
  const noop = (req, res, next) => next && next();
  const mounts = [];

  const fakeApp = {
    use(route, mw) { if (typeof route === 'string') mounts.push({ route, mw }); return fakeApp; },
    get() { return fakeApp; }, post() { return fakeApp; }, patch() { return fakeApp; },
    delete() { return fakeApp; }, put() { return fakeApp; }, set() { return fakeApp; },
    listen() { return fakeApp; },
  };

  const context = {
    require(name) {
      if (name === 'express') {
        const express = () => fakeApp;
        express.Router = () => fakeApp;
        express.static = () => noop;
        express.json = () => noop;
        express.urlencoded = () => noop;
        return express;
      }
      if (name.startsWith('./routes/')) return fakeApp;
      if (name.startsWith('./middleware/')) return noop;
      if (name === './services/installedCaliperCompatibility') return { needsInstalledCaliperReview: () => false };
      if (name === 'fs') return { ...fs, existsSync: () => true, mkdirSync: () => {} };
      try { return realRequire(name); } catch { return {}; }
    },
    module: { exports: {} }, exports: {}, console: { log() {}, info() {}, warn() {}, error() {} },
    process: { env: { NODE_ENV: 'test', JWT_SECRET: SECRET } },
    Buffer, __dirname: path.dirname(filename), __filename: filename,
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });

  const gate = mounts.find((m) => m.route === '/media' && typeof m.mw === 'function' && m.mw.length === 3);
  return gate && gate.mw;
}

function call(mw, req) {
  const track = { status: null, nexted: false };
  const res = {
    status(c) { track.status = c; return res; },
    json(b) { track.body = b; return res; },
    setHeader() { return res; },
  };
  mw(req, res, () => { track.nexted = true; });
  return track;
}

const bearer = (payload) => ({ authorization: 'Bearer ' + jwt.sign(payload, SECRET, { expiresIn: '1h' }) });

test('app.js 有掛 /media 守門 middleware', () => {
  assert.ok(typeof loadMediaGate() === 'function');
});

test('匯入素材目錄（Data / _originals_parts）一律 404，不論身分', () => {
  const gate = loadMediaGate();
  for (const p of ['/Data/Powerflex_零件資料.csv', '/Data/parts_upload_KW.csv', '/_originals_parts/x.jpg']) {
    assert.equal(call(gate, { path: p, headers: {}, method: 'GET' }).status, 404, p);
  }
  assert.equal(call(gate, { path: '/Data/x.csv', headers: bearer({ workshopId: 1, role: 'ADMIN' }), method: 'GET' }).status, 404);
});

test('商品圖 / Logo / 車廠照公開（前台 <img> 無 cookie 也要能載）', () => {
  const gate = loadMediaGate();
  for (const p of ['/parts/Brand/KW/x.webp', '/Logo/logo.png', '/garage_photos/g1.jpg']) {
    assert.equal(call(gate, { path: p, headers: {}, method: 'GET' }).nexted, true, p);
  }
});

test('未登入不得取名片 / 大頭照 / 施工照（PII）', () => {
  const gate = loadMediaGate();
  for (const p of ['/business_cards/card_1.jpg', '/avatars/a1.jpg', '/work_photos/w1.jpg', '/regphotos/r1.jpg', '/ai_uploads/a.jpg', '/modifications/m.jpg']) {
    assert.equal(call(gate, { path: p, headers: {}, method: 'GET' }).status, 401, p);
  }
});

test('一般會員 token 不得取 PII 目錄（403）', () => {
  const gate = loadMediaGate();
  assert.equal(call(gate, { path: '/business_cards/card_1.jpg', headers: bearer({ userId: 'u1' }), method: 'GET' }).status, 403);
});

test('車廠 / 管理員 token 可取 PII 目錄', () => {
  const gate = loadMediaGate();
  for (const payload of [{ workshopId: 7, role: 'VERIFIED' }, { workshopId: 1, role: 'ADMIN' }]) {
    assert.equal(call(gate, { path: '/business_cards/card_1.jpg', headers: bearer(payload), method: 'GET' }).nexted, true, JSON.stringify(payload));
  }
});

test('無效 token 視同未登入', () => {
  const gate = loadMediaGate();
  assert.equal(call(gate, { path: '/business_cards/card_1.jpg', headers: { authorization: 'Bearer not.a.jwt' }, method: 'GET' }).status, 401);
});

test('會員 cookie 可通過身分關，但 PII 目錄仍需 ADMIN/GARAGE', () => {
  const gate = loadMediaGate();
  const token = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '1h' });
  const out = call(gate, {
    path: '/avatars/a1.jpg',
    headers: { cookie: 'carparts_at=' + encodeURIComponent(token) },
    method: 'GET',
  });
  assert.equal(out.status, 403);
});