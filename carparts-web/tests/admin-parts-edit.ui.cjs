// Mock data only; exercise real AdminParts page edit flow. No business APIs contacted.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const listResponse = {
  data: [
    { id: 1, sku: 'KONI-001', name: '避震器', brand: 'KONI', msrp_price: 12000, stock_qty: 5, is_active: true, subcategory: null, category: '底盤' },
  ],
  pagination: { page: 1, limit: 20, total: 1, pages: 1 },
};
const detail = {
  id: 1, sku: 'KONI-001', name: '避震器', brand: 'KONI', description: '', msrp_price: 12000, wholesale_price: 8000,
  image_url: '', stock_qty: 5, is_active: true, is_universal: false, subcategory_id: null,
  parts_on_categories: [], compatible_vehicles: [],
};
const calls = [];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('adminToken', 'isolated-ui-fixture');
      localStorage.setItem('adminUser', JSON.stringify({ company_name: 'UI fixture' }));
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      calls.push({ method: route.request().method(), path: url.pathname });
      if (url.pathname === '/api/admin/parts' && route.request().method() === 'GET') return route.fulfill({ json: listResponse });
      if (url.pathname === '/api/admin/parts/1' && route.request().method() === 'GET') return route.fulfill({ json: detail });
      if (url.pathname === '/api/admin/parts/1' && route.request().method() === 'PATCH') {
        return route.fulfill({ json: { ...detail, msrp_price: 13000 } });
      }
      if (url.pathname === '/api/admin/categories/tree' || url.pathname === '/api/admin/variants') return route.fulfill({ json: [] });
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => console.error('PAGE:', e.message));
    await page.goto('http://localhost:5173/admin/parts');
    await page.getByText('KONI-001').waitFor({ timeout: 20000 });

    await page.getByRole('button', { name: '編輯' }).click();
    const modal = page.locator('h2', { hasText: '編輯商品 #1' });
    await modal.waitFor({ timeout: 10000 });

    const priceInput = page.locator('input[name="msrp_price"]');
    await priceInput.fill('13000');
    const [patchResponse] = await Promise.all([
      page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === '/api/admin/parts/1', { timeout: 10000 }),
      page.getByRole('button', { name: '更新商品' }).click(),
    ]);
    assert.equal(patchResponse.status(), 200, 'PATCH must return 200');

    const expected = [
      { method: 'GET', path: '/api/admin/parts' },
      { method: 'GET', path: '/api/admin/parts/1' },
      { method: 'PATCH', path: '/api/admin/parts/1' },
    ];
    const actual = calls.filter(c => c.path.startsWith('/api/admin/parts'));
    assert.deepEqual(actual, expected, 'edit flow must hit /api/admin/parts[/1] exactly: ' + JSON.stringify(actual));
    console.log('PASS: edit flow composes GET /api/admin/parts, GET /parts/1, PATCH /parts/1');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL:', String(e?.message || e).split('\n')[0]); process.exitCode = 1; });
