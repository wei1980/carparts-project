// src/routes/garageAppointments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const garageAuth = require('../middleware/garageAuth');

const prisma = new PrismaClient();
router.use(garageAuth);

// 設定施工照上傳目錄
const workDir = path.join(__dirname, '../../media/work_photos');
if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

// 🔒 圖片白名單：只收 jpeg/png/webp；副檔名一律由 MIME 重寫（防儲存型 XSS）
const WORK_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const safeWorkExt = m => (m === 'image/png' ? '.png' : m === 'image/webp' ? '.webp' : '.jpg');

const workUpload = multer({
  storage: multer.diskStorage({
    destination: workDir,
    filename: (req, file, cb) => {
      cb(null, `work_${req.params.id}_${Date.now()}${safeWorkExt(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, WORK_IMAGE_MIMES.includes(file.mimetype)),
});

// GET /api/garage/appointments — 車廠查看自己的預約
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = { garage_id: req.workshopId };
    if (status) where.status = status.toUpperCase();

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, phone: true } },
      },
      orderBy: { scheduled_at: 'asc' },
    });

    // 🆕 附帶本車廠標準工資表（報價時快速帶價）
    const laborFees = await prisma.garageLaborFee.findMany({
      where: { workshop_id: req.workshopId, is_active: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
    res.json(appointments.map(a => ({ ...a, labor_fees: laborFees })));
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/appointments/:id — 車廠更新預約狀態
router.patch('/:id', async (req, res) => {
  try {
    const { status, note } = req.body;
    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), garage_id: req.workshopId },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });

    const data = { status };
    if (note) data.note = note;

    const updated = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, phone: true, lineId: true } },
        garage: { select: { garage_name: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 PATCH /api/garage/appointments/:id/quote — 車廠回覆工資報價（+可同時提議時間）
// body: { quoteAmount?, quoteNote?, proposedAt? }
router.patch('/:id/quote', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quoteAmount, quoteNote, proposedAt } = req.body;

    if ((quoteAmount === undefined || quoteAmount === null || quoteAmount === '') && !proposedAt) {
      return res.status(400).json({ error: '請填寫報價金額或提議時間' });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id, garage_id: req.workshopId },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, lineId: true } },
        garage: { select: { garage_name: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      return res.status(400).json({ error: '此預約狀態不可報價（已開始或已結束）' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        quote_amount: quoteAmount !== undefined && quoteAmount !== '' ? parseInt(quoteAmount) : null,
        quote_note: quoteNote || null,
        ...(proposedAt ? { proposed_at: new Date(proposedAt), status: 'PENDING' } : {}),
      },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, lineId: true } },
        garage: { select: { garage_name: true } },
      },
    });

    // 🆕 LINE 通知客戶（失敗不擋流程）
    notifyCustomerQuote(updated);

    res.json(updated);
  } catch (error) {
    console.error('報價失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

/** 🆕 通知客戶：車廠已回覆報價 / 提議新時間 */
function notifyCustomerQuote(appt) {
  try {
    if (!appt.user?.lineId) return;
    const time = new Date(appt.scheduled_at).toLocaleString('zh-TW');
    const lines = [
      `🔔 車廠回覆您的預約`,
      `━━━━━━━━━━━━━━`,
      `🏪 ${appt.garage?.garage_name || ''}`,
      `🚗 ${appt.vehicle?.make || ''} ${appt.vehicle?.model || ''}`,
    ];
    if (appt.quote_amount != null) {
      lines.push(`💰 安裝工資報價：NT$ ${Number(appt.quote_amount).toLocaleString()}`);
      if (appt.quote_note) lines.push(`📝 說明：${appt.quote_note}`);
    }
    if (appt.proposed_at) {
      lines.push(`📅 車廠建議時間：${new Date(appt.proposed_at).toLocaleString('zh-TW')}`);
      lines.push(`（原指定：${time}）`);
    }
    lines.push(`━━━━━━━━━━━━━━`, `請至 [我的預約] 確認或重新安排。`);
    pushMessage(appt.user.lineId, lines.join('\n'));
  } catch (err) {
    console.error('客戶報價通知失敗:', err.message);
  }
}

// 🆕 PATCH /api/garage/appointments/:id/confirm — 車廠直接同意預約時間
router.patch('/:id/confirm', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const appointment = await prisma.appointment.findFirst({
      where: { id, garage_id: req.workshopId },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, lineId: true } },
        garage: { select: { garage_name: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });
    if (appointment.status !== 'PENDING') {
      return res.status(400).json({ error: `目前狀態為 ${appointment.status}，無法確認` });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED', proposed_at: null },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, lineId: true } },
        garage: { select: { garage_name: true } },
      },
    });

    // 🆕 通知客戶預約已確認（複用既有通知；帶齊關聯資料）
    try {
      const { notifyAppointmentUpdate } = require('../services/lineService');
      notifyAppointmentUpdate(updated);
    } catch (err) {
      console.error('確認通知失敗:', err.message);
    }

    res.json(updated);
  } catch (error) {
    console.error('確認預約失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 POST /api/garage/appointments/:id/work-photo — 上傳施工照
router.post('/:id/work-photo', workUpload.single('photo'), async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), garage_id: req.workshopId },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });

    if (!req.file) return res.status(400).json({ error: '請上傳照片' });

    const photoUrl = `/media/work_photos/${req.file.filename}`;

    // 將照片路徑加入 note 或 garage_slots（使用 note 欄位儲存 JSON）
    let photos = [];
    if (appointment.note) {
      try {
        const parsed = JSON.parse(appointment.note);
        photos = parsed.workPhotos || [];
      } catch {}
    }
    photos.push({ url: photoUrl, time: new Date().toISOString() });

    await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: { note: JSON.stringify({ workPhotos: photos }) },
    });

    res.json({ success: true, photoUrl, photos });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;