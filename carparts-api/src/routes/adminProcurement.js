// src/routes/adminProcurement.js — 進貨成本管理：供貨商 / 進貨批次 / 到岸成本
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

const prisma = require('../lib/prisma');
router.use(adminAuth);

// ───────────────────────── 供貨商 ─────────────────────────

// GET /api/admin/procurement/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { shipments: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(suppliers);
  } catch (error) {
    console.error('供貨商查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/procurement/suppliers
router.post('/suppliers', async (req, res) => {
  try {
    const { name, country, contact_person, phone, email, payment_terms, currency, note } = req.body;
    if (!name) return res.status(400).json({ error: '供貨商名稱為必填' });
    const supplier = await prisma.supplier.create({
      data: { name, country, contact_person, phone, email, payment_terms, currency: currency || 'USD', note },
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error('建立供貨商失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PUT /api/admin/procurement/suppliers/:id
router.put('/suppliers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, country, contact_person, phone, email, payment_terms, currency, note, is_active } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, country, contact_person, phone, email, payment_terms, currency, note,
        ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}) },
    });
    res.json(supplier);
  } catch (error) {
    console.error('更新供貨商失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ───────────────────────── 進貨批次 ─────────────────────────

function genShipmentNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `SH${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// GET /api/admin/procurement/shipments?status=&type=
router.get('/shipments', async (req, res) => {
  try {
    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, country: true, currency: true } },
        items: { include: { part: { select: { id: true, sku: true, name: true, brand: true } } } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    // 附帶每批總成本與已分攤單位成本預覽
    res.json(shipments.map((s) => ({
      ...s,
      total_landed_cost_twd:
        Number(s.goods_cost_twd) + Number(s.intl_freight_twd) + Number(s.local_freight_twd) +
        Number(s.customs_duty_twd) + Number(s.customs_other_twd),
      total_qty: s.items.reduce((a, i) => a + i.qty, 0),
    })));
  } catch (error) {
    console.error('進貨批次查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/procurement/shipments/:id
router.get('/shipments/:id', async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supplier: true,
        items: { include: { part: { select: { id: true, sku: true, name: true, brand: true, stock_qty: true } } } },
      },
    });
    if (!shipment) return res.status(404).json({ error: '找不到此進貨批次' });
    res.json(withLandedCosts(shipment));
  } catch (error) {
    console.error('進貨批次詳情失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

/** 分攤計算：把運費+關稅+雜費依 BY_AMOUNT（貨款比）或 BY_QTY（數量比）攤到每件 */
function withLandedCosts(shipment) {
  const overhead =
    Number(shipment.intl_freight_twd) + Number(shipment.local_freight_twd) +
    Number(shipment.customs_duty_twd) + Number(shipment.customs_other_twd);
  const byAmount = shipment.allocation_method === 'BY_AMOUNT';
  const weightBase = shipment.items.reduce(
    (a, i) => a + (byAmount ? Number(i.unit_price_twd) * i.qty : i.qty), 0);

  let acc = 0; // 尾差補到最後一項
  const items = shipment.items.map((it, idx) => {
    const itemGoods = Number(it.unit_price_twd) * it.qty;
    const share = weightBase > 0 ? overhead * ((byAmount ? itemGoods : it.qty) / weightBase) : 0;
    let landedUnit = it.qty > 0 ? (itemGoods + share) / it.qty : 0;
    if (idx === shipment.items.length - 1 && it.qty > 0) {
      // 最後一項吸收四捨五入尾差：以總成本反推
      const totalGoods = shipment.items.reduce((a, i2) => a + Number(i2.unit_price_twd) * i2.qty, 0);
      landedUnit = (totalGoods + overhead - acc) / it.qty;
    }
    acc += Math.round((itemGoods + share) * 100) / 100;
    return {
      ...it,
      allocated_overhead: +(share).toFixed(2),
      landed_unit_cost: +landedUnit.toFixed(2),
    };
  });
  return {
    ...shipment,
    total_overhead: overhead,
    total_landed_cost: +(Number(shipment.goods_cost_twd) + overhead).toFixed(2),
    items,
  };
}

// POST /api/admin/procurement/shipments — 建立批次（含明細）
router.post('/shipments', async (req, res) => {
  try {
    const {
      type = 'IMPORT', supplier_id, currency = 'USD', exchange_rate = 1,
      goods_cost_twd = 0, intl_freight_twd = 0, local_freight_twd = 0,
      customs_duty_twd = 0, customs_other_twd = 0, paid_amount_twd = 0,
      allocation_method = 'BY_AMOUNT', ordered_at, eta_date, note, items = [],
    } = req.body;

    if (!supplier_id) return res.status(400).json({ error: '請選擇供貨商' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '請至少加入一筆進貨明細（partId + qty）' });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: parseInt(supplier_id) } });
    if (!supplier) return res.status(404).json({ error: '找不到供貨商' });

    for (const it of items) {
      if (!it.partId || !it.qty || parseInt(it.qty) <= 0) {
        return res.status(400).json({ error: '每筆明細需要 partId 與正數 qty' });
      }
    }

    const shipment = await prisma.shipment.create({
      data: {
        shipment_no: genShipmentNo(),
        type, status: 'DRAFT',
        supplier_id: parseInt(supplier_id),
        currency, exchange_rate: parseFloat(exchange_rate) || 1,
        goods_cost_twd: parseFloat(goods_cost_twd) || 0,
        intl_freight_twd: parseFloat(intl_freight_twd) || 0,
        local_freight_twd: parseFloat(local_freight_twd) || 0,
        customs_duty_twd: parseFloat(customs_duty_twd) || 0,
        customs_other_twd: parseFloat(customs_other_twd) || 0,
        paid_amount_twd: parseFloat(paid_amount_twd) || 0,
        allocation_method,
        ordered_at: ordered_at ? new Date(ordered_at) : null,
        eta_date: eta_date ? new Date(eta_date) : null,
        note: note || null,
        items: {
          create: items.map((it) => ({
            part_id: parseInt(it.partId),
            qty: parseInt(it.qty),
            unit_price_twd: parseFloat(it.unitPriceTwd) || 0,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    // 貨款若未手填 → 由明細自動加總
    const autoGoods = shipment.items.reduce((a, i) => a + Number(i.unit_price_twd) * i.qty, 0);
    if (!goods_cost_twd && autoGoods > 0) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { goods_cost_twd: autoGoods },
      });
    }

    res.status(201).json(await prisma.shipment.findUnique({
      where: { id: shipment.id }, include: { items: true, supplier: true },
    }));
  } catch (error) {
    console.error('建立進貨批次失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PUT /api/admin/procurement/shipments/:id — 更新成本更新成本欄位（僅 DRAFT/ORDERED 可全改）
router.put('/shipments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.shipment.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ error: '找不到此進貨批次' });
    if (existing.status === 'RECEIVED' || existing.status === 'CANCELLED') {
      return res.status(400).json({ error: '已入庫或已取消的批次不可修改' });
    }

    const b = req.body;
    const data = {};
    const numFields = ['exchange_rate', 'goods_cost_twd', 'intl_freight_twd', 'local_freight_twd',
      'customs_duty_twd', 'customs_other_twd', 'paid_amount_twd'];
    for (const f of numFields) if (b[f] !== undefined) data[f] = parseFloat(b[f]) || 0;
    if (b.allocation_method) data.allocation_method = b.allocation_method;
    if (b.currency) data.currency = b.currency;
    if (b.type) data.type = b.type;
    if (b.ordered_at !== undefined) data.ordered_at = b.ordered_at ? new Date(b.ordered_at) : null;
    if (b.eta_date !== undefined) data.eta_date = b.eta_date ? new Date(b.eta_date) : null;
    if (b.note !== undefined) data.note = b.note;

    // 明細替換（整批）
    if (Array.isArray(b.items) && b.items.length > 0) {
      for (const it of b.items) {
        if (!it.partId || !it.qty || parseInt(it.qty) <= 0) {
          return res.status(400).json({ error: '每筆明細需要 partId 與正數 qty' });
        }
      }
      await prisma.shipmentItem.deleteMany({ where: { shipment_id: id } });
      await prisma.shipmentItem.createMany({
        data: b.items.map((it) => ({
          shipment_id: id, part_id: parseInt(it.partId), qty: parseInt(it.qty),
          unit_price_twd: parseFloat(it.unitPriceTwd) || 0,
        })),
      });
      // 明細變了就重算貨款（若未另外指定）
      if (data.goods_cost_twd === undefined) {
        const sum = b.items.reduce((a, it) => a + (parseFloat(it.unitPriceTwd) || 0) * parseInt(it.qty), 0);
        data.goods_cost_twd = sum;
      }
    }

    await prisma.shipment.update({ where: { id }, data });
    const updated = await prisma.shipment.findUnique({ where: { id }, include: { items: true, supplier: true } });
    res.json(updated);
  } catch (error) {
    console.error('更新進貨批次失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/procurement/shipments/:id/status — 狀態推進；RECEIVED 時入庫+寫到岸成本
router.patch('/shipments/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ['DRAFT', 'ORDERED', 'IN_TRANSIT', 'CUSTOMS', 'RECEIVED', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ error: `status 須為 ${valid.join('/')}` });

    const existing = await prisma.shipment.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ error: '找不到此進貨批次' });
    if (existing.status === 'RECEIVED') return res.status(400).json({ error: '已入庫的批次不可再變更狀態' });

    if (status === 'RECEIVED') {
      // 分攤計算 + 入庫（stock_qty += qty、寫 landed_unit_cost、記 InventoryLog）
      const full = { ...existing };
      const overhead =
        Number(existing.intl_freight_twd) + Number(existing.local_freight_twd) +
        Number(existing.customs_duty_twd) + Number(existing.customs_other_twd);
      const byAmount = existing.allocation_method === 'BY_AMOUNT';
      const weightBase = existing.items.reduce(
        (a, i) => a + (byAmount ? Number(i.unit_price_twd) * i.qty : i.qty), 0);
      if (weightBase <= 0 && overhead > 0) {
        return res.status(400).json({ error: '明細金額/數量皆為 0，無法分攤費用' });
      }

      await prisma.$transaction(async (tx) => {
        for (const it of existing.items) {
          const itemGoods = Number(it.unit_price_twd) * it.qty;
          const share = weightBase > 0 ? overhead * ((byAmount ? itemGoods : it.qty) / weightBase) : 0;
          const landedUnit = it.qty > 0 ? (itemGoods + share) / it.qty : 0;
          await tx.shipmentItem.update({
            where: { id: it.id },
            data: { landed_unit_cost: landedUnit.toFixed(2) },
          });
          const part = await tx.part.findUnique({ where: { id: it.part_id } });
          const newQty = part.stock_qty + it.qty;
          await tx.part.update({
            where: { id: it.part_id },
            data: {
              stock_qty: newQty,
              stock_location: existing.type === 'IMPORT' ? 'OWN_WAREHOUSE' : part.stock_location,
            },
          });
          await tx.inventoryLog.create({
            data: {
              part_id: it.part_id, qty_change: it.qty, qty_after: newQty,
              type: 'SHIPMENT_RECEIVE',
              note: `進貨批次 ${existing.shipment_no} 入庫，到岸成本 $${landedUnit.toFixed(2)}/件`,
            },
          });
        }
        await tx.shipment.update({
          where: { id },
          data: { status: 'RECEIVED', received_at: new Date() },
        });
      });
    } else {
      await prisma.shipment.update({ where: { id }, data: { status } });
    }

    const updated = await prisma.shipment.findUnique({
      where: { id },
      include: { items: { include: { part: { select: { id: true, sku: true, name: true } } } }, supplier: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('批次狀態更新失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ───────────────────────── 月營收報表 ─────────────────────────

// GET /api/admin/procurement/monthly-report?months=6
// 營收 = 已付款訂單總額；成本 = 出貨數量 × 最近到岸成本（無到岸成本則用批發價）
router.get('/monthly-report', async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 24);
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1); since.setHours(0, 0, 0, 0);

    // 各零件最近到岸成本
    const landedItems = await prisma.shipmentItem.findMany({
      where: { landed_unit_cost: { not: null }, shipment: { status: 'RECEIVED' } },
      orderBy: { id: 'asc' },
      select: { part_id: true, qty: true, unit_price_twd: true, landed_unit_cost: true, shipment: { select: { received_at: true } } },
    });
    const latestLanded = new Map(); // part_id -> { cost, at } 取最新
    for (const li of landedItems) {
      const cur = latestLanded.get(li.part_id);
      if (!cur || new Date(li.shipment.received_at) > new Date(cur.at)) {
        latestLanded.set(li.part_id, { cost: Number(li.landed_unit_cost), at: li.shipment.received_at });
      }
    }
    // 無到岸成本的零件退回批發價
    const noLandedIds = [];
    const partsForWholesale = new Map();

    // 月度聚合：車主訂單
    const cOrders = await prisma.consumerOrder.findMany({
      where: { created_at: { gte: since }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: {
        created_at: true, subtotal_amount: true, shipping_fee: true, total_amount: true,
        items: { select: { part_id: true, qty: true, price_snapshot: true } },
      },
    });
    const gOrders = await prisma.order.findMany({
      where: { created_at: { gte: since }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: {
        created_at: true, subtotal_amount: true, shipping_fee: true, total_amount: true,
        items: { select: { part_id: true, qty: true, price_snapshot: true } },
      },
    });

    const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthly = new Map();
    const ensureMonth = (k) => {
      if (!monthly.has(k)) monthly.set(k, { month: k, revenue: 0, shipping_income: 0, cogs: 0, orders: 0 });
      return monthly.get(k);
    };

    const missingCostParts = new Set();
    const processOrder = (o) => {
      const m = ensureMonth(monthKey(new Date(o.created_at)));
      m.revenue += Number(o.subtotal_amount);
      m.shipping_income += Number(o.shipping_fee);
      m.orders += 1;
      for (const it of o.items) {
        const landed = latestLanded.get(it.part_id);
        if (landed) {
          m.cogs += landed.cost * it.qty;
        } else {
          missingCostParts.add(it.part_id);
          m.cogs += 0; // 之後補批發價
        }
      }
    };
    cOrders.forEach(processOrder);
    gOrders.forEach(processOrder);

    // 缺成本的零件用批發價估
    if (missingCostParts.size) {
      const ps = await prisma.part.findMany({
        where: { id: { in: [...missingCostParts] } },
        select: { id: true, wholesale_price: true },
      });
      const wMap = new Map(ps.map((p) => [p.id, Number(p.wholesale_price)]));
      const reprocess = (o) => {
        const m = monthly.get(monthKey(new Date(o.created_at)));
        for (const it of o.items) {
          if (!latestLanded.get(it.part_id)) m.cogs += (wMap.get(it.part_id) || 0) * it.qty;
        }
      };
      // 重算 cogs（簡化：先歸零重跑）
      for (const m of monthly.values()) m.cogs = 0;
      cOrders.forEach(reprocess);
      gOrders.forEach(reprocess);
    }

    const report = [...monthly.values()]
      .map((m) => ({
        ...m,
        revenue: +m.revenue.toFixed(0),
        gross_profit: +(m.revenue - m.cogs).toFixed(0),
        gross_margin: m.revenue > 0 ? +(((m.revenue - m.cogs) / m.revenue) * 100).toFixed(1) : null,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      months,
      note: '成本 = 出貨數量 × 最近到岸成本；無進貨批次資料者以批發價估算',
      monthly: report,
      parts_missing_cost: [...missingCostParts].length,
    });
  } catch (error) {
    console.error('月營收報表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
