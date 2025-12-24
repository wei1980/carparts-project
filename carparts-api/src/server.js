require('dotenv').config();
const app = require('./app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 1. 測試資料庫連線
    await prisma.$connect();
    console.log('✅ PostgreSQL Database connected successfully.');

    // 2. 啟動 Express Server
    app.listen(PORT, () => {
      console.log(`🚀 B2B Platform Server running on http://localhost:${PORT}`);
      console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   - Health Check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1); // 非零退出碼表示錯誤
  }
}

// 處理優雅關閉 (Graceful Shutdown)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing DB connection...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();