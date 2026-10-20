// Read-only actual handler check; no credentials or transaction details printed.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const router = require('../src/routes/adminBank');
const workbook = process.env.BANK_EXCEL_PATH || 'C:/carparts/訂單管理.xlsm';
(async () => {
  const before = fs.statSync(workbook).mtimeMs;
  const route = router.stack.find(s => [].concat(s.route?.path || []).includes('/bank/transactions')).route;
  let status = 200;
  let result;
  await route.stack.at(-1).handle({ query: {} }, {
    status(code) { status = code; return this; },
    json(body) { result = body; },
  });
  const summary = { status, transactions: result?.transactions?.length, pendingOrders: result?.pending_orders?.length, workbookUnchanged: fs.statSync(workbook).mtimeMs === before };
  console.log(JSON.stringify(summary));
  assert.equal(status, 200);
  assert.ok(Array.isArray(result.transactions));
  assert.ok(Array.isArray(result.pending_orders));
  assert.equal(summary.workbookUnchanged, true);
  process.exit(0);
})().catch(e => { console.error(JSON.stringify({ failed: true, type: e.name, code: e.code })); process.exit(1); });
