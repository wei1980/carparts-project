// src/routes/adminDashboardInsights.js — 管理端儀表板：熱銷排行 / 庫存週轉 / 代購逾期
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');

const prisma = new PrismaClient();
router.use(adminAuth);

// GET /api/admin/dashboard-insights — 三合一聚合（可 ?days=30）
router.get('/', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 180);
    const since = new Date(Date.now() - days * 86400000);
    const now = new Date();

    // ── 1. 熱銷排行（近 N 天，車主+車廠訂單合計）──
    const [consumerItems, garageItems] = await Promise.all([
      prisma.consumerOrderItem.findMany({
        where: { order: { created_at: { gte: since }, status: { notIn: ['CANCELLED'] } } },
        select: { part_id: true, qty: true, price_snapshot: true, sku_snapshot: true, name_snapshot: true, is_preorder: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { created_at: { gte: since }, status: { notIn: ['CANCELLED'] } } },
        select: { part_id: true, qty: true, price_snapshot: true, sku_snapshot: true, name_snapshot: true, is_preorder: true },
      }),
    ]);

    const salesMap = new Map();
    for (const it of [...consumerItems, ...garageItems]) {
      const key = it.part_id || it.sku_snapshot;
      const cur = salesMap.get(key) || {
        part_id: it.part_id, sku: it.sku_snapshot, name: it.name_snapshot,
        total_qty: 0, total_revenue: 0, preorder_qty: 0,
      };
      cur.total_qty += it.qty;
      cur.total_revenue += Number(it.price_snapshot) * it.qty;
      if (it.is_preorder) cur.preorder_qty += it.qty;
      salesMap.set(key, cur);
    }
    const bestSellers = [...salesMap.values()]
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 10);

    // 補零件現況（現名稱/庫存/價格），快照對不上的仍顯示快照資料
    const partIds = bestSellers.map((s) => s.part_id).filter(Boolean);
    const partsInfo = partIds.length
      ? await prisma.part.findMany({ where: { id: { in: partIds } }, select: { id: true, sku: true, name: true, stock_qty: true, msrp_price: true } })
      : [];
    const pInfoMap = new Map(partsInfo.map((p) => [p.id, p]));
    for (const s of bestSellers) {
      const p = s.part_id ? pInfoMap.get(s.part_id) : null;
      if (p) { s.sku = p.sku; s.name = p.name; s.current_stock = p.stock_qty; s.current_price = Number(p.msrp_price); }
    }

    // ── 2. 庫存週轉（近 N 天銷量 ÷ 現有庫存；>0 才列出）──
    // 週轉率近似 = 期間銷量 / max(現有庫存,1)；>1 代表賣得比庫存快，需補貨
    const turnover = [...salesMap.values()].map((s) => {
      const p = s.part_id ? pInfoMap.get(s.part_id) : null;
      return {
        part_id: s.part_id, sku: s.sku, name: s.name,
        sold_qty: s.total_qty,
        current_stock: p?.stock_qty ?? null,
        turnover_ratio: p ? +(s.total_qty / Math.max(p.stock_qty, 1)).toFixed(2) : null,
      };
    }).filter((t) => t.turnover_ratio != null)
      .sort((a, b) => b.turnover_ratio - a.turnover_ratio);

    // ── 3. 代購逾期警示（承諾週數已過、未取消）──
    // 到期日 = 訂單成立日 + promised_weeks 週
    const overdue = [];
    const scanOverdue = (items, orderMeta) => {
      for (const it of items) {
        if (!it.is_preorder || !it.promised_weeks) continue;
        const meta = orderMeta.get(it.order_id);
        if (!meta || meta.status === 'CANCELLED') continue;
        const dueAt = new Date(meta.created_at.getTime() + it.promised_weeks * 7 * 86400000);
        if (dueAt < now) {
          overdue.push({
            source: meta.source, order_id: it.order_id, order_no: meta.order_no,
            customer_name: meta.customer_name, part_id: it.part_id,
            sku: it.sku_snapshot, name: it.name_snapshot, qty: it.qty,
            promised_weeks: it.promised_weeks,
            ordered_at: meta.created_at, due_at: dueAt,
            days_overdue: Math.floor((now - dueAt) / 86400000),
          });
        }
      }
    };

    const consumerOrders = await prisma.consumerOrder.findMany({
      where: { created_at: { gte: new Date(now.getTime() - 365 * 86400000) } },
      select: { id: true, order_number: true, status: true, created_at: true, user: { select: { name: true, phone: true } } },
    });
    const cMeta = new Map(consumerOrders.map((o) => [o.id, {
      source: 'CONSUMER', order_no: o.order_number, status: o.status, created_at: o.created_at,
      customer_name: o.user?.name || o.user?.phone || '',
    }]));
    const consumerAllItems = await prisma.consumerOrderItem.findMany({
      where: { is_preorder: true, order_id: { in: [...cMeta.keys()] } },
      select: { order_id: true, part_id: true, sku_snapshot: true, name_snapshot: true, qty: true, is_preorder: true, promised_weeks: true },
    });

    const garageOrders = await prisma.order.findMany({
      where: { created_at: { gte: new Date(now.getTime() - 365 * 86400000) } },
      select: { id: true, order_number: true, status: true, created_at: true, workshop: { select: { company_name: true, garage_name: true } } },
    });
    const gMeta = new Map(garageOrders.map((o) => [o.id, {
      source: 'GARAGE', order_no: o.order_number, status: o.status, created_at: o.created_at,
      customer_name: o.workshop?.garage_name || o.workshop?.company_name || '',
    }]));
    const garageAllItems = await prisma.orderItem.findMany({
      where: { is_preorder: true, order_id: { in: [...gMeta.keys()] } },
      select: { order_id: true, part_id: true, sku_snapshot: true, name_snapshot: true, qty: true, is_preorder: true, promised_weeks: true },
    });

    scanOverdue(consumerAllItems, cMeta);
    scanOverdue(garageAllItems, gMeta);
    overdue.sort((a, b) => b.days_overdue - a.days_overdue);

    res.json({
      period_days: days,
      best_sellers: bestSellers,
      turnover: turnover.slice(0, 20),
      overdue_preorders: overdue.slice(0, 50),
      summary: {
        best_seller_count: bestSellers.length,
        low_turnover_count: turnover.filter((t) => t.turnover_ratio >= 1).length,
        overdue_count: overdue.length,
        worst_overdue_days: overdue[0]?.days_overdue || 0,
      },
    });
  } catch (error) {
    console.error('儀表板聚合查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
