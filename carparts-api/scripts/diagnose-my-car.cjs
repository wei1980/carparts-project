// Read-only diagnostic: invoke the dashboard handler with an existing vehicle owner.
// Does not create credentials, bypass an HTTP login, or print personal data.
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const router = require('../src/routes/myCar');
const prisma = new PrismaClient();
(async () => {
  const vehicle = await prisma.vehicleProfile.findFirst({ select: { userId: true } });
  assert.ok(vehicle, 'No vehicle owner available for read-only verification');
  await prisma.endUser.findUnique({ where: { id: vehicle.userId }, select: { currentVehicleId: true } });
  const layer = router.stack.find(item => item.route?.path === '/dashboard');
  let status = 200, payload;
  const res = { status(code) { status = code; return this; }, json(data) { payload = data; return this; } };
  await layer.route.stack[0].handle({ userId: vehicle.userId }, res);
  assert.equal(status, 200, 'Dashboard handler failed');
  assert.ok(payload.vehicle, 'Expected registered vehicle');
  console.log(JSON.stringify({ status, hasVehicle: true, historyCount: payload.history.length, reminderCount: payload.reminders.length, suggestionsCount: payload.suggestions.length }));
})().catch(error => { console.error({ code: error.code, message: error.message }); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
