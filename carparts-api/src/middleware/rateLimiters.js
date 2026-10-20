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

module.exports = { userLoginLimiter, adminLoginLimiter, garageLoginLimiter, registerLimiter };
