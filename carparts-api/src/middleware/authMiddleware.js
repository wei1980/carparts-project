// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  // 1. 取得 Authorization header
  const authHeader = req.headers.authorization;

  // 2. 檢查是否存在且格式正確 (必須是 "Bearer <token>")
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供驗證 Token' });
  }

  // 3. 取出 Token（去掉 "Bearer " 前綴）
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: '未提供驗證 Token' });

  try {
      // 僅記錄可關聯的 request ID 與 token 長度，不輸出 token、secret 或 JWT payload。
      console.info('[AUTH] verifying request', {
        requestId: req.requestId,
        tokenLength: token.length,
      });
      const decoded = jwt.verify(token, JWT_SECRET);
      console.info('[AUTH] Token verified successfully', {
        requestId: req.requestId,
      });

    // 5. 支援兩種 token 格式：
    // - 車主: { userId, phone }
    // - 車廠/管理員: { workshopId, phone, role }
    if (decoded.userId) {
      req.userId = decoded.userId;
    } else if (decoded.workshopId) {
      req.userId = decoded.workshopId; // 兼容 workshop-profile 端點
    } else {
      return res.status(401).json({ error: 'Token 格式錯誤' });
    }
    // 🆕 標記管理員角色
    req.isAdmin = decoded.role === 'ADMIN';

    // 6. 通過，繼續執行下一個 middleware 或路由處理函式
    next();
  } catch (error) {
    console.warn('[AUTH] verification failed', { requestId: req.requestId, reason: error.name });
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }
};