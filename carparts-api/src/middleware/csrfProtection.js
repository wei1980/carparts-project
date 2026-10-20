// src/middleware/csrfProtection.js
// CSRF 保護中介軟體 - 雙重提交 Cookie 模式
const csrf = require('csurf');
const cookie = require('cookie');

// 建立 CSRF 保護實例
// 使用 cookie 儲存 token，適用於 SPA + API 架構
const csrfInstance = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // csurf/cookie 的單位為秒：24 小時
  },
  // 自定義錯誤處理
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// csurf cookie 模式必須先解析 cookie；保留既有 cookie-parser 的結果。
function csrfProtection(req, res, next) {
  try {
    req.cookies ||= cookie.parse(req.headers.cookie || '');
    csrfInstance(req, res, next);
  } catch (error) {
    next(error);
  }
}

// 取得 CSRF token 的端點
function getCsrfToken(req, res) {
  const token = req.csrfToken();
  res.json({ csrfToken: token });
}

// 驗證 CSRF token 的中介軟體（用於 API 路由）
function verifyCsrfToken(req, res, next) {
  // 讓 csrf middleware 處理驗證
  csrfProtection(req, res, (err) => {
    if (err) {
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
          code: 'CSRF_INVALID',
          message: 'CSRF token 無效或已過期，請重新整理頁面再試',
          requestId: req.requestId
        });
      }
      return next(err);
    }
    next();
  });
}

// 針對特定路由跳過 CSRF (如 webhook、公開 API)
function skipCsrfFor(routes = []) {
  return (req, res, next) => {
    const path = req.path;
    const shouldSkip = routes.some(route => {
      if (typeof route === 'string') return path.startsWith(route);
      if (route instanceof RegExp) return route.test(path);
      return false;
    });
    if (shouldSkip) return next();
    csrfProtection(req, res, next);
  };
}

module.exports = {
  csrfProtection,
  getCsrfToken,
  verifyCsrfToken,
  skipCsrfFor,
};