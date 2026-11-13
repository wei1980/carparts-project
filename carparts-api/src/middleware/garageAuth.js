// src/middleware/garageAuth.js
//
// 🔒 回查資料庫：車廠 token 有效 7 天，若只驗簽章，被停用 / 未審核的車廠仍能操作
// 車廠後台（接客、看客戶資料）直到 token 過期。這裡以 DB 的 is_active / is_approved
// 為準，並保留 is_garage 檢查（非車廠帳號不得進車廠路由）。
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供驗證 Token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: '未提供驗證 Token' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }

  if (!decoded.workshopId) return res.status(401).json({ error: 'Token 格式錯誤' });

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: decoded.workshopId },
      select: { id: true, is_active: true, is_approved: true, is_garage: true, role: true },
    });
    if (!workshop) return res.status(401).json({ error: '帳號不存在或已刪除' });
    if (!workshop.is_active) return res.status(403).json({ error: '帳號已被停用' });
    if (!workshop.is_approved) return res.status(403).json({ error: '帳號尚未通過審核' });
    if (!workshop.is_garage) return res.status(403).json({ error: '此帳號不是車廠' });

    req.workshopId = workshop.id;
    req.role = workshop.role;
    next();
  } catch (error) {
    console.error('[GARAGE_AUTH] account lookup failed', { message: error.message });
    return res.status(500).json({ error: '伺服器內部錯誤' });
  }
};