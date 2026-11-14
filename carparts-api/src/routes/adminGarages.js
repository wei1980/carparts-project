// src/routes/adminGarages.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');

router.use(adminAuth);

// GET /api/admin/garages — 取得所有 Workshop（可篩選是否為車廠）
router.get('/', async (req, res) => {
  try {
    const { isGarage } = req.query;
    const where = {};
    if (isGarage === 'true') where.is_garage = true;
    if (isGarage === 'false') where.is_garage = false;

    const workshops = await prisma.workshop.findMany({
      where,
      select: {
        id: true,
        company_name: true,
        email: true,
        phone: true,
        is_garage: true,
        is_approved: true,
        is_active: true,
        garage_name: true,
        garage_phone: true,
        garage_address: true,
        contact_person: true,
        lat: true,
        lng: true,
        garage_slots: true,
        rating: true,
        role: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(workshops);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/garages/:id — 設定/更新車廠資訊
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      is_garage,
      is_approved,
      is_active,
      garage_name,
      garage_phone,
      garage_address,
      lat,
      lng,
      garage_slots,
      phone,
      password,
      contact_person,
      company_name,
    } = req.body;

    // 🔒 車廠管理端點不得用來改動 ADMIN 帳號：
    //    否則管理員可把自己停用 / 取消審核（實測會真的 200 並把自己鎖在外面），
    //    或重設其他管理員密碼。ADMIN 帳號請用 /api/admin/users 或直接改 DB。
    const target = await prisma.workshop.findUnique({ where: { id }, select: { role: true } });
    if (!target) return res.status(404).json({ error: '帳號不存在' });
    if (target.role === 'ADMIN') {
      return res.status(403).json({ error: '此端點不可修改管理員帳號' });
    }

    const data = {};
    if (is_garage !== undefined) data.is_garage = is_garage;
    if (is_approved !== undefined) data.is_approved = is_approved;
    if (is_active !== undefined) data.is_active = is_active;
    if (garage_name !== undefined) data.garage_name = garage_name;
    if (garage_phone !== undefined) data.garage_phone = garage_phone;
    if (garage_address !== undefined) data.garage_address = garage_address;
    if (lat !== undefined) data.lat = lat;
    if (lng !== undefined) data.lng = lng;
    if (garage_slots !== undefined) data.garage_slots = garage_slots;
    if (phone !== undefined) data.phone = phone;
    if (contact_person !== undefined) data.contact_person = contact_person;
    if (company_name !== undefined) data.company_name = company_name;

    // 密碼加密
    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.workshop.update({ where: { id }, data });
    // 🔒 不要把 password_hash 回給前端
    const { password_hash: _omit, ...safe } = updated;
    res.json(safe);
  } catch (error) {
    console.error('更新車廠失敗:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '手機號碼已被其他帳號使用' });
    }
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 DELETE /api/admin/garages/:id — 刪除車廠
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 🔒 不可刪 ADMIN 帳號（會把唯一的管理員移除，全站失去後台權限）
    const target = await prisma.workshop.findUnique({ where: { id }, select: { role: true } });
    if (!target) return res.status(404).json({ error: '帳號不存在' });
    if (target.role === 'ADMIN') {
      return res.status(403).json({ error: '不可刪除管理員帳號' });
    }

    // ⚠️ 原本只檢查 Appointment，但車廠同時被多張表引用：
    //    Appointment / ConsumerOrder(garage_id?) / ServiceRecord / WorkOrder /
    //    GarageReview / Order(供應商) … → 直接 delete 會被 FK 擋下 → 500
    const [appointmentCount, orderCount, recordCount, workOrderCount, reviewCount, bayCount] = await Promise.all([
      prisma.appointment.count({ where: { garage_id: id } }),
      prisma.order.count({ where: { workshop_id: id } }).catch(() => 0),
      prisma.bay.count({ where: { garage_id: id } }).catch(() => 0),
      prisma.serviceRecord.count({ where: { garage_id: id } }).catch(() => 0),
      prisma.workOrder.count({ where: { garage_id: id } }).catch(() => 0),
      prisma.garageReview.count({ where: { garage_id: id } }).catch(() => 0),
    ]);

    const total = appointmentCount + orderCount + recordCount + workOrderCount + reviewCount + bayCount;
    if (total > 0) {
      const detail = [
        appointmentCount ? `${appointmentCount} 筆預約` : '',
        orderCount ? `${orderCount} 筆訂單` : '',
        recordCount ? `${recordCount} 筆維修紀錄` : '',
        workOrderCount ? `${workOrderCount} 筆工單` : '',
        reviewCount ? `${reviewCount} 筆評價` : '',
        bayCount ? `${bayCount} 個工位` : '',
      ].filter(Boolean).join('、');
      return res.status(409).json({
        code: 'GARAGE_IN_USE',
        error: `此車廠有 ${detail}，為保留交易紀錄無法刪除。請改用停用（is_active: false）。`,
      });
    }

    await prisma.workshop.delete({ where: { id } });
    res.json({ success: true, message: '車廠已刪除' });
  } catch (error) {
    console.error('刪除車廠失敗:', error);
    if (error.code === 'P2003') {
      return res.status(409).json({
        code: 'GARAGE_IN_USE',
        error: '此車廠仍被其他紀錄引用，無法刪除。請改用停用。',
      });
    }
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;