// src/routes/reviews.js — 車廠評價（車主寫評價 + 公開讀取）
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

const prisma = require('../lib/prisma');

// ─── 公開：取得某車廠的評價列表 ───
router.get('/garage/:garageId', async (req, res) => {
  try {
    const garageId = parseInt(req.params.garageId);
    // GarageReview 沒有 user / appointment 關聯，改批次查詢後組裝
    const [reviews, agg] = await Promise.all([
      prisma.garageReview.findMany({
        where: { garage_id: garageId },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.garageReview.aggregate({
        where: { garage_id: garageId },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
    const apptIds = [...new Set(reviews.map(r => r.appointment_id).filter(Boolean))];

    const [users, appointments] = await Promise.all([
      userIds.length
        ? prisma.endUser.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : [],
      apptIds.length
        ? prisma.appointment.findMany({
            where: { id: { in: apptIds } },
            select: { id: true, service_type: true, vehicle_id: true },
          })
        : [],
    ]);

    const vehicleIds = [...new Set(appointments.map(a => a.vehicle_id).filter(Boolean))];
    const vehicles = vehicleIds.length
      ? await prisma.vehicleProfile.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, make: true, model: true },
        })
      : [];

    const uMap = Object.fromEntries(users.map(u => [u.id, u]));
    const aMap = Object.fromEntries(appointments.map(a => [a.id, a]));
    const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const enriched = reviews.map(r => {
      const appt = aMap[r.appointment_id];
      return {
        ...r,
        user: uMap[r.user_id] ? { name: uMap[r.user_id].name } : null,
        appointment: appt
          ? { service_type: appt.service_type, vehicle: vMap[appt.vehicle_id] || null }
          : null,
      };
    });

    res.json({
      average: agg._count.id > 0 ? +(agg._avg.rating || 0).toFixed(1) : null,
      count: agg._count.id,
      reviews: enriched,
    });
  } catch (error) {
    console.error('評價查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ─── 車主端（需登入）─────────────────────
router.use(auth);

// POST /api/reviews — 撰寫評價（限 COMPLETED 預約，一預約一評）
router.post('/', async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;
    if (!appointmentId || !rating) return res.status(400).json({ error: 'appointmentId、rating 為必填' });
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: 'rating 須為 1-5 整數' });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(appointmentId), user_id: req.userId },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });
    if (appointment.status !== 'COMPLETED') {
      return res.status(400).json({ error: '只有已完工的預約可以評價' });
    }

    // 一預約一評
    const existing = await prisma.garageReview.findUnique({
      where: { appointment_id: appointment.id },
    });
    if (existing) return res.status(400).json({ error: '此預約已評價過' });

    const review = await prisma.$transaction(async (tx) => {
      const r = await tx.garageReview.create({
        data: {
          appointment_id: appointment.id,
          garage_id: appointment.garage_id,
          user_id: req.userId,
          rating: parseInt(rating),
          comment: comment || null,
        },
      });
      // 重算車廠平均分與筆數（同步 Workshop.rating / review_count）
      const agg = await tx.garageReview.aggregate({
        where: { garage_id: appointment.garage_id },
        _avg: { rating: true },
        _count: { id: true },
      });
      await tx.workshop.update({
        where: { id: appointment.garage_id },
        data: {
          rating: +(agg._avg.rating || 0).toFixed(1),
          review_count: agg._count.id,
        },
      });
      return r;
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('建立評價失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/reviews/mine?appointmentId= — 我對某預約的評價（判斷是否已評）
router.get('/mine', async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const review = await prisma.garageReview.findFirst({
      where: { user_id: req.userId, ...(appointmentId ? { appointment_id: parseInt(appointmentId) } : {}) },
      orderBy: { created_at: 'desc' },
    });
    res.json(review);
  } catch (error) {
    console.error('查詢我的評價失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
