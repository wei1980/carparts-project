// Mock data only; exercise the real AdminParts page. No business APIs contacted.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const listResponse = {
  data: [
    { id: 1, sku: 'KONI-001', name: '避震器', brand: 'KONI', msrp_price: 12000, stock_qty: 5, is_active: true, subcategory: null, category: '底盤' },
    { id: 2, sku: 'TEST-002', name: '來令片', brand: 'AP', msrp_price: 3500, stock_qty: 12, is_active: true, subcategory: null, category: '煞車' },
  ],
  pagination: { page: 1, limit: 20, total: 7397, pages: 370 },
};

function blockUnknown(pathname) {
  if (pathname.startsWith('/api/')) throw new Error('Unexpected API call: ' + pathname);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('adminToken', 'isolated-ui-fixture');
      localStorage.setItem('adminUser', JSON.stringify({ company_name: 'UI fixture' }));
    });
    let listUrl = null;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname === '/api/admin/parts' || url.pathname === '/api/admin/parts/') {
        listUrl = url.pathname + url.search;
        return route.fulfill({ json: listResponse });
      }
      if (url.pathname === '/api/admin/categories/tree' || url.pathname === '/api/admin/variants') {
        return route.fulfill({ json: [] });
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => console.error('PAGE:', e.message));
    page.on('requestfailed', r => console.error('REQFAIL:', r.url().slice(0, 120)));
    page.on('response', r => { if (r.status() >= 400) console.error('HTTP:', r.status(), new URL(r.url()).pathname); });
    await page.goto('http://localhost:5173/admin/parts');
    await page.getByText('KONI-001').waitFor({ timeout: 20000 });
    assert.equal(await page.getByText('來令片').count(), 1, 'fixture rows must render');
    console.log('PASS: rows render; list request =', listUrl);
    assert.ok(listUrl.startsWith('/api/admin/parts?'), 'list must target /api/admin/parts exactly, got ' + listUrl);
    assert.ok(!listUrl.includes('??') && !listUrl.includes('/api/admin/api'), 'no duplicated prefix or double question mark');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL:', e.message.split('\n')[0]); blockUnknownSafe(e); process.exitCode = 1; });
function blockUnknownSafe() {}
