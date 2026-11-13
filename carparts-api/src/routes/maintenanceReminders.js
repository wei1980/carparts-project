// src/routes/maintenanceReminders.js — 車主端：保養提醒管理
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { withDueStates } = require('../services/maintenanceReminderService');

const prisma = require('../lib/prisma');
router.use(auth);

// GET /api/maintenance-reminders — 我的提醒（含到期狀態）
router.get('/', async (req, res) => {
  try {
    const { vehicleId } = req.query;
    const where = { user_id: req.userId };
    if (vehicleId) where.vehicle_id = vehicleId;

    // ⚠️ MaintenanceReminder 沒有 vehicle 關聯（schema 只有 vehicle_id 純欄位），
    // 因此 include: { vehicle: ... } 會讓整個端點 500。改為批次抓取後併入。
    const reminders = await prisma.maintenanceReminder.findMany({
      where,
      orderBy: [{ enabled: 'desc' }, { due_date: 'asc' }],
    });

    // 取各車最新工單里程作為當前里程參考（含車輛基本資料）
    const vehicleIds = [...new Set(reminders.map((r) => r.vehicle_id))];
    const mileageMap = {};
    const vehicleMap = {};
    if (vehicleIds.length > 0) {
      const [vehicles, lastRecords] = await Promise.all([
        prisma.vehicleProfile.findMany({
          where: { id: { in: vehicleIds }, userId: req.userId },
          select: { id: true, make: true, model: true, licensePlate: true },
        }),
        prisma.serviceRecord.findMany({
          where: { vehicle_id: { in: vehicleIds }, mileage_km: { not: null } },
          orderBy: { completed_at: 'desc' },
          select: { vehicle_id: true, mileage_km: true },
        }),
      ]);
      for (const v of vehicles) {
        vehicleMap[v.id] = { id: v.id, make: v.make, model: v.model, licensePlate: v.licensePlate };
      }
      // findMany 已依 completed_at 遞減排序，故每個 vehicle_id 的第一筆即最新里程
      for (const rec of lastRecords) {
        if (rec.mileage_km != null && mileageMap[rec.vehicle_id] == null) {
          mileageMap[rec.vehicle_id] = rec.mileage_km;
        }
      }
    }

    const withVehicle = reminders.map((r) => ({ ...r, vehicle: vehicleMap[r.vehicle_id] || null }));

    res.json(await withDueStates(withVehicle, mileageMap));
  } catch (error) {
    console.error('查詢保養提醒失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/maintenance-reminders — 手動新增自訂提醒
router.post('/', async (req, res) => {
  try {
    const { vehicleId, title, intervalKm, intervalDays, baseMileage, dueDate } = req.body;
    if (!vehicleId || !title) return res.status(400).json({ error: 'vehicleId、title 為必填' });

    const vehicle = await prisma.vehicleProfile.findFirst({ where: { id: vehicleId, userId: req.userId } });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const reminder = await prisma.maintenanceReminder.create({
      data: {
        user_id: req.userId,
        vehicle_id: vehicleId,
        title,
        interval_km: intervalKm != null ? parseInt(intervalKm) : null,
        interval_days: intervalDays != null ? parseInt(intervalDays) : null,
        base_mileage: baseMileage != null ? parseInt(baseMileage) : null,
        due_date: dueDate ? new Date(dueDate) : null,
        source: 'MANUAL',
      },
    });
    res.status(201).json(reminder);
  } catch (error) {
    console.error('建立提醒失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/maintenance-reminders/:id — 調整週期 / 開關 / 完成後重設基準
router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.maintenanceReminder.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
    });
    if (!existing) return res.status(404).json({ error: '提醒不存在' });

    const { intervalKm, intervalDays, dueDate, enabled, resetWith } = req.body;
    const data = {};
    if (intervalKm !== undefined) data.interval_km = intervalKm == null ? null : parseInt(intervalKm);
    if (intervalDays !== undefined) data.interval_days = intervalDays == null ? null : parseInt(intervalDays);
    if (dueDate !== undefined) data.due_date = dueDate ? new Date(dueDate) : null;
    if (enabled !== undefined) data.enabled = Boolean(enabled);

    // 「我保養好了」：以今天 + 目前里程重設下次到期基準
    if (resetWith) {
      const { currentMileage } = resetWith;
      if (existing.interval_days) data.due_date = new Date(Date.now() + existing.interval_days * 86400000);
      if (existing.interval_km && currentMileage != null) data.base_mileage = parseInt(currentMileage);
      else if (existing.interval_km && !currentMileage) data.base_mileage = null; // 缺里程則只靠日期
    }

    const updated = await prisma.maintenanceReminder.update({ where: { id: existing.id }, data });
    res.json(updated);
  } catch (error) {
    console.error('更新提醒失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/maintenance-reminders/:id — 刪除提醒
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.maintenanceReminder.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
    });
    if (!existing) return res.status(404).json({ error: '提醒不存在' });
    await prisma.maintenanceReminder.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
