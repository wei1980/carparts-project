// src/services/stockAlertService.js — 🆕 低庫存警示（可開關，LINE 推播管理員）
const { PrismaClient } = require('@prisma/client');
const { pushMessage } = require('./lineService');

const prisma = new PrismaClient();

// 預設門檻與間隔
const DEFAULTS = {
  lowStockEnabled: false,   // 總開關（預設關閉）
  lowStockThreshold: 5,     // 庫存 ≤ 此值視為低庫存
  lowStockIntervalHours: 24, // 兩次警示最小間隔（小時），避免重複轟炸
};

let lastAlertAt = null; // in-memory 節流（重啟後重新計時）

/**
 * 讀取系統設定中的低庫存警示設定（與 adminSettings 同用 ADMIN workshop.garage_slots.system）
 */
async function getStockSettings() {
  const admin = await prisma.workshop.findFirst({
    where: { role: 'ADMIN' },
    select: { garage_slots: true, line_id: true },
  });
  const system = admin?.garage_slots?.system || {};
  return {
    ...DEFAULTS,
    ...Object.fromEntries(Object.entries(DEFAULTS).filter(([k]) => k in system).map(([k]) => [k, system[k]])),
    adminLineId: admin?.line_id || null,
  };
}

/**
 * 檢查低庫存並推播給管理員。回傳 { checked, alerted, count }
 * @param {{force?: boolean}} opts force=true 忽略節流（手動觸發用）
 */
async function checkLowStock(opts = {}) {
  const cfg = await getStockSettings();
  if (!cfg.lowStockEnabled) return { checked: false, alerted: false, reason: 'disabled', count: 0 };

  // 節流
  if (!opts.force && lastAlertAt) {
    const elapsedH = (Date.now() - lastAlertAt.getTime()) / 1000 / 3600;
    if (elapsedH < cfg.lowStockIntervalHours) {
      return { checked: true, alerted: false, reason: 'throttled', nextInHours: +(cfg.lowStockIntervalHours - elapsedH).toFixed(1), count: 0 };
    }
  }

  const threshold = parseInt(cfg.lowStockThreshold) || DEFAULTS.lowStockThreshold;
  if (!(threshold >= 0)) return { checked: false, alerted: false, reason: 'invalid_threshold', count: 0 };

  const lows = await prisma.part.findMany({
    where: { stock_qty: { lte: threshold }, is_active: true },
    select: { sku: true, name: true, stock_qty: true, brand: true },
    orderBy: { stock_qty: 'asc' },
    take: 20,
  });

  if (lows.length === 0) return { checked: true, alerted: false, reason: 'no_low_stock', count: 0 };

  // 推播給管理員（需綁 LINE 且總推播開關未關）
  if (cfg.adminLineId) {
    const lines = [
      '⚠️ 低庫存警示',
      `━━━━━━━━━━━━━━`,
      `以下商品庫存 ≤ ${threshold}：`,
      ...lows.map(p => `· ${p.name}（${p.sku}）剩 ${p.stock_qty}`),
      lows.length >= 20 ? '…僅顯示前 20 筆' : '',
      `━━━━━━━━━━━━━━`,
      `請至管理後台補貨。此警示每 ${cfg.lowStockIntervalHours} 小時最多提醒一次。`,
    ].filter(Boolean);
    await pushMessage(cfg.adminLineId, lines.join('\n'));
    lastAlertAt = new Date();
    return { checked: true, alerted: true, count: lows.length };
  }

  return { checked: true, alerted: false, reason: 'admin_no_line', count: lows.length };
}

module.exports = { checkLowStock, getStockSettings, DEFAULTS };
