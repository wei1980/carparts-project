// src/lib/prisma.js — 共用 Prisma 單例
//
// 為什麼需要這個：src 下有 69 個檔案各自 `new PrismaClient()`，每個都是獨立連線池。
// Prisma 建議全應用共用一個 client。認證中介軟體（每個請求都跑）尤其不該每次新增連線池，
// 故 middleware 一律引 this singleton。其餘路由檔維持現狀，不在本次變更範圍內。
//
// 注意：本檔在 hot-reload / 測試環境可能重複載入，用 globalThis 快取避免同時存在多組連線。
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

if (!globalForPrisma.__carpartsPrisma) {
  globalForPrisma.__carpartsPrisma = new PrismaClient();
}

module.exports = globalForPrisma.__carpartsPrisma;