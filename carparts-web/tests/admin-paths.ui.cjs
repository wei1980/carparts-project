// Cross-page admin URL verification: real pages, mocked API. Asserts every
// adminClient request composes to exactly one /api/admin/<resource> (no
// duplicated /admin/admin, no bare /api/admin), and no page crashes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const cases = [
  ['/admin/appointments', /\/api\/admin\/appointments\?status=/],
  ['/admin/categories', /\/api\/admin\/categories\/tree/],
  ['/admin/inventory', /\/api\/admin\/inventory(\?|$)/],
  ['/admin/orders', /\/api\/admin\/orders(\?|$)/],
  ['/admin/parts', /\/api\/admin\/parts\?/],
  ['/admin/procurement', /\/api\/admin\/procurement\/suppliers/],
  ['/admin/settings', /\/api\/admin\/settings/],
  ['/admin/users', /\/api\/admin\/users\?status=/],
  ['/admin/vehicle-approval', /\/api\/admin\/variants\?status=/],
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('adminToken', 'isolated-ui-fixture');
      localStorage.setItem('adminUser', JSON.stringify({ company_name: 'UI fixture' }));
    });
    const apiCalls = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      apiCalls.push(url.pathname + url.search);
      let body = [];
      if (url.pathname === '/api/admin/parts') body = { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
      if (url.pathname === '/api/admin/categories/tree') body = [{ id: 1, name: '煞車', subcategories: [] }];
      if (url.pathname === '/api/admin/bank/transactions') body = { excel_path: 'x', transactions: [], pending_orders: [] };
      if (url.pathname === '/api/admin/settings') body = {};
      return route.fulfill({ json: body });
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    for (const [route, expected] of cases) {
      const before = apiCalls.length;
      await page.goto('http://localhost:5173' + route);
      try {
        await page.waitForRequest(expected, { timeout: 15000 });
      } catch {
        assert.fail(`${route}: expected request ${expected} not observed; saw ${JSON.stringify(apiCalls.slice(before))}`);
      }
      console.log('PASS:', route);
    }
    const bad = apiCalls.filter(u => u.startsWith('/api/admin/admin/') || u === '/api/admin' || u.startsWith('/api/admin?'));
    assert.equal(pageErrors.length, 0, 'page errors: ' + pageErrors.join(' | '));
    assert.deepEqual(bad, []);
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL:', String(e?.message || e).split('\n')[0]); process.exitCode = 1; });
