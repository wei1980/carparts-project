// src/routes/appointments.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { pushMessage } = require('../services/lineService');
const { getBookingCapacity } = require('../utils/bookingCapacity');
const prisma = require('../lib/prisma');

router.use(auth);

// GET /api/appointments/installable-items — 可安裝的訂單零件（已完成/已出貨訂單）
router.get('/installable-items', async (req, res) => {
  try {
    const orders = await prisma.consumerOrder.findMany({
      where: {
        userId: req.userId,
        status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] },
      },
      include: { items: { include: { part: { select: { id: true, sku: true, name: true, brand: true } } } } },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const items = [];
    for (const o of orders) {
      for (const it of o.items) {
        items.push({
          orderId: o.id,
          orderNumber: o.order_number,
          orderStatus: o.status,
          partId: it.part_id,
          sku: it.part?.sku || it.sku_snapshot,
          name: it.part?.name || it.name_snapshot,
          brand: it.part?.brand || '',
          qty: it.qty,
        });
      }
    }
    res.json(items);
  } catch (error) {
    console.error('可安裝項目查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

/** 🆕 預約建立後 LINE 通知車廠（含安裝項目） */
async function notifyGarageNewAppointment(appointment) {
  try {
    const garage = await prisma.workshop.findUnique({
      where: { id: appointment.garage_id },
      select: { line_id: true, garage_name: true },
    });
    if (!garage?.line_id) return;

    const vehicle = appointment.vehicle;
    const user = appointment.user;
    const time = new Date(appointment.scheduled_at).toLocaleString('zh-TW');

    let itemsText = '';
    if (Array.isArray(appointment.install_items) && appointment.install_items.length > 0) {
      itemsText = '🔧 安裝項目：\n' + appointment.install_items
        .map(it => `　· ${it.name} ×${it.qty}`).join('\n') + '\n';
    }

    const message = [
      `📅 新的安裝預約`,
      `━━━━━━━━━━━━━━`,
      `🚗 車輛：${vehicle?.make || ''} ${vehicle?.model || ''} (${vehicle?.licensePlate || '無車牌'})`,
      `👤 客戶：${user?.name || ''} ${user?.phone ? `(${user.phone})` : ''}`,
      `📅 指定時間：${time}`,
      itemsText,
      appointment.note ? `📝 備註：${appointment.note}` : '',
      `━━━━━━━━━━━━━━`,
      `請至管理後台確認時間；如需特別報價工資請填寫報價。`,
    ].filter(Boolean).join('\n');

    await pushMessage(garage.line_id, message);
  } catch (err) {
    console.error('車廠新預約通知失敗:', err.message);
  }
}

// POST /api/appointments — 建立預約
router.post('/', async (req, res) => {
  try {
    const { vehicleId, garageId, serviceType, scheduledAt, note, partIds, installItems, mileageKm } = req.body;

    if (!vehicleId || !garageId || !scheduledAt) {
      return res.status(400).json({ error: 'vehicleId, garageId, scheduledAt 為必填' });
    }

    // 里程（選填）：只接受合理範圍，稍後寫回車輛
    let parsedMileage = null;
    if (mileageKm !== undefined && mileageKm !== null && mileageKm !== '') {
      parsedMileage = parseInt(mileageKm, 10);
      if (!Number.isInteger(parsedMileage) || parsedMileage < 0 || parsedMileage > 2000000) {
        return res.status(400).json({ error: '目前里程格式不正確' });
      }
    }

    // 確認車輛屬於該車主
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: vehicleId, userId: req.userId },
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    // 確認車廠存在且為合作車廠
    const garage = await prisma.workshop.findFirst({
      where: { id: parseInt(garageId), is_garage: true, is_active: true },
    });
    if (!garage) return res.status(404).json({ error: '車廠不存在' });

    // 🆕 營業時間驗證：公休日 / 營業時段外不可預約（未設定 opening_hours 則不擋）
    const apptDate = new Date(scheduledAt);
    if (isNaN(apptDate.getTime())) return res.status(400).json({ error: '預約時間格式錯誤' });
    if (apptDate < new Date()) return res.status(400).json({ error: '預約時間不能是過去' });

    const parseJson = (v) => {
      if (v == null) return null;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return null; }
    };
    const hours = parseJson(garage.opening_hours);
    if (hours && typeof hours === 'object') {
      const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = DAY_KEYS[apptDate.getDay()];
      const range = hours[dayKey];
      if (!range) {
        return res.status(400).json({ error: `${garage.garage_name || '該車廠'} ${dayKey === 'sun' ? '週日' : '週' + ['一','二','三','四','五','六'][apptDate.getDay() - 1]}公休，請選擇其他日期` });
      }
      const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(String(range));
      if (m) {
        const minutes = apptDate.getHours() * 60 + apptDate.getMinutes();
        const openMin = parseInt(m[1]) * 60 + parseInt(m[2]);
        const closeMin = parseInt(m[3]) * 60 + parseInt(m[4]);
        if (minutes < openMin || minutes >= closeMin) {
          return res.status(400).json({ error: `營業時間為 ${range}，請選擇營業時段內的時間` });
        }
        // 最後入場：收店前 60 分鐘不再收預約
        if (minutes > closeMin - 60) {
          return res.status(400).json({ error: `收店前一小時不再接受預約（營業至 ${range.split('-')[1]}）` });
        }
      }
    }

    // 里程只往前寫：比目前紀錄新才更新，避免把車廠/較新的資料蓋回去
    const shouldUpdateMileage = parsedMileage != null
      && (vehicle.current_mileage == null || parsedMileage > vehicle.current_mileage);

    // ⚠️ 容量檢查必須在交易「內」做，且用 Serializable 隔離等級。
    //    原本 count 在交易外、create 在交易內 → 10 個並發請求全部通過檢查，
    //    容量設 1 仍寫入 10 筆（實測 10/10 都 201）。
    //    這裡把 count + create 放進同一個 Serializable 交易；
    //    若並發造成序列化衝突（P2034），回 409 讓使用者重送。
    // ⚠️ 「同一時段」的定義必須和 /api/garages/:id/availability 一致，
    //    否則前端看到「可預約」卻在送出時被 409 擋掉。
    //    availability 以「時:分」分桶（10:00 與 10:01 算不同時段），
    //    所以這裡也用同一分鐘桶，而不是 ±60 秒滑動視窗
    //    （滑動視窗會把 10:00 與 10:01 判為同一時段 → 顯示可預約但送出失敗）。
    const capacity = getBookingCapacity(garage.garage_slots);
    const slotStart = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(),
      apptDate.getHours(), apptDate.getMinutes(), 0, 0);
    const slotEnd = new Date(slotStart.getTime() + 60 * 1000);

    let appointment;
    try {
      appointment = await prisma.$transaction(async (tx) => {
        // 🔒 用 PostgreSQL advisory lock 序列化「同一車廠的預約寫入」。
        //    只靠 Serializable 會把「容量 3、10 筆並發」誤判成只准 1 筆
        //    （其餘 9 筆全被 P2034 打回，使用者看到「被搶先預約」但明明還有位）。
        //    鎖 garage 層級 → 同廠預約排隊進來、逐一檢查容量，
        //    容量 3 就能真的寫入 3 筆；跨廠互不影響。
        const lockKey = parseInt(garageId, 10) || 0;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        const existingCount = await tx.appointment.count({
          where: {
            garage_id: parseInt(garageId),
            scheduled_at: { gte: slotStart, lt: slotEnd },
            status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'] },
          },
        });
        if (existingCount >= capacity) {
          throw Object.assign(
            new Error(`這個時段已滿（同時可接 ${capacity} 台），請選擇其他時間。`),
            { code: 'SLOT_TAKEN' },
          );
        }

        const created = await tx.appointment.create({
          data: {
            vehicle_id: vehicleId,
            garage_id: parseInt(garageId),
            user_id: req.userId,
            service_type: serviceType || (installItems?.length ? '安裝訂單零件' : '保養'),
            scheduled_at: new Date(scheduledAt),
            note: note || '',
            part_ids: partIds || [],
            install_items: Array.isArray(installItems) && installItems.length > 0 ? installItems : null,
          },
          include: {
            vehicle: { select: { make: true, model: true, licensePlate: true } },
            user: { select: { name: true, phone: true, lineId: true } },
          },
        });

        if (shouldUpdateMileage) {
          await tx.vehicleProfile.update({
            where: { id: vehicleId },
            data: {
              current_mileage: parsedMileage,
              mileage_updated_at: new Date(),
              mileage_source: 'customer',
              mileage_source_note: '線上預約填寫',
            },
          });
        }

        return created;
      });
    } catch (e) {
      if (e?.code === 'SLOT_TAKEN') {
        return res.status(409).json({ code: 'SLOT_TAKEN', error: e.message });
      }
      // P2034 = 寫入衝突/死結（Serializable 下兩筆同時搶同一時段）
      if (e?.code === 'P2034' || e?.code === 'P2028') {
        return res.status(409).json({
          code: 'SLOT_RACE',
          error: '這個時段剛好被搶先預約，請重新選擇時間。',
        });
      }
      throw e;
    }

    // 🆕 LINE 通知車廠（失敗不擋流程）
    notifyGarageNewAppointment(appointment);

    res.status(201).json({ ...appointment, mileage_updated: shouldUpdateMileage });
  } catch (error) {
    console.error('建立預約失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 POST /api/appointments/:id/accept-quote — 客戶接受車廠報價（→ CONFIRMED）
//    原本車主只能「同意時間」或「取消整筆預約」：報價太貴時沒有地方回話，
//    只能取消重約，車廠就流失這筆生意。加上接受 / 還價兩個出口。
router.post('/:id/accept-quote', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        garage: { select: { garage_name: true, phone: true, line_id: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });
    if (appointment.quote_amount == null) {
      return res.status(400).json({ error: '車廠尚未提供報價' });
    }
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      return res.status(400).json({ error: `目前狀態 ${appointment.status}，無法回覆報價` });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        quote_accepted: true,
        status: 'CONFIRMED',
        ...(appointment.proposed_at
          ? { scheduled_at: appointment.proposed_at, proposed_at: null }
          : {}),
      },
    });

    try {
      if (appointment.garage?.line_id) {
        await pushMessage(
          appointment.garage.line_id,
          `✅ 客戶已接受報價\n` +
          `NT$ ${Number(appointment.quote_amount).toLocaleString()}\n` +
          `🚗 ${appointment.vehicle?.make || ''} ${appointment.vehicle?.model || ''}`
        );
      }
    } catch (err) { console.error('通知車廠失敗:', err.message); }

    res.json(updated);
  } catch (error) {
    console.error('接受報價失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 POST /api/appointments/:id/counter-quote — 客戶還價（→ 回 PENDING，通知車廠）
//    body: { counterAmount, message? }
router.post('/:id/counter-quote', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        garage: { select: { garage_name: true, line_id: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });
    if (appointment.quote_amount == null) {
      return res.status(400).json({ error: '車廠尚未提供報價' });
    }

    const counterAmount = parseInt(req.body.counterAmount, 10);
    if (!Number.isFinite(counterAmount) || counterAmount <= 0) {
      return res.status(400).json({ error: '請填寫有效的還價金額' });
    }
    if (counterAmount > appointment.quote_amount) {
      return res.status(400).json({ error: '還價金額不可高於車廠報價' });
    }

    const message = req.body.message ? String(req.body.message).slice(0, 500) : null;
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        counter_amount: counterAmount,
        counter_note: message,
        countered_at: new Date(),
        status: 'PENDING', // 回到待確認，等車廠回覆
      },
    });

    try {
      if (appointment.garage?.line_id) {
        await pushMessage(
          appointment.garage.line_id,
          `💰 客戶還價：NT$ ${counterAmount.toLocaleString()}\n` +
          `📋 車廠報價：NT$ ${Number(appointment.quote_amount).toLocaleString()}\n` +
          `🚗 ${appointment.vehicle?.make || ''} ${appointment.vehicle?.model || ''}` +
          (message ? `\n📝 ${message}` : '')
        );
      }
    } catch (err) { console.error('通知車廠失敗:', err.message); }

    res.json(updated);
  } catch (error) {
    console.error('還價失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 POST /api/appointments/:id/accept-proposal — 客戶同意車廠提議的新時間（→ CONFIRMED）
router.post('/:id/accept-proposal', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, lineId: true } },
        garage: { select: { garage_name: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });
    if (!appointment.proposed_at) return res.status(400).json({ error: '車廠尚未提議新時間' });
    if (appointment.status !== 'PENDING') {
      return res.status(400).json({ error: `目前狀態 ${appointment.status}，無法確認` });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { scheduled_at: appointment.proposed_at, status: 'CONFIRMED', proposed_at: null },
    });

    // 通知車廠：客戶已接受
    try {
      const garage = await prisma.workshop.findUnique({
        where: { id: updated.garage_id },
        select: { line_id: true, garage_name: true },
      });
      if (garage?.line_id) {
        pushMessage(garage.line_id,
          `✅ 客戶已接受建議時間\n📅 新時間：${new Date(updated.scheduled_at).toLocaleString('zh-TW')}\n🚗 ${appointment.vehicle?.make || ''} ${appointment.vehicle?.model || ''}`);
      }
    } catch (err) { console.error('通知車廠失敗:', err.message); }

    res.json(updated);
  } catch (error) {
    console.error('客戶接受提議失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/appointments — 查詢車主的預約
router.get('/', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { user_id: req.userId },
      include: {
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
        garage: { select: { id: true, garage_name: true, garage_address: true, garage_phone: true } },
      },
      orderBy: { scheduled_at: 'desc' },
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/appointments/:id — 取消預約
router.patch('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.userId },
    });
    if (!appointment) return res.status(404).json({ error: '預約不存在' });

    const updated = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;