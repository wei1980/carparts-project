// src/routes/adminStockAlerts.js — 🆕 低庫存警示設定與手動檢查（Admin）
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');
const { checkLowStock, getStockSettings, DEFAULTS } = require('../services/stockAlertService');

router.use(adminAuth);

// GET /api/admin/stock-alerts — 取得目前警示設定
router.get('/', async (req, res) => {
  try {
    const cfg = await getStockSettings();
    res.json(cfg);
  } catch (error) {
    console.error('取得低庫存設定失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/stock-alerts — 更新警示設定（寫入 ADMIN garage_slots.system）
router.patch('/', async (req, res) => {
  try {
    const admin = await prisma.workshop.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return res.status(404).json({ error: '找不到管理員' });

    const slots = admin.garage_slots || {};
    const system = { ...(slots.system || {}) };

    if (req.body.lowStockEnabled !== undefined) system.lowStockEnabled = Boolean(req.body.lowStockEnabled);
    if (req.body.lowStockThreshold !== undefined) {
      const t = parseInt(req.body.lowStockThreshold);
      if (!(t >= 0)) return res.status(400).json({ error: '門檻必須 ≥ 0' });
      system.lowStockThreshold = t;
    }
    if (req.body.lowStockIntervalHours !== undefined) {
      const h = parseInt(req.body.lowStockIntervalHours);
      if (!(h >= 1 && h <= 168)) return res.status(400).json({ error: '間隔需 1–168 小時' });
      system.lowStockIntervalHours = h;
    }

    await prisma.workshop.update({ where: { id: admin.id }, data: { garage_slots: { ...slots, system } } });

    const cfg = await getStockSettings();
    res.json({ success: true, settings: cfg });
  } catch (error) {
    console.error('更新低庫存設定失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/stock-alerts/check — 手動觸發一次低庫存檢查（force 忽略節流）
router.post('/check', async (req, res) => {
  try {
    const result = await checkLowStock({ force: req.query.force === '1' });
    res.json(result);
  } catch (error) {
    console.error('手動低庫存檢查失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;