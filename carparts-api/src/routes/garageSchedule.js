const express = require('express');
const router = express.Router();
const garageAuth = require('../middleware/garageAuth');
const { notifyAppointmentUpdate } = require('../services/lineService');

const prisma = require('../lib/prisma');
router.use(garageAuth);

// ==================== 車位/工位管理 ====================

// GET /api/garage/bays - 取得車廠工位配置
router.get('/bays', async (req, res) => {
  try {
    const garage = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      select: { garage_slots: true }
    });
    res.json(garage?.garage_slots || { bays: [], technicians: [] });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/garage/bays - 更新工位配置
router.patch('/bays', async (req, res) => {
  try {
    const { bays, technicians } = req.body;
    
    const garage = await prisma.workshop.update({
      where: { id: req.workshopId },
      data: { garage_slots: { bays: bays || [], technicians: technicians || [] } },
      select: { garage_slots: true }
    });
    res.json(garage.garage_slots);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// ==================== 排程管理 - 日曆視圖 ====================

// GET /api/garage/schedule - 取得排程 (日/週/月視圖)
router.get('/schedule', async (req, res) => {
  try {
    const { view = 'week', date, technicianId } = req.query;
    const baseDate = date ? new Date(date) : new Date();
    
    let startDate, endDate;
    if (view === 'day') {
      startDate = new Date(baseDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(baseDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      const day = baseDate.getDay();
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else { // month
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const where = {
      garage_id: req.workshopId,
      scheduled_at: { gte: startDate, lte: endDate }
    };
    // Appointment 沒有 technician_id，若需依技師篩選需先查 WorkOrder 關聯
    // if (req.query.technicianId) where.technician_id = req.query.technicianId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true, variant: true } },
        user: { select: { name: true, phone: true, lineId: true } },
        // Appointment 模型沒有 technician 關聯，技師資訊在 WorkOrder 上
      },
      orderBy: { scheduled_at: 'asc' }
    });

    // 取得技師列表（從已有工單記錄中找出的技師，或直接找關聯此車廠的 EndUser）
    const workOrderTechs = await prisma.workOrder.findMany({
      where: { garage_id: req.workshopId },
      select: { technician_id: true, technician: { select: { id: true, name: true } } },
      distinct: ['technician_id']
    });
    const technicianIds = [...new Set(workOrderTechs.map(w => w.technician_id).filter(Boolean))];
    let formattedTechnicians = [];
    if (technicianIds.length > 0) {
      const technicians = await prisma.endUser.findMany({
        where: { id: { in: technicianIds } },
        select: { id: true, name: true }
      });
      formattedTechnicians = technicians.map(t => ({ 
        id: t.id, 
        name: t.name, 
        color: '#3b82f6' 
      }));
    }

    // 取得車位/工位資訊
    const garage = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      select: { garage_slots: true }
    });
    const slots = garage?.garage_slots || {};
    const bays = (slots && Array.isArray(slots.bays)) ? slots.bays : [];
    const slotTechnicians = (slots && Array.isArray(slots.technicians)) ? slots.technicians : [];

    res.json({
      view,
      date: baseDate,
      startDate,
      endDate,
      appointments,
      technicians: formattedTechnicians,
      garage_slots: { bays, technicians: slotTechnicians }
    });
  } catch (error) {
    console.error('取得排程失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/garage/schedule - 建立/更新排程
router.post('/schedule', async (req, res) => {
  try {
    const { 
      vehicleId, 
      scheduledAt, 
      serviceType,
      notes,
      proposedAt,
      userId
    } = req.body;

    const appointment = await prisma.appointment.create({
      data: {
        garage_id: req.workshopId,
        vehicle_id: vehicleId,
        user_id: userId,
        scheduled_at: new Date(scheduledAt),
        service_type: serviceType || 'MAINTENANCE',
        note: notes || null,
        status: 'PENDING',
        proposed_at: proposedAt ? new Date(proposedAt) : null
      },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } }
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('建立排程失敗:', error);
    res.status(500).json({ error: '建立排程失敗' });
  }
});

// PATCH /api/garage/schedule/:id - 更新排程
router.patch('/schedule/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { scheduledAt, status, note } = req.body;

    const existing = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), garage_id: req.workshopId }
    });
    if (!existing) return res.status(404).json({ error: '排程不存在' });

    const data = {};
    if (scheduledAt) data.scheduled_at = new Date(scheduledAt);
    if (status) data.status = status.toUpperCase();
    if (note !== undefined) data.note = note;

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新排程失敗' });
  }
});

// DELETE /api/garage/schedule/:id - 刪除/取消排程
router.delete('/schedule/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), garage_id: req.workshopId }
    });
    if (!existing) return res.status(404).json({ error: '排程不存在' });

    // 只允許刪除非進行中的預約
    if (['IN_PROGRESS', 'COMPLETED'].includes(existing.status)) {
      return res.status(400).json({ error: '無法刪除進行中或已完成的排程' });
    }

    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: '排程已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除失敗' });
  }
});

// ==================== 技師派工管理 ====================

// GET /api/garage/technicians - 取得技師列表與排程
router.get('/technicians', async (req, res) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { workshop_id: req.workshopId, role: 'TECHNICIAN' },
      select: {
        id: true,
        name: true,
        phone: true,
        lineId: true,
        color: true,
        avatar: true,
        is_active: true,
        created_at: true
      }
    });

    // 取得每位技師今日/本週排程
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await prisma.appointment.findMany({
      where: {
        garage_id: req.workshopId,
        technician_id: { in: technicians.map(t => t.id) },
        scheduled_at: { gte: new Date(), lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        technician_id: true,
        scheduled_at: true,
        duration_minutes: true,
        status: true,
        vehicle: { select: { make: true, model: true, licensePlate: true } }
      },
      orderBy: { scheduled_at: 'asc' }
    });

    // 整理每位技師的排程
    const techniciansWithSchedule = technicians.map(tech => ({
      ...tech,
      todayAppointments: schedules.filter(s => s.technician_id === tech.id && new Date(s.scheduled_at).toDateString() === new Date().toDateString()),
      weekAppointments: schedules.filter(s => s.technician_id === tech.id)
    }));

    res.json(techniciansWithSchedule);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PATCH /api/garage/technicians/:id/assign - 派工
router.patch('/technicians/:id/assign', async (req, res) => {
  try {
    const techId = req.params.id;
    const { appointmentIds } = req.body;

    if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({ error: '請提供要派工的預約 ID 陣列' });
    }

    const tech = await prisma.user.findFirst({
      where: { id: req.params.id, workshop_id: req.workshopId, role: 'TECHNICIAN' }
    });
    if (!tech) return res.status(404).json({ error: '技師不存在' });

    // 批次指派
    const updated = await prisma.appointment.updateMany({
      where: {
        id: { in: appointmentIds.map(id => parseInt(id)) },
        garage_id: req.workshopId
      },
      data: { technician_id: req.params.id }
    });

    res.json({ success: true, assignedCount: updated.count });
  } catch (error) {
    res.status(500).json({ error: '派工失敗' });
  }
});

// PATCH /api/garage/technicians/:id/schedule - 更新技師排班
router.patch('/technicians/:id/schedule', async (req, res) => {
  try {
    const { weeklySchedule, isActive } = req.body;
    
    const tech = await prisma.user.update({
      where: { id: req.params.id, workshop_id: req.workshopId, role: 'TECHNICIAN' },
      data: {
        weekly_schedule: weeklySchedule || undefined,
        is_active: isActive !== undefined ? isActive : undefined
      },
      select: { id: true, name: true, weekly_schedule: true, is_active: true }
    });

    res.json(tech);
  } catch (error) {
    res.status(500).json({ error: '更新排班失敗' });
  }
});

// ==================== 工位/車位管理 ====================

// GET /api/garage/bays - 取得車位/工位配置
router.get('/bays', async (req, res) => {
  try {
    const garage = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      select: { garage_slots: true }
    });
    res.json(garage?.garage_slots || { bays: [], technicians: [] });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PATCH /api/garage/bays - 更新車位/工位配置
router.patch('/bays', async (req, res) => {
  try {
    const { bays, technicians } = req.body;
    
    const garage = await prisma.workshop.update({
      where: { id: req.workshopId },
      data: { garage_slots: { bays: bays || [], technicians: technicians || [] } },
      select: { garage_slots: true }
    });
    res.json(garage.garage_slots);
  } catch (error) {
    res.status(500).json({ error: '更新車位配置失敗' });
  }
});

// POST /api/garage/bays/:bayId/assign - 指派車位給預約
router.post('/bays/:bayId/assign', async (req, res) => {
  try {
    const { appointmentIds } = req.body;
    const bayId = req.params.bayId;

    // 檢查車位是否存在
    const garage = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      select: { garage_slots: true }
    });
    const bay = garage?.garage_slots?.bays?.find(b => b.id === req.params.bayId);
    if (!bay) return res.status(404).json({ error: '車位不存在' });

    // 指派預約到車位
    const updated = await prisma.appointment.updateMany({
      where: { id: { in: appointmentIds.map(id => parseInt(id)) }, garage_id: req.workshopId },
      data: { bay_id: req.params.bayId }
    });

    res.json({ success: true, assignedCount: updated.count });
  } catch (error) {
    res.status(500).json({ error: '指派車位失敗' });
  }
});

module.exports = router;