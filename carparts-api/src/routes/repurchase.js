// src/routes/repurchase.js — 車主端：回購專區（工單零件 + 歷史訂單彙整）
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/authMiddleware');

const prisma = new PrismaClient();
router.use(auth);

// GET /api/repurchase — 彙整可回購商品
// 來源1: 工單 ServiceRecordItem（kind=PART 且有 part_sku）
// 來源2: 歷史 ConsumerOrderItem
// 每項帶出平台 Part 現價 / 庫存 / 是否仍在售
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // ---- 來源 1：工單換過的零件（依最近完工時間排序）----
    const serviceItems = await prisma.serviceRecordItem.findMany({
      where: { kind: 'PART', part_sku: { not: null }, record: { user_id: req.userId } },
      include: {
        record: {
          select: {
            id: true, completed_at: true, vehicle_id: true,
            vehicle: { select: { make: true, model: true, licensePlate: true } },
          },
        },
      },
      orderBy: { record: { completed_at: 'desc' } },
      take: 200,
    });

    // ---- 來源 2：歷史訂單商品（只算已付款後的狀態）----
    const orderItems = await prisma.consumerOrderItem.findMany({
      where: { order: { userId: req.userId, status: { in: ['PAID', 'SHIPPED', 'COMPLETED', 'PENDING_SHIPMENT'] } } },
      include: {
        order: { select: { id: true, order_number: true, created_at: true } },
        part: { select: { sku: true } },
      },
      orderBy: { order: { created_at: 'desc' } },
      take: 200,
    });

    // ---- 合併去重（同 part 取最近一次）----
    const bySku = new Map();
    for (const it of serviceItems) {
      if (bySku.has(it.part_sku)) continue;
      bySku.set(it.part_sku, {
        sku: it.part_sku,
        name: it.name,
        brand: it.part_brand || null,
        last_source: 'SERVICE',
        last_date: it.record.completed_at || it.record.created_at,
        context: `${it.record.vehicle?.make || ''} ${it.record.vehicle?.model || ''}（${it.record.vehicle?.licensePlate || '未設車牌'}）保養更換`,
        qty_last: it.quantity,
      });
    }
    for (const it of orderItems) {
      const sku = it.sku_snapshot || it.part?.sku;
      if (!sku || bySku.has(sku)) continue;
      bySku.set(sku, {
        sku,
        name: it.name_snapshot,
        brand: null,
        last_source: 'ORDER',
        last_date: it.order.created_at,
        context: `訂單 ${it.order.order_number} 購買`,
        qty_last: it.qty,
      });
    }

    // ---- 對應平台 Part 帶現價 ----
    const skus = [...bySku.keys()];
    const parts = await prisma.part.findMany({
      where: { sku: { in: skus } },
      select: {
        id: true, sku: true, brand: true, name: true,
        msrp_price: true, wholesale_price: true, stock_qty: true, is_active: true,
        image_url: true,
      },
    });
    const partBySku = new Map(parts.map((p) => [p.sku, p]));

    const items = skus.map((sku) => {
      const base = bySku.get(sku);
      const p = partBySku.get(sku);
      return {
        ...base,
        available: Boolean(p && p.is_active),
        part: p ? {
          id: p.id, sku: p.sku, brand: p.brand, name: p.name,
          price: Number(p.msrp_price), stock: p.stock_qty, image_url: p.image_url,
        } : null,
      };
    });

    // 在售優先、再依最近購買/更換日排序；下架的排最後仍顯示（標 unavailable）
    items.sort((a, b) =>
      (b.available - a.available) || (new Date(b.last_date) - new Date(a.last_date))
    );

    res.json({ items: items.slice(0, limit), total: items.length });
  } catch (error) {
    console.error('回購專區查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
