// Read-only route diagnostics. No authentication tokens or row data printed.
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
(async () => {
 const clients = [];
 let failed = false;
 try {
  for (const [moduleName, routePath] of [['adminGarages', '/']]) {
   const filename = require.resolve('../src/routes/' + moduleName);
   const realRequire = createRequire(filename);
   const errors = [];
   const context = { module: { exports: {} }, console: { error: (...args) => {
     const error = args.find(a => a instanceof Error || a?.message);
     errors.push({ type: error?.name, code: error?.code, unknownField: error?.message?.match(/Unknown (?:field|argument) `([^`]+)`/)?.[1] });
   } }, require(name) {
    if (name === '@prisma/client') return { PrismaClient: class { constructor() { const p = new PrismaClient(); clients.push(p); return p; } } };
    if (name === '../middleware/adminAuth') return (req, res, next) => next();
    return realRequire(name);
   }, Date, Map, Number, Math, parseInt };
   vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
   const route = context.module.exports.stack.find(s => s.route?.path === routePath).route;
   let status = 200;
   await route.stack.at(-1).handle({ query: { days: '30' } }, {
    status(code) { status = code; return this; },
    json(body) { console.log(JSON.stringify({ route: moduleName, status, isArray: Array.isArray(body), count: Array.isArray(body) ? body.length : null, garageCount: Array.isArray(body) ? body.filter(w => w.is_garage).length : null, errors })); },
   });
   if (status !== 200) failed = true;
  }
 } finally { await Promise.all(clients.map(p => p.$disconnect())); }
 process.exitCode = failed ? 1 : 0;
})().catch(e => { console.log(JSON.stringify({ type: e.name, code: e.code })); process.exitCode = 1; });
