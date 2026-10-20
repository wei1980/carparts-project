// src/routes/adminUsers.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const adminAuth = require('../middleware/adminAuth');
const prisma = new PrismaClient();

router.use(adminAuth);

// GET /api/admin/users — 取得會員列表
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};

    if (status === 'pending') {
      where.is_approved = false;
      where.is_active = true;
    }
    if (status === 'approved') {
      where.is_approved = true;
      where.is_active = true;
    }
    if (status === 'blocked') {
      where.is_active = false;
    }

    const users = await prisma.endUser.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
        lineId: true,
        address: true,
        is_approved: true,
        is_active: true,
        createdAt: true,
        _count: { select: { vehicles: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/users/:id — 編輯會員
router.patch('/:id', async (req, res) => {
  try {
    const { name, phone, lineId, password, address, is_approved, is_active } = req.body;
    const data = {};

    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (lineId !== undefined) data.lineId = lineId;
    if (address !== undefined) data.address = address;
    if (is_approved !== undefined) data.is_approved = is_approved;
    if (is_active !== undefined) data.is_active = is_active;

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.endUser.update({
      where: { id: req.params.id },
      data,
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/admin/users/:id — 刪除會員（含關聯資料）
router.delete('/:id', async (req, res) => {
  try {
    const user = await prisma.endUser.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: '會員不存在' });

    await prisma.vehicleProfile.deleteMany({ where: { userId: req.params.id } });
    await prisma.appointment.deleteMany({ where: { user_id: req.params.id } });

    const orders = await prisma.consumerOrder.findMany({ where: { userId: req.params.id }, select: { id: true } });
    const orderIds = orders.map(o => o.id);
    await prisma.consumerOrderItem.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.consumerOrder.deleteMany({ where: { userId: req.params.id } });

    await prisma.wishItem.deleteMany({ where: { userId: req.params.id } });
    await prisma.partImageRecognitionLog.deleteMany({ where: { userId: req.params.id } });
    await prisma.endUser.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/users/:id/vehicles — 查看客戶車輛
router.get('/:id/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicleProfile.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/users/:id/orders — 查看客戶訂單
router.get('/:id/orders', async (req, res) => {
  try {
    const orders = await prisma.consumerOrder.findMany({
      where: { userId: req.params.id },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 在 後台單獨搜尋 VIN
router.get('/search-vin', async (req, res) => {
  const { vin } = req.query;
  if (!vin) return res.status(400).json({ error: '請提供 VIN' });
  const vehicle = await prisma.vehicleProfile.findFirst({
    where: { vin },
    include: { user: { select: { phone: true, name: true } } },
  });
  if (!vehicle) return res.status(404).json({ error: '找不到此 VIN' });
  res.json({ vehicle, user: vehicle.user });
});

module.exports = router;