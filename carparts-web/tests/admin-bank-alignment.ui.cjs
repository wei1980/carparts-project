// Mock data only; exercise real page/CSS without contacting business APIs.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('adminToken', 'isolated-ui-fixture');
      localStorage.setItem('adminUser', JSON.stringify({ company_name: 'UI fixture' }));
    });
    await context.route('**/api/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (!pathname.startsWith('/api/')) return route.continue();
      if (pathname === '/api/admin/bank/transactions') {
        return route.fulfill({ json: { excel_path: 'fixture.xlsx', pending_orders: [], transactions: [
          { row: 1, date: '2026-09-01', amount: 50, memo: 'A' },
          { row: 2, date: '2026-09-02', amount: 1234567, memo: 'Long reference for alignment testing' },
          { row: 3, date: '2026-09-03', amount: 2400, memo: '' },
        ] } });
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => console.error('PAGE:', e.message));
    page.on('response', r => { if (r.status() >= 400) console.error('HTTP:', r.status(), new URL(r.url()).pathname); });
    await page.goto('http://localhost:5173/admin/bank');
    console.log('URL:', page.url());
    const section = page.getByRole('heading', { name: '📄 Excel 存款交易' }).locator('..');
    await section.getByText('NT$ 50', { exact: true }).waitFor();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(350);
      const positions = await section.locator('span').evaluateAll(nodes => nodes.filter(n => n.textContent.startsWith('NT$ ')).map(n => {
        const range = document.createRange(); range.selectNodeContents(n);
        const box = range.getBoundingClientRect();
        return { right: box.right, height: box.height, cell: n.getBoundingClientRect().toJSON(), grid: getComputedStyle(n.parentElement).gridTemplateColumns };
      }));
      assert.equal(positions.length, 3);
      assert.ok(Math.max(...positions.map(p => p.right)) - Math.min(...positions.map(p => p.right)) < 1, `amount right edges must align at ${width}px`);
      console.log(`PASS: amount alignment at ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
