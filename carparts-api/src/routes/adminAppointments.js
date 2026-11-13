// src/routes/adminAppointments.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { notifyAppointmentUpdate } = require('../services/lineService');

const prisma = require('../lib/prisma');

router.use(adminAuth);

// GET /api/admin/appointments — 取得所有預約（可依狀態篩選）
router.get('/', async (req, res) => {
  try {
    const { status, garageId } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (garageId) where.garage_id = parseInt(garageId);

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            generation: true,
            year: true,
            licensePlate: true,
          },
        },
        garage: {
          select: {
            id: true,
            garage_name: true,
            company_name: true,
            garage_phone: true,
            garage_address: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(appointments);
  } catch (error) {
    console.error('取得預約列表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/appointments/:id — 單一預約詳情
router.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            generation: true,
            year: true,
            licensePlate: true,
            vin: true,
          },
        },
        garage: {
          select: {
            id: true,
            garage_name: true,
            company_name: true,
            garage_phone: true,
            garage_address: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: '預約不存在' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('取得預約詳情失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/appointments/:id — 更新預約狀態或時間
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, scheduledAt, note } = req.body;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: '預約不存在' });
    }

    const data = {};
    if (status) data.status = status.toUpperCase();
    if (scheduledAt) data.scheduled_at = new Date(scheduledAt);
    if (note !== undefined) data.note = note;

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        garage: { select: { garage_name: true, company_name: true } },
        user: { select: { name: true, phone: true, lineId: true } },
      },
    });

    console.debug(`📅 預約 #${id} 已更新:`, {
      status: updated.status,
      scheduledAt: updated.scheduled_at,
      vehicle: `${updated.vehicle.make} ${updated.vehicle.model}`,
      garage: updated.garage.garage_name,
    });

    // 🆕 發送 LINE 通知
    if (status) {
      await notifyAppointmentUpdate(updated).catch(err => {
        console.error('LINE 通知發送失敗:', err.message);
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('更新預約失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;