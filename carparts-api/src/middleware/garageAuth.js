const jwt = require('jsonwebtoken');

// 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供驗證 Token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.workshopId = decoded.workshopId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token 無效或已過期' });
  }
};