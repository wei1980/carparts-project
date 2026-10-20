// src/routes/wishlist.js — 車主端願望清單 + 降價通知
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

const prisma = new PrismaClient();

// ─── 車主端（需登入）─────────────────────────────

// GET /api/wishlist — 我的願望清單（含零件現價，標記是否已達期望價）
router.get('/', auth, async (req, res) => {
  try {
    const items = await prisma.wishItem.findMany({
      where: { userId: req.userId },
      include: {
        part: { select: { id: true, sku: true, name: true, brand: true, image_url: true, msrp_price: true, stock_qty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items.map((w) => ({
      id: w.id,
      description: w.description,
      partPhoto: w.partPhoto,
      status: w.status,
      target_price: w.targetPrice != null ? Number(w.targetPrice) : null,
      current_price: w.part ? Number(w.part.msrp_price) : null,
      price_reached: w.targetPrice != null && w.part ? Number(w.part.msrp_price) <= Number(w.targetPrice) : false,
      part: w.part,
      created_at: w.createdAt,
    })));
  } catch (error) {
    console.error('願望清單查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/wishlist — 加入願望清單
// body: { description?, partId?, targetPrice? }  — partId 與 description 至少一個
router.post('/', auth, async (req, res) => {
  try {
    const { description, partId, targetPrice, partPhoto } = req.body;
    if (!description && !partId) {
      return res.status(400).json({ error: '請提供零件描述或選擇平台商品' });
    }

    let finalDescription = description;
    if (partId) {
      const part = await prisma.part.findUnique({ where: { id: parseInt(partId) } });
      if (!part) return res.status(404).json({ error: '找不到該零件' });
      // 同商品去重：已追蹤同一件且未取消 → 不重複加入
      const dup = await prisma.wishItem.findFirst({
        where: { userId: req.userId, partId: parseInt(partId), status: { not: 'CANCELLED' } },
      });
      if (dup) return res.status(400).json({ error: '這件商品已在你的願望清單中' });
      if (!finalDescription) finalDescription = `${part.brand} ${part.name}`;
    }

    const item = await prisma.wishItem.create({
      data: {
        userId: req.userId,
        description: finalDescription,
        partPhoto: partPhoto || null,
        partId: partId ? parseInt(partId) : null,
        targetPrice: targetPrice != null && targetPrice !== '' ? parseFloat(targetPrice) : null,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('加入願望清單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/wishlist/:id — 更新期望價 / 取消
router.patch('/:id', auth, async (req, res) => {
  try {
    const existing = await prisma.wishItem.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: '找不到此願望項目' });

    const { targetPrice, status } = req.body;
    const item = await prisma.wishItem.update({
      where: { id: existing.id },
      data: {
        ...(targetPrice !== undefined ? { targetPrice: targetPrice === null || targetPrice === '' ? null : parseFloat(targetPrice) } : {}),
        ...(status ? { status } : {}),
        ...(targetPrice !== undefined ? { notifiedAt: null } : {}), // 改期望價後允許重新通知
      },
    });
    res.json(item);
  } catch (error) {
    console.error('更新願望項目失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/wishlist/:id — 移除
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await prisma.wishItem.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: '找不到此願望項目' });
    await prisma.wishItem.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('移除願望項目失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
