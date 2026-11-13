// src/routes/adminSettings.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');

router.use(adminAuth);

// GET /api/admin/settings — 取得系統設定
router.get('/', async (req, res) => {
  try {
    // 使用 garage_slots 儲存系統設定（暫時方案，可另建 SystemConfig 表）
    const admin = await prisma.workshop.findFirst({
      where: { role: 'ADMIN' },
      select: { garage_slots: true },
    });

    const settings = admin?.garage_slots?.system || {
      lineNotifyEnabled: true,
      notifyOnConfirm: true,
      notifyOnComplete: true,
      notifyOnCancel: true,
      notifyOnOrderPaid: true,
      notifyOnOrderShipped: true,
      orderFeeEnabled: false,
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/settings — 更新系統設定
router.patch('/', async (req, res) => {
  try {
    const settings = req.body;

    const admin = await prisma.workshop.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) return res.status(404).json({ error: '找不到管理員' });

    // 🔒 欄位白名單＋驗證：避免 PATCH 整包覆寫掉未知鍵
    const ALLOWED = ['lineNotifyEnabled', 'notifyOnConfirm', 'notifyOnComplete', 'notifyOnCancel',
      'notifyOnOrderPaid', 'notifyOnOrderShipped', 'notifyOnArrival', 'notifyOnPoCreated', 'notifyOnPoStatus', 'notifyChannel',
      'orderFeeEnabled']; // 🆕 訂單加收運費與稅金開關
    const clean = {};
    for (const k of ALLOWED) {
      if (settings[k] === undefined) continue;
      if (k === 'notifyChannel') {
        if (!['line', 'telegram', 'both', 'off'].includes(settings.notifyChannel)) {
          return res.status(400).json({ error: 'notifyChannel 僅接受 line / telegram / both / off' });
        }
        clean[k] = settings[k];
      } else {
        clean[k] = Boolean(settings[k]);
      }
    }
    if (Object.keys(clean).length === 0) {
      return res.status(400).json({ error: '沒有可更新的設定欄位' });
    }

    const currentSlots = admin.garage_slots || {};
    currentSlots.system = { ...(currentSlots.system || {}), ...clean };

    // 系統級設定為全站等級：同步至所有管理員列（本系統為單一店鋪），
    // 避免 findFirst 無 orderBy 時讀寫命中不同管理員列而導致設定不一致
    await prisma.workshop.updateMany({
      where: { role: 'ADMIN' },
      data: { garage_slots: currentSlots },
    });

    res.json({ success: true, settings: currentSlots.system });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 🧪 POST /api/admin/settings/notify-test — 發測試訊息驗證通道設定
router.post('/notify-test', async (req, res) => {
  try {
    const admin = await prisma.workshop.findFirst({
      where: { role: 'ADMIN' },
      select: { garage_slots: true },
    });
    const sys = admin?.garage_slots?.system || {};
    if (sys.lineNotifyEnabled === false) {
      return res.status(400).json({ error: '推播總開關目前是關閉狀態' });
    }
    const { notifyAdmin } = require('../services/notifyService');
    const result = await notifyAdmin(
      `🧪 車大師測試通知\n通道設定：${sys.notifyChannel || 'line（預設）'}\n時間：${new Date().toLocaleString('zh-TW')}\n如果你收到這則訊息，代表通知通道設定正確 ✅`,
      { eventKey: null });
    res.json({ success: result.sent.length > 0, ...result });
  } catch (error) {
    res.status(500).json({ error: '發送失敗，請檢查憑證與設定' });
  }
});

module.exports = router;