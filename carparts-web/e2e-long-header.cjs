
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const p = await b.newPage();
    const fake = 'e.' + Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + 'x'.repeat(190);
    const result = await p.evaluate(async (token) => {
      const r = await fetch('/api/auth/profile', { headers: { Authorization: 'Bearer ' + token, 'X-Request-Id': 'e2e-long-header' } });
      return { status: r.status, body: (await r.text()).slice(0, 160) };
    }, fake);
    console.log(JSON.stringify(result));
  } finally { await b.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
