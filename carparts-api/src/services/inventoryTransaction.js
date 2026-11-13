/**
 * Inventory Transaction Service
 * 單一 transaction 內完成：stockQty 扣減/增加 + InventoryLog 寫入
 * 支援冪等鍵、樂觀鎖、並發庫存不足處理
 */

const prisma = require('../lib/prisma');

/** InventoryLog 類型枚舉 - 對應前端顯示與稽核追蹤 */
const InventoryLogType = {
  CONSUMER_ORDER: 'CONSUMER_ORDER',      // 消費者下單扣減
  CONSUMER_ORDER_CANCEL: 'CONSUMER_ORDER_CANCEL', // 取消訂單回補
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',  // 管理員手動調整
  NEW_STOCK: 'NEW_STOCK',                // 新增庫存入帳
  SHIPMENT_RECEIVED: 'SHIPMENT_RECEIVED', // 入庫單入帳
  SHIPMENT_RETURN: 'SHIPMENT_RETURN',     // 退貨入庫
  WORK_ORDER_USAGE: 'WORK_ORDER_USAGE',   // 工單領料
  INVENTORY_COUNT: 'INVENTORY_COUNT',     // 盤點調整
  PREORDER_DEPOSIT: 'PREORDER_DEPOSIT',   // 代購轉現貨
};

/**
 * 扣減庫存並寫入 InventoryLog（單一 transaction）
 * @param {Object} tx - Prisma transaction client
 * @param {number} partId - 商品 ID
 * @param {number} qty - 扣減數量 (正數)
 * @param {string} type - InventoryLogType
 * @param {string} note - 備註
 * @param {Object} options - 額外選項
 * @returns {Promise<{success: boolean, remaining: number, logId: number}>}
 */
async function decrementStock(tx, partId, qty, type, note, options = {}) {
  if (!Number.isInteger(partId) || partId <= 0) {
    throw Object.assign(new Error('商品 ID 格式錯誤'), { code: 'INVALID_PART_ID' });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    throw Object.assign(new Error('扣減數量必須為正整數'), { code: 'INVALID_QTY' });
  }
  if (!Object.values(InventoryLogType).includes(type)) {
    throw Object.assign(new Error('無效的庫存異動類型'), { code: 'INVALID_LOG_TYPE' });
  }

  // 使用 updateMany + stock_qty >= qty 樂觀鎖，避免 SELECT FOR UPDATE 的行級鎖爭用
  const updateResult = await tx.part.updateMany({
    where: {
      id: partId,
      stock_qty: { gte: qty },
      is_active: true,
    },
    data: {
      stock_qty: { decrement: qty },
      sales_count: { increment: qty },
    },
  });

  if (updateResult.count !== 1) {
    // 自備庫存不足 → 改用「自備庫存＋總代理庫存」合計扣減（先扣自備，剩餘扣代理）
    const part = await tx.part.findUnique({
      where: { id: partId },
      select: { id: true, name: true, stock_qty: true, distributor_stock_qty: true, is_active: true },
    });
    if (!part) {
      throw Object.assign(new Error('商品不存在'), { code: 'PART_NOT_FOUND' });
    }
    if (!part.is_active) {
      throw Object.assign(new Error(`商品 ${part.name} 已下架`), { code: 'PART_INACTIVE' });
    }
    const available = part.stock_qty + (part.distributor_stock_qty || 0);
    if (available < qty) {
      throw Object.assign(new Error(`庫存不足，目前剩餘 ${available}`), { code: 'INSUFFICIENT_STOCK' });
    }
    const fromOwn = Math.min(part.stock_qty, qty);
    const fromDistributor = qty - fromOwn;
    // 以目前庫存值做樂觀鎖，避免並發超賣
    const mixedResult = await tx.part.updateMany({
      where: {
        id: partId,
        stock_qty: part.stock_qty,
        distributor_stock_qty: part.distributor_stock_qty || 0,
      },
      data: {
        stock_qty: { decrement: fromOwn },
        distributor_stock_qty: { decrement: fromDistributor },
        sales_count: { increment: qty },
      },
    });
    if (mixedResult.count !== 1) {
      throw Object.assign(new Error('庫存不足（並發變動，請重試）'), { code: 'INSUFFICIENT_STOCK' });
    }
    const remaining = available - qty;
    const log = await tx.inventoryLog.create({
      data: {
        part_id: partId,
        qty_change: -qty,
        qty_after: remaining,
        type,
        note: fromDistributor > 0 ? `${note}（含總代理庫存）` : note,
      },
    });
    return { success: true, remaining, logId: log.id };
  }

  // 取得扣減後庫存
  const updatedPart = await tx.part.findUnique({
    where: { id: partId },
    select: { stock_qty: true },
  });

  // 寫入 InventoryLog
  const log = await tx.inventoryLog.create({
    data: {
      part_id: partId,
      qty_change: -qty,
      qty_after: updatedPart.stock_qty,
      type,
      note,
    },
  });

  return { success: true, remaining: updatedPart.stock_qty, logId: log.id };
}

/**
 * 增加庫存並寫入 InventoryLog（單一 transaction）
 */
async function incrementStock(tx, partId, qty, type, note, options = {}) {
  if (!Number.isInteger(partId) || partId <= 0) {
    throw Object.assign(new Error('商品 ID 格式錯誤'), { code: 'INVALID_PART_ID' });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    throw Object.assign(new Error('增加數量必須為正整數'), { code: 'INVALID_QTY' });
  }
  if (!Object.values(InventoryLogType).includes(type)) {
    throw Object.assign(new Error('無效的庫存異動類型'), { code: 'INVALID_LOG_TYPE' });
  }

  const updated = await tx.part.update({
    where: { id: partId, is_active: true },
    data: {
      stock_qty: { increment: qty },
    },
    select: { stock_qty: true },
  });

  const log = await tx.inventoryLog.create({
    data: {
      part_id: partId,
      qty_change: qty,
      qty_after: updated.stock_qty,
      type,
      note,
    },
  });

  return { success: true, remaining: updated.stock_qty, logId: log.id };
}

/**
 * 批次扣減庫存（多商品單一 transaction）
 * @param {Object} tx - Prisma transaction client
 * @param {Array<{partId: number, qty: number}>} items
 * @param {string} type - InventoryLogType
 * @param {string} baseNote - 基礎備註，會加上 item 索引
 * @returns {Promise<{success: boolean, results: Array, logs: Array}>}
 */
async function batchDecrementStock(tx, items, type, baseNote) {
  const results = [];
  const logs = [];

  for (let i = 0; i < items.length; i++) {
    const { partId, qty } = items[i];
    const note = `${baseNote} (item ${i + 1})`;
    const result = await decrementStock(tx, partId, qty, type, note);
    results.push({ partId, qty, remaining: result.remaining });
    logs.push({ partId, logId: result.logId });
  }

  return { success: true, results, logs };
}

/**
 * 批次增加庫存
 */
async function batchIncrementStock(tx, items, type, baseNote) {
  const results = [];
  const logs = [];

  for (let i = 0; i < items.length; i++) {
    const { partId, qty } = items[i];
    const note = `${baseNote} (item ${i + 1})`;
    const result = await incrementStock(tx, partId, qty, type, note);
    results.push({ partId, qty, remaining: result.remaining });
    logs.push({ partId, logId: result.logId });
  }

  return { success: true, results, logs };
}

/**
 * 庫存調整（可正可負，自動判斷增減）
 * @param {Object} tx
 * @param {number} partId
 * @param {number} qtyChange - 正數=增加，負數=扣減
 * @param {string} type
 * @param {string} note
 */
async function adjustStock(tx, partId, qtyChange, type, note) {
  if (qtyChange > 0) {
    return incrementStock(tx, partId, qtyChange, type, note);
  } else if (qtyChange < 0) {
    return decrementStock(tx, partId, Math.abs(qtyChange), type, note);
  }
  return { success: true, remaining: null, logId: null }; // 無變化
}

/**
 * 檢查庫存可用性（不扣減，僅供預檢）
 * @param {Array<{partId: number, qty: number}>} items
 * @returns {Promise<{sufficient: boolean, insufficient: Array}>}
 */
async function checkAvailability(items) {
  const partIds = items.map(item => item.partId);
  const parts = await prisma.part.findMany({
    where: { id: { in: partIds }, is_active: true },
    select: { id: true, name: true, stock_qty: true },
  });

  const partMap = Object.fromEntries(parts.map(p => [p.id, p]));
  const insufficient = [];

  for (const item of items) {
    const part = partMap[item.partId];
    if (!part) {
      insufficient.push({ partId: item.partId, reason: '商品不存在' });
      continue;
    }
    if (part.stock_qty < item.qty) {
      insufficient.push({
        partId: item.partId,
        partName: part.name,
        available: part.stock_qty,
        required: item.qty,
      });
    }
  }

  return {
    sufficient: insufficient.length === 0,
    insufficient,
  };
}

/**
 * 建立帶冪等鍵的訂單 transaction
 * 統一處理：order + orderItems + stock decrement + inventoryLog
 * @param {Object} params
 * @returns {Promise<Object>} 建立的 order
 */
async function createOrderWithInventory(params) {
  const {
    orderData,
    items, // [{ partId, qty, price, skuSnapshot, nameSnapshot, isPreorder, promisedWeeks, promisedWeeksMin, promisedWeeksMax }]
    idempotencyKey,
    inventoryType = InventoryLogType.CONSUMER_ORDER,
    baseNote = 'consumer_order',
  } = params;

  // 冪等性檢查
  if (idempotencyKey) {
    const existing = await prisma.consumerOrder.findFirst({
      where: { idempotency_key: idempotencyKey },
      select: { id: true, order_number: true },
    });
    if (existing) {
      return { idempotent: true, order: existing };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. 建立訂單主檔
    const order = await tx.consumerOrder.create({
      data: {
        ...orderData,
        idempotency_key: idempotencyKey || null,
      },
    });

    // 2. 建立訂單明細
    const orderItems = [];
    for (const item of items) {
      const orderItem = await tx.consumerOrderItem.create({
        data: {
          order_id: order.id,
          part_id: item.partId,
          qty: item.qty,
          sku_snapshot: item.skuSnapshot,
          name_snapshot: item.nameSnapshot,
          price_snapshot: item.price,
          is_preorder: item.isPreorder || false,
          promised_weeks: item.promisedWeeks || 0,
          promised_weeks_min: item.promisedWeeksMin || null,
          promised_weeks_max: item.promisedWeeksMax || null,
        },
      });
      orderItems.push(orderItem);
    }

    // 3. 扣減庫存 + 寫入 InventoryLog（僅非代購/現貨項目）
    const stockItems = items
      .filter(item => !item.isPreorder)
      .map(item => ({ partId: item.partId, qty: item.qty }));

    if (stockItems.length > 0) {
      await batchDecrementStock(tx, stockItems, InventoryLogType.CONSUMER_ORDER, `order:${order.order_number}`);
    }

    return { order, orderItems };
  }, {
    timeout: 10000, // 10 秒 transaction timeout
  });

  return result;
}

module.exports = {
  InventoryLogType,
  decrementStock,
  incrementStock,
  batchDecrementStock,
  batchIncrementStock,
  adjustStock,
  checkAvailability,
  createOrderWithInventory,
};