// src/middleware/csrf.js
// CSRF 保護：Double-submit cookie pattern (支援 SameSite=Strict)
// 適用於 state-changing operations: POST, PUT, PATCH, DELETE

const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// CSRF token 驗證中介軟體
// 開發環境放寬，生產環境嚴格
const isProduction = process.env.NODE_ENV === 'production';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: isProduction,        // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax',  // 生產環境嚴格
    maxAge: 24 * 60 * 60 * 1000, // 24小時
    // path: '/'  // 預設全域
  },
  // 也支援從 header 讀取 token (SPA 適用)
  value: (req) => {
    // 優先從 header 讀取 (AJAX/SPA)
    return req.headers['x-csrf-token'] || req.headers['csrf-token'] || req.body._csrf;
  }
});

// 豁免特定路由的 CSRF 檢查
const csrfExemptPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/admin/login',
  '/api/auth/send-code',
  '/api/auth/verify-code',
  '/api/auth/refresh',
  '/api/vehicles/',
  '/api/parts/recommended',
  '/health',
  '/api/webhooks/',  // 外部 webhook
  '/api/support/replies',  // 內部：Hermes adapter 轉送客服回覆（自帶 X-Internal-Secret 驗證）
];

function shouldExempt(req) {
  const path = req.path;
  return csrfExemptPaths.some(exempt => path.startsWith(exempt));
}

// 條件式 CSRF 保護中介軟體
function conditionalCsrf(req, res, next) {
  // GET, HEAD, OPTIONS 不需 CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // 豁免路徑
  if (shouldExempt(req)) {
    return next();
  }
  
  // API 路徑啟用 CSRF
  if (req.path.startsWith('/api/')) {
    return csrfProtection(req, res, next);
  }
  
  next();
}

// 提供 CSRF token 給前端 (可掛在 /api/csrf-token)
function csrfTokenEndpoint(req, res) {
  res.json({ csrfToken: req.csrfToken() });
}

// 前端讀取 token 的 helper：從 cookie 或 meta tag
// 使用方式：在 layout 加 <meta name="csrf-token" content="{{csrfToken}}">

module.exports = {
  conditionalCsrf,
  csrfTokenEndpoint,
  cookieParser: cookieParser(),
  // 給前端用的 token 讀取方式說明
  // 前端 axios interceptor 應自動附加 header: 'x-csrf-token'
};