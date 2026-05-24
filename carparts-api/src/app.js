const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const apiRoutes = require('./routes/api');
const shopRoutes = require('./routes/shop');

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 修正圖片路徑：無論在哪啟動 node，都指向根目錄的 media
const mediaDir = path.join(__dirname, "../media");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
app.use("/media", express.static(mediaDir));

// 路由雙掛載：確保前端 fetch("/") 或 fetch("/api") 都能通
app.use('/', apiRoutes);
app.use('/api', apiRoutes);
app.use('/', shopRoutes);
app.use('/shop', shopRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

module.exports = app;