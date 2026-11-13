const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET;

// 🔒 只接受 Authorization header 的 Bearer token。
//    已去除 admin_token query 參數：token 走 query 會進 access log / 浏覽器歷史 / Referrer。
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  console.info('[ADMIN_AUTH] Request received', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader,
    tokenLength: token?.length,
  });

  if (!token) return res.status(401).json({ error: '未提供驗證 Token' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.warn('[ADMIN_AUTH] Verify failed', {
      requestId: req.requestId,
      reason: error.name,
    });
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }

  if (!decoded.workshopId) return res.status(401).json({ error: 'Token 格式錯誤' });

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: decoded.workshopId },
      select: { id: true, role: true, is_active: true },
    });
    if (!workshop) return res.status(401).json({ error: '帳號不存在或已刪除' });
    if (!workshop.is_active) return res.status(403).json({ error: '帳號已被停用' });
    if (workshop.role !== 'ADMIN') return res.status(403).json({ error: '權限不足' });

    req.workshopId = workshop.id;
    req.role = workshop.role;
    req.isAdmin = true;
    console.info('[ADMIN_AUTH] Authorized', { requestId: req.requestId });
    next();
  } catch (error) {
    console.error('[ADMIN_AUTH] Account lookup failed', {
      requestId: req.requestId,
      message: error.message,
    });
    return res.status(500).json({ error: '伺服器內部錯誤' });
  }
};
