// src/routes/serviceRecords.js — 車主端：查詢愛車保養維修紀錄
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/authMiddleware');

const prisma = new PrismaClient();
router.use(auth);

// GET /api/service-records — 我所有車的維修歷史
router.get('/', async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const where = { user_id: req.userId };
    if (vehicleId) where.vehicle_id = vehicleId;

    const records = await prisma.serviceRecord.findMany({
      where,
      include: {
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
        garage: { select: { id: true, garage_name: true, garage_phone: true } },
        items: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/service-records/:id — 單筆工單明細（含工項與零件）
router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.serviceRecord.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
      include: {
        vehicle: true,
        garage: { select: { id: true, garage_name: true, garage_address: true, garage_phone: true } },
        items: true,
      },
    });
    if (!record) return res.status(404).json({ error: '維修紀錄不存在' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
