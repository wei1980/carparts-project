// src/middleware/optionalAuthMiddleware.js
// 選擇性驗證：有合法 Bearer token 時設定 req.userId，否則直接放行（匿名訪客）。
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.userId) req.userId = decoded.userId;
        else if (decoded.workshopId) req.userId = decoded.workshopId;
      } catch (error) {
        // 匿名情境下忽略無效/過期 token，一律放行
      }
    }
  }
  next();
};
