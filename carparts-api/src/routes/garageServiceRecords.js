// src/routes/garageServiceRecords.js — 車廠端：開立 / 管理工單
const express = require('express');
const router = express.Router();
const garageAuth = require('../middleware/garageAuth');

const prisma = require('../lib/prisma');
const { generateRemindersFromRecord } = require('../services/maintenanceReminderService');
router.use(garageAuth);

// 計算工單總額
const calcTotal = (items) =>
  items.reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);

// ServiceRecord 沒有 vehicle / user 關聯，改用獨立查詢補上（避免 Prisma 500）
async function attachRefs(records) {
  const vehicleIds = [...new Set(records.map(r => r.vehicle_id).filter(Boolean))];
  const userIds = [...new Set(records.map(r => r.user_id).filter(Boolean))];
  const [vehicles, users] = await Promise.all([
    vehicleIds.length
      ? prisma.vehicleProfile.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, make: true, model: true, licensePlate: true },
        })
      : [],
    userIds.length
      ? prisma.endUser.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, phone: true },
        })
      : [],
  ]);
  const vMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  const uMap = Object.fromEntries(users.map(u => [u.id, u]));
  return records.map(r => ({
    ...r,
    vehicle: vMap[r.vehicle_id] || null,
    user: uMap[r.user_id] || null,
  }));
}

// GET /api/garage/service-records — 本廠所有工單
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = { garage_id: req.workshopId };
    if (status) where.status = status.toUpperCase();

    const records = await prisma.serviceRecord.findMany({
      where,
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(await attachRefs(records));
  } catch (error) {
    console.error('取得車廠工單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/garage/service-records — 開新工單（可從預約轉，或自開）
router.post('/', async (req, res) => {
  try {
    const { vehicleId, appointmentId, mileageKm, summary, items } = req.body;
    if (!vehicleId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'vehicleId、items 為必填' });
    }

    const vehicle = await prisma.vehicleProfile.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    // 若由預約轉工單，確認該預約屬於本廠且車輛相符
    if (appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: parseInt(appointmentId), garage_id: req.workshopId, vehicle_id: vehicleId },
      });
      if (!appt) return res.status(404).json({ error: '預約不存在或不屬於本廠' });
    }

    const record = await prisma.serviceRecord.create({
      data: {
        vehicle_id: vehicleId,
        user_id: vehicle.userId,
        garage_id: req.workshopId,
        appointment_id: appointmentId ? parseInt(appointmentId) : null,
        mileage_km: mileageKm != null ? parseInt(mileageKm) : null,
        summary: summary || '',
        status: 'IN_PROGRESS',
        total_amount: calcTotal(items),
        items: {
          create: items.map((it) => ({
            kind: it.kind === 'PART' ? 'PART' : 'LABOR',
            name: it.name,
            part_sku: it.partSku || null,
            part_brand: it.partBrand || null,
            quantity: parseInt(it.quantity) || 1,
            unit_price: parseInt(it.unit_price ?? it.unitPrice) || 0,
            note: it.note || null,
          })),
        },
      },
      include: { items: true },
    });

    // 由預約轉來的，把預約推進到施工中
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: parseInt(appointmentId) },
        data: { status: 'IN_PROGRESS' },
      }).catch(() => {});
    }

    // 🆕 工單里程自動回寫車輛檔
    if (mileageKm != null) {
      const ws = await prisma.workshop.findUnique({ where: { id: req.workshopId }, select: { garage_name: true, company_name: true } });
      const garageLabel = ws?.garage_name || ws?.company_name || '合作車廠';
      const veh = await prisma.vehicleProfile.findUnique({ where: { id: vehicleId }, select: { current_mileage: true } });
      if (!veh || veh.current_mileage == null || parseInt(mileageKm) > veh.current_mileage) {
        await prisma.vehicleProfile.update({
          where: { id: vehicleId },
          data: {
            current_mileage: parseInt(mileageKm),
            mileage_updated_at: new Date(),
            mileage_source: 'garage',
            mileage_source_note: `${garageLabel}工單`,
          },
        });
      }
    }

    res.status(201).json(record);
  } catch (error) {
    console.error('開立工單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/service-records/:id — 更新工單（項目、里程、摘要、狀態）
router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.serviceRecord.findFirst({
      where: { id: parseInt(req.params.id), garage_id: req.workshopId },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ error: '工單不存在' });

    const { mileageKm, summary, status, items } = req.body;
    const data = {};
    if (mileageKm != null) data.mileage_km = parseInt(mileageKm);
    if (summary !== undefined) data.summary = summary;
    if (status) data.status = String(status).toUpperCase();

    // 完成時記錄完成時間；狀態改 COMPLETED 才鎖總額
    if (data.status === 'COMPLETED') data.completed_at = new Date();

    let total = existing.total_amount;
    if (Array.isArray(items)) {
      // 整批替換工項（前端一次送完整清單）
      total = calcTotal(items);
      await prisma.serviceRecordItem.deleteMany({ where: { record_id: existing.id } });
      await prisma.serviceRecordItem.createMany({
        data: items.map((it) => ({
          record_id: existing.id,
          kind: it.kind === 'PART' ? 'PART' : 'LABOR',
          name: it.name,
          part_sku: it.partSku || null,
          part_brand: it.partBrand || null,
          quantity: parseInt(it.quantity) || 1,
          unit_price: parseInt(it.unit_price ?? it.unitPrice) || 0,
          note: it.note || null,
        })),
      });
      data.total_amount = total;
    }

    const updated = await prisma.serviceRecord.update({
      where: { id: existing.id },
      data,
      include: { items: true },
    });

    // 完成工單時，同步把對應預約設為已完成
    if (data.status === 'COMPLETED' && updated.appointment_id) {
      await prisma.appointment.update({
        where: { id: updated.appointment_id },
        data: { status: 'COMPLETED' },
      }).catch(() => {});
    }

    // 🆕 完工自動產生保養提醒（依更換項目比對週期表）
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await generateRemindersFromRecord(updated).catch((e) =>
        console.error('產生保養提醒失敗:', e)
      );
    }

    // 🆕 工單里程自動回寫車輛檔
    if (mileageKm != null) {
      const ws = await prisma.workshop.findUnique({ where: { id: req.workshopId }, select: { garage_name: true, company_name: true } });
      const garageLabel = ws?.garage_name || ws?.company_name || '合作車廠';
      const veh = await prisma.vehicleProfile.findUnique({ where: { id: existing.vehicle_id }, select: { current_mileage: true } });
      if (!veh || veh.current_mileage == null || parseInt(mileageKm) > veh.current_mileage) {
        await prisma.vehicleProfile.update({
          where: { id: existing.vehicle_id },
          data: {
            current_mileage: parseInt(mileageKm),
            mileage_updated_at: new Date(),
            mileage_source: 'garage',
            mileage_source_note: `${garageLabel}工單`,
          },
        });
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
