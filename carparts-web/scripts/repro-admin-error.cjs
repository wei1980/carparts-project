// Reproduce /admin crash: authenticated render with fixture API responses.
// Captures pageerror + console.error, prints the React component stack.
const { chromium } = require('playwright');

const stats = {
  overview: { totalUsers: 5, newUsersThisMonth: 0, totalOrders: 3, ordersThisMonth: 1, pendingAppointments: 1, todayAppointments: 0, totalGarages: 2 },
  recentOrders: [{ id: 1, order_number: 'CO-1', total_amount: 1200, status: 'PAID', created_at: '2026-09-01T00:00:00Z' }],
  monthlySales: [{ month: '2026-04', amount: 0 }, { month: '2026-09', amount: 1200 }],
  topParts: [{ name: '來令片', qty: 4 }],
};
const insights = {
  period_days: 30,
  best_sellers: [{ part_id: 1, sku: 'A1', name: '來令片', total_qty: 4, total_revenue: 4800 }],
  turnover: [{ part_id: 1, sku: 'A1', name: '來令片', sold_qty: 4, current_stock: 9, turnover_ratio: 0.44 }],
  overdue_preorders: [],
  summary: { best_seller_count: 1, low_turnover_count: 0, overdue_count: 0, worst_overdue_days: 0 },
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('adminToken', 'ui-repro-token');
    localStorage.setItem('adminUser', JSON.stringify({ company_name: '診斷' }));
  });
  await context.route('**/api/admin/stats/dashboard*', r => r.fulfill({ json: stats }));
  await context.route('**/api/admin/dashboard-insights*', r => r.fulfill({ json: insights }));
  await context.route('**/api/csrf-token*', r => r.fulfill({ json: { csrfToken: 'x' } }));

  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', e => failures.push({ kind: 'pageerror', message: String(e?.message || e), stack: String(e?.stack || '').split('\n').slice(0, 6).join('\n') }));
  page.on('console', m => { if (m.type() === 'error') failures.push({ kind: 'console.error', message: m.text().slice(0, 500) }); });
  page.on('requestfailed', r => failures.push({ kind: 'requestfailed', message: `${r.url()} ${r.failure()?.errorText}` }));

  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 45000 }).catch(e => failures.push({ kind: 'goto', message: String(e?.message || e) }));
  await page.waitForTimeout(2500);

  const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 300);
  console.log(JSON.stringify({ url: page.url(), body, failures }, null, 1));
  await browser.close();
})();
