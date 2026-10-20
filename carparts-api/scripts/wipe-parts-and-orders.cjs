/**
 * 全量清除商品與訂單（先備份 JSON 到 workspace，再於單一交易內刪除）。
 * 刪除順序依賴外鍵：fitments → logs → order items → orders → parts → POC。
 * 用法：node scripts/wipe-parts-and-orders.cjs --confirm
 */
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dumpTable(name, fn) {
  const rows = await fn();
  const file = path.join(__dirname, '..', '..', 'backup-parts-wipe', name + '.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rows));
  return { name, rows: rows.length, file };
}

(async () => {
  if (!process.argv.includes('--confirm')) {
    console.error('拒絕執行：需要 --confirm 旗標');
    process.exit(1);
  }

  const before = {
    parts: await prisma.part.count(),
    partCompat: await prisma.partCompatibility.count(),
    partsOnCategories: await prisma.partsOnCategories.count(),
    caliperFitments: await prisma.partCaliperFitment.count(),
    modFitments: await prisma.partModificationFitment.count(),
    aiPartDrafts: await prisma.aiPartDraft.count(),
    inventoryLogs: await prisma.inventoryLog.count(),
    consumerOrderItems: await prisma.consumerOrderItem.count(),
    consumerOrders: await prisma.consumerOrder.count(),
  };
  console.log('BEFORE:', JSON.stringify(before));

  const backups = [];
  backups.push(await dumpTable('parts', () => prisma.part.findMany()));
  backups.push(await dumpTable('part_compatibilities', () => prisma.partCompatibility.findMany()));
  backups.push(await dumpTable('parts_on_categories', () => prisma.partsOnCategories.findMany()));
  backups.push(await dumpTable('part_caliper_fitments', () => prisma.partCaliperFitment.findMany()));
  backups.push(await dumpTable('part_modification_fitments', () => prisma.partModificationFitment.findMany()));
  backups.push(await dumpTable('ai_part_drafts', () => prisma.aiPartDraft.findMany()));
  backups.push(await dumpTable('inventory_logs', () => prisma.inventoryLog.findMany()));
  backups.push(await dumpTable('consumer_orders', () => prisma.consumerOrder.findMany()));
  backups.push(await dumpTable('consumer_order_items', () => prisma.consumerOrderItem.findMany()));
  backups.push(await dumpTable('purchase_orders', () => prisma.purchaseOrder.findMany()));
  backups.push(await dumpTable('purchase_order_items', () => prisma.purchaseOrderItem.findMany()));
  console.log('BACKUPS:', JSON.stringify(backups));

  const result = await prisma.$transaction(async tx => {
    const out = {};
    const del = async (key, model) => {
      try { out[key] = await tx[model].deleteMany({}); }
      catch (e) { if (e instanceof TypeError) { out[key] = 'model-not-present'; } else { throw e; } }
    };
    await del('partCaliperFitment', 'partCaliperFitment');
    await del('partModificationFitment', 'partModificationFitment');
    await del('aiPartDraft', 'aiPartDraft');
    await del('inventoryLog', 'inventoryLog');
    await del('consumerOrderItem', 'consumerOrderItem');
    await del('consumerOrder', 'consumerOrder');
    await del('purchaseOrderItem', 'purchaseOrderItem');
    await del('purchaseOrder', 'purchaseOrder');
    await del('partCompatibility', 'partCompatibility');
    await del('partsOnCategories', 'partsOnCategories');
    await del('part', 'part');
    return out;
  });
  console.log('DELETED:', JSON.stringify(result));

  const after = { parts: await prisma.part.count(), consumerOrders: await prisma.consumerOrder.count() };
  console.log('AFTER:', JSON.stringify(after));

  const expected = { parts: before.parts, consumerOrders: before.consumerOrders };
  if (after.parts !== 0 || after.consumerOrders !== 0) {
    console.error('驗證失敗：仍有殘留資料', JSON.stringify({ expected, after }));
    process.exit(1);
  }
  console.log('OK: all parts and orders deleted; backups in backup-parts-wipe/');
  await prisma.$disconnect();
})().catch(async e => {
  console.error('FAILED:', JSON.stringify({ type: e.name, code: e.code, message: e.message }));
  await prisma.$disconnect();
  process.exit(1);
});
