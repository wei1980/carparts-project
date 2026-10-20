const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  // 支援 Authorization header 和 admin_token query parameter 兩種方式
  const authHeader = req.headers.authorization;
  const queryToken = req.query?.admin_token;
  const token = (authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null) || queryToken;

  console.info('[ADMIN_AUTH] Request received', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader,
    hasQueryToken: !!queryToken,
    tokenLength: token?.length,
  });

  if (!token) return res.status(401).json({ error: '未提供驗證 Token' });

  try {
    console.info('[ADMIN_AUTH] Verifying token', {
      requestId: req.requestId,
      tokenLength: token.length,
    });
    const decoded = jwt.verify(token, JWT_SECRET);
    console.info('[ADMIN_AUTH] Token verified successfully', {
      requestId: req.requestId,
    });
    if (decoded.role !== 'ADMIN') return res.status(403).json({ error: '權限不足' });
    req.workshopId = decoded.workshopId;
    req.role = decoded.role;
    next();
  } catch (error) {
    console.error('[ADMIN_AUTH] Verify failed', {
      requestId: req.requestId,
      reason: error.name,
      message: error.message,
      tokenLength: token?.length,
      stack: error.stack,
    });
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }
};
