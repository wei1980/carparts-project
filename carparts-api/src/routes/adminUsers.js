// src/routes/adminUsers.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');

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

    // 🔒 EndUser 沒有 vehicles 關聯（也沒有 orders）——不能用 _count 猜名字。
    //     vehicles 走 VehicleProfile.userId；訂單走 ConsumerOrder.userId。
    //     _count 只保留真正存在的關聯，其餘用 groupBy 另算（避免整個端點 500）。
    const [users, vehicleCounts, orderCounts] = await Promise.all([
      prisma.endUser.findMany({
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
          _count: { select: { consumerOrders: true, appointments: true, wishItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicleProfile.groupBy({ by: ['userId'], _count: { _all: true } }),
      prisma.consumerOrder.groupBy({ by: ['userId'], _count: { _all: true } }),
    ]);

    const vehicleMap = new Map(vehicleCounts.map((v) => [v.userId, v._count._all]));
    const orderMap = new Map(orderCounts.map((o) => [o.userId, o._count._all]));

    const payload = users.map((u) => {
      const { _count, ...rest } = u;
      return {
        ...rest,
        vehicle_count: vehicleMap.get(u.id) || 0,
        order_count: orderMap.get(u.id) || _count.consumerOrders,
      };
    });

    res.json(payload);
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
      // 🔒 不回傳 passwordHash
      select: {
        id: true, name: true, phone: true, lineId: true, address: true,
        email: true, avatar_url: true, is_approved: true, is_active: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    console.error('更新會員失敗:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '手機號碼已被其他帳號使用' });
    }
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/admin/users/:id — 刪除會員（含關聯資料）
// ⚠️ EndUser 被 11 張表引用，多數「沒有」onDelete: Cascade。
//    原本只清 5 張（vehicle/appointment/order/orderItem/wishItem/recognitionLog），
//    漏掉 ServiceRecord / MaintenanceReminder / WorkOrder / InsurancePolicy /
//    GarageReview → 直接 delete 會被 FK 擋下 → 500，而且前面的 deleteMany
//    已經先清掉一部分資料（部分刪除，DB 處於中間狀態）。
//    這裡補齊全部，並包進單一交易：任何一步失敗就整批 rollback。
router.delete('/:id', async (req, res) => {
  try {
    const user = await prisma.endUser.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: '會員不存在' });

    const uid = req.params.id;

    // 有交易紀錄的會員：保留訂單供對帳，改為匿名化（與 /auth/account 一致）
    const orderCount = await prisma.consumerOrder.count({ where: { userId: uid } });
    if (orderCount > 0) {
      return res.status(409).json({
        code: 'USER_HAS_ORDERS',
        error: `此會員有 ${orderCount} 筆訂單，為保留交易與對帳紀錄無法刪除。`
          + '請改用「停用帳號」；如需匿名化請走會員刪號流程（DELETE /api/auth/account）。',
      });
    }

    await prisma.$transaction(async (tx) => {
      // 子表（順序：先子後父）
      await tx.garageReview.deleteMany({ where: { user_id: uid } });
      await tx.insurancePolicy.deleteMany({ where: { user_id: uid } });
      await tx.maintenanceReminder.deleteMany({ where: { user_id: uid } });
      await tx.workOrder.deleteMany({ where: { user_id: uid } });
      await tx.serviceRecord.deleteMany({ where: { user_id: uid } });
      await tx.appointment.deleteMany({ where: { user_id: uid } });
      await tx.consumerOrderItem.deleteMany({
        where: { order: { userId: uid } },
      });
      await tx.consumerOrder.deleteMany({ where: { userId: uid } });
      await tx.wishItem.deleteMany({ where: { userId: uid } });
      await tx.partImageRecognitionLog.deleteMany({ where: { userId: uid } });
      await tx.aiPartDraft.deleteMany({ where: { userId: uid } });
      await tx.vehicleProfile.deleteMany({ where: { userId: uid } });
      await tx.endUser.delete({ where: { id: uid } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('刪除會員失敗:', error);
    if (error.code === 'P2003') {
      return res.status(409).json({
        code: 'USER_IN_USE',
        error: '此會員仍被其他紀錄引用，無法刪除。',
      });
    }
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