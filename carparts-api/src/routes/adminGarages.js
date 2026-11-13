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
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🆕 DELETE /api/admin/garages/:id — 刪除車廠
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 檢查是否有關聯預約
    const appointmentCount = await prisma.appointment.count({
      where: { garage_id: id },
    });

    if (appointmentCount > 0) {
      return res.status(400).json({
        error: `此車廠有 ${appointmentCount} 筆預約記錄，無法刪除。請先停用帳號（is_active: false）。`,
      });
    }

    await prisma.workshop.delete({ where: { id } });
    res.json({ success: true, message: '車廠已刪除' });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;