// src/routes/adminBackup.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { executeBackup, cleanOldBackups } = require('../services/backupService');

router.use(adminAuth);

router.post('/backup', async (req, res) => {
  try {
    // 先清理舊備份
    cleanOldBackups();
    // 執行完整備份
    const result = await executeBackup();
    res.json({ success: true, message: '完整備份完成', ...result });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;