// src/server.js
require('dotenv').config();

const path = require('path');       // 🆕 提供 /uploads 靜態路由
const express = require('express'); // 🆕 express.static 需要

// 引入背景服務（AI Queue）
require('./services/aiQueue');

// 引入 Job System (Redis + BullMQ) - TEMPORARILY DISABLED for auth debugging
// require('./services/jobScheduler');

// 引入 Express App
const app = require('./app'); // 指向 src/app.js
const { startAutoCompleteJob } = require('./services/autoCompleteOrders');
const prisma = require('./lib/prisma');
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 測試資料庫連線
    await prisma.$connect();
    console.log('✅ PostgreSQL Database connected successfully.');

    // 🆕 掛載上傳檔案靜態路由（放在 app.listen 之前）
    app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
      maxAge: '7d',
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.webm'].includes(ext)) {
          res.setHeader('Content-Disposition', 'attachment');
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }));

    // 🆕 金流模組：確保銀行 Excel 存在（MOCK_BANK_EXCEL=true 時自動產生測試檔）
    try {
      const { ensureBankExcel } = require('./services/bankExcelService');
      const result = await ensureBankExcel();
      if (result.created) console.log(`   - Mock 銀行 Excel 已建立（MOCK_BANK_EXCEL=true）`);
      if (result.warning) console.log(`   - ⚠️ ${result.warning}`);
    } catch (bankErr) {
      console.warn(`   - ⚠️ 銀行 Excel 檢查失敗: ${bankErr.message}`);
    }

    // 🆕 初始化 Job System（排程）
    //    佇列可用（Redis）→ 走 BullMQ；不可用 → cron 直接呼叫 worker。
    //    先前因 Redis 未啟動而把整段註解掉，導致 6 個排程從未執行。
    try {
      const { initializeJobSystem } = require('./services/jobScheduler');
      await initializeJobSystem();
    } catch (jobErr) {
      const firstLine = String(jobErr.message).split(String.fromCharCode(10))[0];
      console.warn(`   - ⚠️ Job System 初始化失敗: ${firstLine}`);
    }

    // 啟動 Express Server
    app.listen(PORT, () => {
      console.log(`🚀 B2B Platform Server running on http://localhost:${PORT}`);
      console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   - Health Check: http://localhost:${PORT}/health`);
	  console.log(`🚀 Server is running on port ${PORT}`);
	  
	  // 🆕 啟動自動結案排程
      startAutoCompleteJob();
    });

    // 🆕 低庫存警示：每小時檢查一次（服務內建開關 + 節流，關閉時無副作用）
    setInterval(() => {
      require('./services/stockAlertService').checkLowStock()
        .then(r => {
          if (r.alerted) console.debug(`⚠️ 低庫存警示已推播（${r.count} 項）`);
        })
        .catch(e => console.error('低庫存檢查失敗:', e.message));
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

// 處理優雅關閉
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing DB connection...');
  await prisma.$disconnect();
  
  // 關閉 Job Queues - TEMPORARILY DISABLED
  // try {
  //   const { shutdownQueues } = require('./services/jobQueue');
  //   await shutdownQueues();
  // } catch (err) {
  //   console.warn('Job queues shutdown error:', err.message);
  // }
  
  process.exit(0);
});

startServer();