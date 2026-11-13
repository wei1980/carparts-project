// src/routes/adminInventory.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { recordAudit } = require('../services/auditLog');
const prisma = require('../lib/prisma');

router.use(adminAuth);

// GET /api/admin/inventory — 庫存列表（含搜尋）
router.get('/', async (req, res) => {
  try {
    const { search, lowStock, inStock } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStock === 'true') {
      where.stock_qty = { lte: 5 };
    } else if (inStock === 'true') {
      where.stock_qty = { gt: 0 };
    }

    const parts = await prisma.part.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        stock_qty: true,
        distributor_stock_qty: true,
        msrp_price: true,
        wholesale_price: true,
        preorder_lead_time_days: true,
      },
      orderBy: { stock_qty: 'asc' },
      take: 100,
    });

    res.json(parts);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/inventory/:id/logs — 單一零件的庫存異動記錄
router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      where: { part_id: parseInt(req.params.id) },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/inventory/:id/adjust — 調整庫存
router.post('/:id/adjust', async (req, res) => {
  try {
    const partId = parseInt(req.params.id);
    const { qty_change, type, note } = req.body;

    if (!qty_change || !type) {
      return res.status(400).json({ error: '請提供 qty_change 和 type' });
    }

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) return res.status(404).json({ error: '零件不存在' });

    const newQty = part.stock_qty + parseInt(qty_change);
    if (newQty < 0) return res.status(400).json({ error: '庫存不可為負數' });

    // 更新庫存 + 寫入記錄
    const [updated] = await prisma.$transaction([
      prisma.part.update({
        where: { id: partId },
        data: { stock_qty: newQty },
      }),
      prisma.inventoryLog.create({
        data: {
          part_id: partId,
          qty_change: parseInt(qty_change),
          qty_after: newQty,
          type,
          note: note || '',
        },
      }),
    ]);

    // 審計：人工庫存調整（操作者、前後數量、備註）
    await recordAudit(prisma, {
      action: 'INVENTORY_ADJUST',
      entityType: 'Part',
      entityId: partId,
      before: { stock_qty: part.stock_qty },
      after: { stock_qty: newQty },
      detail: { qty_change: parseInt(qty_change), type, note: note || '' },
    }, req);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/inventory/:id/logs/:logId — 編輯庫存異動記錄
router.patch('/:id/logs/:logId', async (req, res) => {
  try {
    const logId = parseInt(req.params.logId);
    const { type, qty_change, note } = req.body;

    const log = await prisma.inventoryLog.findUnique({
      where: { id: logId },
      include: { part: true },
    });
    if (!log) return res.status(404).json({ error: '異動記錄不存在' });

    const updated = await prisma.$transaction(async (tx) => {
      const oldQtyChange = log.qty_change;
      const newQtyChange = parseInt(qty_change) || oldQtyChange;
      const delta = newQtyChange - oldQtyChange;

      const updatedLog = await tx.inventoryLog.update({
        where: { id: logId },
        data: {
          type: type || log.type,
          qty_change: newQtyChange,
          qty_after: log.qty_after + delta,
          note: note !== undefined ? note : log.note,
        },
      });

      await tx.part.update({
        where: { id: log.part_id },
        data: { stock_qty: { increment: delta } },
      });

      return updatedLog;
    });

    await recordAudit(prisma, {
      action: 'INVENTORY_LOG_EDIT',
      entityType: 'InventoryLog',
      entityId: logId,
      before: { qty_change: log.qty_change, type: log.type, qty_after: log.qty_after, note: log.note },
      after: { qty_change: updated.qty_change, type: updated.type, qty_after: updated.qty_after, note: updated.note },
      detail: { part_id: log.part_id },
    }, req);

    res.json(updated);
  } catch (error) {
    console.error('PATCH log error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/inventory/new-stock — 新增商品並建立初始庫存
router.post('/new-stock', async (req, res) => {
  try {
    const { sku, name, brand, qty, stockInAt, note } = req.body;

    if (!sku || !name || !brand || !qty) {
      return res.status(400).json({ error: '請提供 SKU、名稱、品牌、數量' });
    }

    const existing = await prisma.part.findUnique({ where: { sku } });
    if (existing) {
      return res.status(409).json({ error: '此 SKU 已存在' });
    }

    const [part] = await prisma.$transaction([
      prisma.part.create({
        data: {
          sku,
          name,
          brand,
          stock_qty: parseInt(qty),
          msrp_price: 0,
          wholesale_price: 0,
        },
      }),
      prisma.inventoryLog.create({
        data: {
          part_id: 0, // 將在 part 建立後更新
          qty_change: parseInt(qty),
          qty_after: parseInt(qty),
          type: 'NEW_STOCK',
          note: note || `新增庫存: ${stockInAt || new Date().toISOString()}`,
        },
      }),
    ]);

    // 更新 inventoryLog 的 part_id
    await prisma.inventoryLog.updateMany({
      where: { part_id: 0 },
      data: { part_id: part.id },
    });

    res.status(201).json(part);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試',  });
  }
});

module.exports = router;