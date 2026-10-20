// src/middleware/optionalGarageAuth.js
// 可選式車廠辨識：有帶有效車廠 Token（payload 含 workshopId）→ req.isGarage = true；
// 沒帶、無效、或是一般車主 Token → 靜默放過（req.isGarage = false），絕不擋請求。
// 用途：公開商品端點依此決定是否回傳 wholesale_price / sku（車廠專屬欄位）。
const jwt = require('jsonwebtoken');

// 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  req.isGarage = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (decoded.workshopId) req.isGarage = true;
    } catch (_) { /* 匿名視之 */ }
  }
  next();
};
