const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 路由匯入
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

const app = express();

// 1. 全域中介層配置
app.use(cors());
app.use(express.json({ limit: "10mb" }));
// 保留 CSV 匯入需要的 text/csv 解析器
app.use(express.text({ type: "text/csv", limit: "10mb" }));

// 2. 靜態資源 (媒體檔)
// 注意：process.cwd() 會指向 node 指令執行的目錄 (通常是專案根目錄)
const mediaDir = path.join(process.cwd(), "media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
app.use("/media", express.static(mediaDir));

// 3. 健康檢查 (Load Balancer 用)
app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now(), env: process.env.NODE_ENV });
});

// 4. 路由掛載
// /api - 通用 API (Auth, User Profile 等)
app.use('/api', apiRoutes);
// /admin - 後台管理 API (需要 Admin 權限)
app.use('/admin', adminRoutes);
// /shop - 前台商店 API (公開或一般會員)
app.use('/shop', shopRoutes);

// 5. 全域錯誤處理 (Global Error Handler)
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  
  // 針對 Prisma 常見錯誤可在此做轉換
  // if (err.code === 'P2002') ...

  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === 'development' ? err.message : '系統發生錯誤'
  });
});

module.exports = app;