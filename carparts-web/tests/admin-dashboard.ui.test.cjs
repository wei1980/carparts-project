// Admin dashboard: crash was 504 Outdated Optimize Dep for the lazily loaded
// recharts chunk. Assert the page renders the full dashboard with real routes
// and degrades to a partial error when the charts module fails to load.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const stats = {
  overview: { totalUsers: 5, newUsersThisMonth: 0, totalOrders: 3, ordersThisMonth: 1, pendingAppointments: 1, todayAppointments: 0, totalGarages: 2 },
  recentOrders: [{ id: 1, order_number: 'CO-1', total_amount: 1200, status: 'PAID', created_at: '2026-09-01T00:00:00Z' }],
  monthlySales: [{ month: '2026-04', amount: 0 }, { month: '2026-09', amount: 1200 }],
  topParts: [{ name: '來令片', qty: 4 }],
};
const insights = { period_days: 30, best_sellers: [], turnover: [], overdue_preorders: [], summary: { overdue_count: 0 } };

async function withPage() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('adminToken', 'ui-repro-token');
    localStorage.setItem('adminUser', JSON.stringify({ company_name: '診斷' }));
  });
  await context.route('**/api/admin/stats/dashboard*', r => r.fulfill({ json: stats }));
  await context.route('**/api/admin/dashboard-insights*', r => r.fulfill({ json: insights }));
  await context.route('**/api/csrf-token*', r => r.fulfill({ json: { csrfToken: 'x' } }));
  return { browser, page: await context.newPage() };
}

async function assertRendered() {
  const { browser, page } = await withPage();
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 45000 });
  await page.getByText('總會員').waitFor({ timeout: 15000 });
  assert.ok(await page.getByText('📈 近 6 個月銷售趨勢').isVisible());
  assert.equal(await page.getByText('發生錯誤').count(), 0);
  await browser.close();
}

async function assertDegraded() {
  const { browser, page } = await withPage();
  await page.route('**/src/pages/admin/DashboardCharts.jsx*', r => r.abort());
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.getByText('總會員').waitFor({ timeout: 15000 });
  const degraded = await page.getByText(/元件載入失敗|無法載入數據/).count();
  assert.ok(degraded > 0, 'expected a partial error message');
  assert.equal(await page.getByText('發生錯誤', { exact: true }).count(), 0);
  await browser.close();
}

(async () => {
  let failed = false;
  for (const [name, fn] of [['renders', assertRendered], ['degrades', assertDegraded]]) {
    try { await fn(); console.log('✔', name); } catch (e) { failed = true; console.log('✖', name, String(e?.message || e).slice(0, 400)); }
  }
  process.exitCode = failed ? 1 : 0;
})();
