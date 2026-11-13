// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

// 🔒 為什麼要回查資料庫：
// JWT 有效期限是 7 天。若只驗簽章就放行，「帳號被停用 / 未通過審核 / 權限被降級」
// 在 token 到期前完全不生效。因此這裡每個請求都回讀帳號狀態（主鍵查詢，成本極低），
// 並以資料庫的 role 作為 req.isAdmin 的唯一依據（不信任 token 內的 role 宣告）。
//
// 支援兩種 token 格式：
// - 車主: { userId, phone }        → EndUser
// - 車廠/管理員: { workshopId, ... } → Workshop
module.exports = async (req, res, next) => {
  // 1. 取得 Authorization header
  const authHeader = req.headers.authorization;

  // 2. 檢查是否存在且格式正確 (必須是 "Bearer <token>")
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供驗證 Token' });
  }

  // 3. 取出 Token（去掉 "Bearer " 前綴）
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: '未提供驗證 Token' });

  let decoded;
  try {
    // 僅記錄可關聯的 request ID 與 token 長度，不輸出 token、secret 或 JWT payload。
    console.info('[AUTH] verifying request', {
      requestId: req.requestId,
      tokenLength: token.length,
    });
    decoded = jwt.verify(token, JWT_SECRET);
    console.info('[AUTH] Token verified successfully', {
      requestId: req.requestId,
    });
  } catch (error) {
    console.warn('[AUTH] verification failed', { requestId: req.requestId, reason: error.name });
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }

  // 4. 決定帳號類型
  if (decoded.userId) {
    try {
      const user = await prisma.endUser.findUnique({
        where: { id: decoded.userId },
        select: { id: true, is_active: true, is_approved: true },
      });
      if (!user) {
        return res.status(401).json({ error: '帳號不存在或已刪除' });
      }
      if (!user.is_active) {
        return res.status(403).json({ error: '帳號已被停用' });
      }
      if (!user.is_approved) {
        return res.status(403).json({ error: '帳號尚未通過審核' });
      }
      req.userId = user.id;
      req.isAdmin = false;
    } catch (error) {
      console.error('[AUTH] account lookup failed', { requestId: req.requestId, message: error.message });
      return res.status(500).json({ error: '伺服器內部錯誤' });
    }
  } else if (decoded.workshopId) {
    try {
      // 車廠/管理員共用 Workshop 表；以 DB 的 role 為準
      const workshop = await prisma.workshop.findUnique({
        where: { id: decoded.workshopId },
        select: { id: true, is_active: true, role: true, is_approved: true, is_garage: true },
      });
      if (!workshop) {
        return res.status(401).json({ error: '帳號不存在或已刪除' });
      }
      if (!workshop.is_active) {
        return res.status(403).json({ error: '帳號已被停用' });
      }
      req.userId = workshop.id; // 兼容 workshop-profile 端點
      req.workshopId = workshop.id;
      req.role = workshop.role;
      req.isAdmin = workshop.role === 'ADMIN';
    } catch (error) {
      console.error('[AUTH] workshop lookup failed', { requestId: req.requestId, message: error.message });
      return res.status(500).json({ error: '伺服器內部錯誤' });
    }
  } else {
    return res.status(401).json({ error: 'Token 格式錯誤' });
  }

  next();
};