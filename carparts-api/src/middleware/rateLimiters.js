// src/middleware/rateLimiters.js — 登入/註冊防暴力破解
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const message = (msg) => ({
  status: 429,
  success: false,
  error: msg,
});

// 通用登入限流：每 IP 15 分鐘內最多 10 次
// 使用 keyGenerator 區分不同登入端點，避免共用額度
// 使用 ipKeyGenerator 處理 IPv6 相容性
const createLoginLimiter = (prefix) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${prefix}:${ipKeyGenerator(req.ip)}`,
  message: message('嘗試次數過多，請 15 分鐘後再試'),
});

// 三種登入各自獨立限流
const userLoginLimiter = createLoginLimiter('user');
const adminLoginLimiter = createLoginLimiter('admin');
const garageLoginLimiter = createLoginLimiter('garage');

// 註冊端點：每 IP 每小時最多 5 個新帳號
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('註冊次數過多，請稍後再試'),
});

// 重設密碼：每 IP 15 分鐘最多 5 次。
// ⚠️ 驗證碼「發送」與「驗證」是兩個端點，限流必須各自掛。
//    forgot-password 有 userLoginLimiter，但 reset-password 之前完全沒有 →
//    6 位數驗證碼（10 分鐘有效）可被線上暴力破解。這支 limiter 專門補這個洞。
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `reset:${ipKeyGenerator(req.ip)}`,
  message: message('重設密碼嘗試次數過多，請 15 分鐘後再試'),
});

// 下單：每 IP 每小時 20 筆。
// 下單會真的扣庫存並寫 DB，先前完全沒有節流 → 單一帳號可灌假訂單把熱門商品
// 庫存打空（惡意擋單），或大量寫入 consumer_orders。額度以「已登入使用者 + IP」
// 為 key，避免同一個 NAT 後的使用者互相影響。
const createOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `order:${req.userId || 'anon'}:${ipKeyGenerator(req.ip)}`,
  message: message('下單次數過多，請稍後再試'),
});

module.exports = {
  userLoginLimiter,
  adminLoginLimiter,
  garageLoginLimiter,
  registerLimiter,
  resetPasswordLimiter,
  createOrderLimiter,
};
