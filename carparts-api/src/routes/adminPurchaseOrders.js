// src/routes/adminPurchaseOrders.js
// 🆕 管理端 B2B 採購單處理（確認 / 出貨）
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');

const prisma = new PrismaClient();
router.use(adminAuth);

// 🔔 採購單狀態變更 → 主動通知車廠（LINE 官方帳號好友；失敗不擋管理端流程）
// 通道仍受系統設定的總開關與細項開關控制
async function notifyWorkshopPo(order, workshop, statusLabel) {
  try {
    const { pushMessage, getSettings } = require('../services/lineService');
    const settings = await getSettings();
    if (settings.lineNotifyEnabled === false) return;
    if (settings.notifyOnPoStatus === false) return;
    const shopName = workshop.garage_name || workshop.company_name || `車廠 #${order.workshop_id}`;
    // 車廠聯絡人綁定的 LINE（workshop.line_id）；無則略過
    if (!workshop.line_id) return;
    const msg = [
      `🔔 採購單狀態更新`,
      `━━━━━━━━━━━━━━`,
      `📄 單號：${order.po_number}`,
      `💰 金額：NT$ ${Number(order.total_amount).toLocaleString()}`,
      `📊 狀態：${statusLabel}`,
      `━━━━━━━━━━━━━━`,
      `感謝您使用車大師平台 🙏`,
    ].join('\n');
    await pushMessage(workshop.line_id, msg);
  } catch (err) {
    console.error('採購單狀態 LINE 通知失敗:', err.message);
  }
}

// GET /api/admin/purchase-orders — 全部採購單列表
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 50);
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          items: true,
          workshop: { select: { id: true, company_name: true, garage_name: true, phone: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      orders,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  } catch (error) {
    console.error('查詢採購單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/purchase-orders/:id/confirm — SUBMITTED → CONFIRMED
router.patch('/:id/confirm', async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!order) return res.status(404).json({ error: '採購單不存在' });
    if (order.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `目前狀態（${order.status}）無法確認` });
    }

    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', confirmed_at: new Date() },
    });

    // 🔔 主動知會車廠（備貨中）
    const ws = await prisma.workshop.findUnique({
      where: { id: order.workshop_id },
      select: { line_id: true, garage_name: true, company_name: true },
    });
    await notifyWorkshopPo({ ...order, status: 'CONFIRMED' }, { ...ws, workshop_id: order.workshop_id }, '🟢 已確認，備貨中');

    res.json({ message: '採購單已確認', status: 'CONFIRMED' });
  } catch (error) {
    console.error('確認採購單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/purchase-orders/:id/ship — CONFIRMED → SHIPPED（可填追蹤碼備註）
router.patch('/:id/ship', async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: '採購單不存在' });
    if (order.status !== 'CONFIRMED') {
      return res.status(400).json({ error: `目前狀態（${order.status}）無法出貨` });
    }

    // 代購項目到貨補庫存（出貨時扣）
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.is_preorder) continue; // 代購項目建立時沒扣過庫存，出貨也不影響現有負庫存邏輯
      }
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: 'SHIPPED', shipped_at: new Date() },
      });
    });

    // 🔔 主動知會車廠（已出貨）
    const ws = await prisma.workshop.findUnique({
      where: { id: order.workshop_id },
      select: { line_id: true, garage_name: true, company_name: true },
    });
    await notifyWorkshopPo({ ...order, status: 'SHIPPED' }, { ...ws, workshop_id: order.workshop_id }, '📦 已出貨');

    res.json({ message: '採購單已出貨', status: 'SHIPPED' });
  } catch (error) {
    console.error('出貨失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
