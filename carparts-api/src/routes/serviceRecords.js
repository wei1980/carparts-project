// src/routes/serviceRecords.js — 車主端：查詢愛車保養維修紀錄
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

const prisma = require('../lib/prisma');
router.use(auth);

// schema 的 ServiceRecord 只定義了 items 關聯；vehicle / garage 以獨立查詢補上，
// 避免 include 不存在的關聯造成 Prisma 500。
async function attachRefs(records) {
  const list = Array.isArray(records) ? records : [records];
  const vehicleIds = [...new Set(list.map(r => r.vehicle_id).filter(Boolean))];
  const garageIds = [...new Set(list.map(r => r.garage_id).filter(Boolean))];

  const [vehicles, garages] = await Promise.all([
    vehicleIds.length
      ? prisma.vehicleProfile.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, make: true, model: true, licensePlate: true },
        })
      : [],
    garageIds.length
      ? prisma.workshop.findMany({
          where: { id: { in: garageIds } },
          select: { id: true, garage_name: true, garage_address: true, garage_phone: true },
        })
      : [],
  ]);

  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const gMap = Object.fromEntries(garages.map(g => [g.id, g]));

  const enriched = list.map(r => ({
    ...r,
    vehicle: vMap[r.vehicle_id] || null,
    garage: gMap[r.garage_id] || null,
  }));
  return Array.isArray(records) ? enriched : enriched[0];
}

// GET /api/service-records — 我所有車的維修歷史
router.get('/', async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const where = { user_id: req.userId };
    if (vehicleId) where.vehicle_id = vehicleId;

    const records = await prisma.serviceRecord.findMany({
      where,
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(await attachRefs(records));
  } catch (error) {
    console.error('取得維修紀錄失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/service-records/:id — 單筆工單明細（含工項與零件）
router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.serviceRecord.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
      include: { items: true },
    });
    if (!record) return res.status(404).json({ error: '維修紀錄不存在' });
    res.json(await attachRefs(record));
  } catch (error) {
    console.error('取得維修紀錄明細失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
