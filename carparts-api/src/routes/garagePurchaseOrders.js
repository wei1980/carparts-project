// src/routes/garagePurchaseOrders.js
// 🆕 B2B 採購單（車廠向平台進貨）— 真實化原本的 alert() 假按鈕
const express = require('express');
const router = express.Router();
const garageAuth = require('../middleware/garageAuth');
const { notifyOrderUpdate } = require('../services/lineService');
const { notifyAdmin } = require('../services/notifyService');

const prisma = require('../lib/prisma');
router.use(garageAuth);

// 🔁 GET /api/garage/purchase-orders/recent-parts — 該車廠最常採購的零件（回購快捷列用）
router.get('/recent-parts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);
    // schema 沒有 PurchaseOrderItem.purchase_order 關聯，先取本廠採購單再取明細
    const orders = await prisma.purchaseOrder.findMany({
      where: { workshop_id: req.workshopId, status: { not: 'CANCELLED' } },
      select: { id: true },
    });
    const orderIds = orders.map(o => o.id);
    const items = orderIds.length
      ? await prisma.purchaseOrderItem.findMany({
          where: { purchase_order_id: { in: orderIds } },
          select: {
            part_id: true, name_snapshot: true, brand_snapshot: true,
            price_snapshot: true, sku_snapshot: true, qty: true,
          },
        })
      : [];
    const agg = new Map();
    for (const it of items) {
      const a = agg.get(it.part_id) || { ...it, totalQty: 0 };
      a.totalQty += it.qty;
      agg.set(it.part_id, a);
    }
    const top = [...agg.values()]
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, limit);

    // 補當下價格與上架狀態（價格以現價為準；下架商品標記）
    const ids = top.map(t => t.part_id);
    const parts = await prisma.part.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, wholesale_price: true, msrp_price: true, stock_qty: true, image_url: true, is_active: true },
    });
    const pMap = Object.fromEntries(parts.map(p => [p.id, p]));

    res.json({
      items: top.map(t => {
        const p = pMap[t.part_id] || {};
        return {
          part_id: t.part_id,
          name: p.name || t.name_snapshot,
          brand: t.brand_snapshot,
          price: Number(p.wholesale_price ?? t.price_snapshot ?? 0),
          image_url: p.image_url || null,
          stock_qty: p.stock_qty || 0,
          is_active: p.is_active !== false,
          total_qty: t.totalQty,
        };
      }),
    });
  } catch (error) {
    console.error('載入最近採購失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// 產生採購單號：PO + 日期 + 4 位流水
// ⚠️ 原本用 count+1 產生續號：兩個車廠同時送出會拿到同一個號，
//    po_number 是 @unique → 其中一筆 create 拋 P2002 → 整張採購單 500。
//    改為時間毫秒後 6 位 + 3 位隨機，並在 create 處做碰撞重試。
function generatePoNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uniq = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  return `PO${dateStr}-${uniq}`;
}

// POST /api/garage/purchase-orders — 建立採購單（送出）
router.post('/', async (req, res) => {
  try {
    const { items, note, contact_name, contact_phone, shipping_address } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '採購項目為空' });
    }

    // 查詢零件（以批發價計價）
    const partIds = items.map(i => i.part_id);
    const parts = await prisma.part.findMany({ where: { id: { in: partIds }, is_active: true } });
    if (parts.length !== new Set(partIds).size) {
      return res.status(400).json({ error: '部分商品不存在或已下架' });
    }
    const partMap = Object.fromEntries(parts.map(p => [p.id, p]));

    const orderItems = [];
    let total = 0;
    for (const item of items) {
      const part = partMap[item.part_id];
      const qty = Math.max(1, parseInt(item.qty) || 1);
      const price = Number(part.wholesale_price || part.msrp_price || 0);
      total += price * qty;
      orderItems.push({
        part_id: part.id,
        sku_snapshot: part.sku,
        name_snapshot: part.name,
        brand_snapshot: part.brand,
        price_snapshot: price,
        qty,
        is_preorder: ((part.stock_qty || 0) + (part.distributor_stock_qty || 0)) < qty, // 可售庫存不足 → 代購
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      // 扣庫存（現貨項目）；代購項目不扣。現貨扣減：先扣自備庫存，不足扣總代理庫存
      for (const item of orderItems) {
        if (item.is_preorder) continue;
        // ⚠️ 原本 findUnique → update 是 read-then-write，沒有樂觀鎖：
        //    兩張採購單同時扣同一個零件會都通過「庫存檢查」→ 庫存變負（超賣）。
        //    改用 updateMany + 目前值比對（count===1 才算成功）。
        const gp = await tx.part.findUnique({
          where: { id: item.part_id },
          select: { stock_qty: true, distributor_stock_qty: true },
        });
        if (!gp) {
          throw Object.assign(new Error('商品不存在'), { code: 'PART_NOT_FOUND' });
        }
        const fromOwn = Math.min(gp.stock_qty || 0, item.qty);
        const fromDist = item.qty - fromOwn;
        const deducted = await tx.part.updateMany({
          where: {
            id: item.part_id,
            stock_qty: gp.stock_qty || 0,
            distributor_stock_qty: gp.distributor_stock_qty || 0,
          },
          data: {
            stock_qty: { decrement: fromOwn },
            distributor_stock_qty: { decrement: fromDist },
          },
        });
        if (deducted.count !== 1) {
          throw Object.assign(
            new Error(`庫存已被其他訂單變動，請重新送出（${item.part_id}）`),
            { code: 'STOCK_RACE' },
          );
        }
      }

      // po_number 是 @unique：即使改成毫秒+隨機，仍保留 3 次碰撞重試
      let created = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          created = await tx.purchaseOrder.create({
            data: {
              po_number: attempt === 0
                ? generatePoNumber()
                : `${generatePoNumber()}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
              workshop_id: req.workshopId,
              status: 'SUBMITTED',
              total_amount: total,
              note: note || null,
              contact_name: contact_name || null,
              contact_phone: contact_phone || null,
              shipping_address: shipping_address || null,
            },
          });
          break;
        } catch (e) {
          if (e?.code === 'P2002' && attempt < 2) continue;
          throw e;
        }
      }
      if (!created) {
        throw Object.assign(new Error('無法產生採購單號'), { code: 'PO_NUMBER_GENERATION_FAILED' });
      }

      const createdItems = [];
      for (const it of orderItems) {
        createdItems.push(await tx.purchaseOrderItem.create({
          data: { ...it, purchase_order_id: created.id },
        }));
      }
      // 維持原本回傳形狀（含 items）
      return { ...created, items: createdItems };
    });

    // 🔔 通知平台管理者（通道由後端設定：line/telegram/both/off；失敗不擋下單流程）
    try {
      const ws = await prisma.workshop.findUnique({
        where: { id: req.workshopId },
        select: { garage_name: true, company_name: true, phone: true },
      });
      const shopName = ws?.garage_name || ws?.company_name || `車廠 #${req.workshopId}`;
      const itemCount = orderItems.reduce((s, i) => s + i.qty, 0);
      const itemList = orderItems.slice(0, 10).map(i =>
        `・${i.name_snapshot} ×${i.qty}${i.is_preorder ? '（代購）' : ''}`).join('\n');
      const moreLine = orderItems.length > 10 ? `\n…等共 ${orderItems.length} 項` : '';
      const msg = [
        `🛒 車廠採購單通知`,
        `━━━━━━━━━━━━━━`,
        `🏪 車廠：${shopName}`,
        `📄 單號：${order.po_number}`,
        `💰 金額：NT$ ${Number(order.total_amount).toLocaleString()}（${itemCount} 件）`,
        `📦 明細：`,
        `${itemList}${moreLine}`,
        order.note ? `📝 備註：${order.note}` : '',
        `📊 狀態：待平台確認`,
      ].filter(Boolean).join('\n');
      await notifyAdmin(msg, { eventKey: 'notifyOnPoCreated' });
    } catch (err) {
      console.error('採購單通知發送失敗:', err.message);
    }

    res.status(201).json({
      message: '採購單已送出，等待平台確認',
      po_number: order.po_number,
      id: order.id,
      status: order.status,
      total_amount: Number(order.total_amount),
      preorder_items: orderItems.filter(i => i.is_preorder).length,
    });
  } catch (error) {
    console.error('建立採購單失敗:', error);
    if (error.code === 'STOCK_RACE') {
      return res.status(409).json({ error: '庫存剛剛被其他訂單變動，請重新送出' });
    }
    if (error.code === 'PO_NUMBER_GENERATION_FAILED') {
      return res.status(503).json({ error: '系統繁忙，請再試一次' });
    }
    if (error.code === 'PART_NOT_FOUND') {
      return res.status(409).json({ error: '部分商品已下架' });
    }
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/garage/purchase-orders — 我的採購單列表
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { workshop_id: req.workshopId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where: { workshop_id: req.workshopId } }),
    ]);

    // ⚠️ PurchaseOrder 沒有 items relation（schema 只有純 purchase_order_id），
    //    include: { items: true } 會讓整個端點 500。改批次抓取後併入。
    const orderIds = orders.map((o) => o.id);
    const items = orderIds.length
      ? await prisma.purchaseOrderItem.findMany({
          where: { purchase_order_id: { in: orderIds } },
          orderBy: { id: 'asc' },
        })
      : [];
    const itemsByOrder = new Map();
    for (const it of items) {
      if (!itemsByOrder.has(it.purchase_order_id)) itemsByOrder.set(it.purchase_order_id, []);
      itemsByOrder.get(it.purchase_order_id).push(it);
    }
    for (const o of orders) o.items = itemsByOrder.get(o.id) || [];

    res.json({
      orders,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  } catch (error) {
    console.error('查詢採購單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/purchase-orders/:id/cancel — 車廠取消（SUBMITTED / CONFIRMED 可取消）
router.patch('/:id/cancel', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const reason = req.body?.reason || '';

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, workshop_id: req.workshopId },
    });
    if (!order) return res.status(404).json({ error: '採購單不存在' });
    // 批次抓明細（PurchaseOrder 無 items relation）
    order.items = await prisma.purchaseOrderItem.findMany({
      where: { purchase_order_id: order.id },
      orderBy: { id: 'asc' },
    });

    if (!['SUBMITTED', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ error: `目前狀態（${order.status}）無法取消` });
    }

    await prisma.$transaction(async (tx) => {
      // 回補庫存（只有非代購、且已扣過庫存的訂單）
      if (order.status === 'SUBMITTED') {
        for (const item of order.items) {
          if (!item.is_preorder) {
            await tx.part.update({
              where: { id: item.part_id },
              data: { stock_qty: { increment: item.qty } },
            });
          }
        }
      }
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancel_reason: reason || '車廠自行取消',
        },
      });
    });

    res.json({ message: '採購單已取消', status: 'CANCELLED' });
  } catch (error) {
    console.error('取消採購單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/purchase-orders/:id/complete — 車廠確認收貨（SHIPPED → COMPLETED）
router.patch('/:id/complete', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, workshop_id: req.workshopId },
    });
    if (!order) return res.status(404).json({ error: '採購單不存在' });
    if (order.status !== 'SHIPPED') {
      return res.status(400).json({ error: `目前狀態（${order.status}）無法確認收貨` });
    }

    await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });

    res.json({ message: '已確認收貨', status: 'COMPLETED' });
  } catch (error) {
    console.error('確認收貨失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
