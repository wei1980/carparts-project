// src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { userLoginLimiter, adminLoginLimiter, garageLoginLimiter, registerLimiter } = require('../middleware/rateLimiters');

// 🔐 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

const prisma = new PrismaClient();
const crypto = require('crypto');
const { pushMessage } = require('../services/lineService');

// ==========================================
// 📁 檔案上傳目錄設定
// ==========================================
const cardDir = path.join(__dirname, '../../media/business_cards');
if (!fs.existsSync(cardDir)) fs.mkdirSync(cardDir, { recursive: true });

const avatarDir = path.join(__dirname, '../../media/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

// ==========================================
// 🖼️ Multer 設定：車廠名片
// ==========================================
const CARD_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const safeCardExt = m => (m === 'image/png' ? '.png' : m === 'image/webp' ? '.webp' : '.jpg');

const cardUpload = multer({
  storage: multer.diskStorage({
    destination: cardDir,
    filename: (req, file, cb) => {
      cb(null, `card_${Date.now()}${safeCardExt(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, CARD_IMAGE_MIMES.includes(file.mimetype)),
});

// ==========================================
// 🆕 Multer 設定：會員頭像
// ==========================================
const AVATAR_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const safeAvatarExt = m => (m === 'image/png' ? '.png' : m === 'image/webp' ? '.webp' : '.jpg');

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarDir,
    filename: (req, file, cb) => {
      cb(null, `avatar_${req.userId}_${Date.now()}${safeAvatarExt(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (AVATAR_IMAGE_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('只允許上傳 JPG, PNG, WebP 圖片'));
  },
});

// ==========================================
// 🚗 品牌與車型正規化
// ==========================================
const BRAND_ALIASES = {
  'mercedes-benz': 'Benz', 'mercedes benz': 'Benz',
  'volkswagen': 'VW', 'vw': 'VW',
  'infiniti': 'INFINITI', 'porsche': 'Porsche',
  'bmw': 'BMW', 'audi': 'Audi', 'toyota': 'Toyota',
  'honda': 'Honda', 'ford': 'Ford', 'mazda': 'Mazda',
  'nissan': 'Nissan', 'subaru': 'Subaru', 'lexus': 'Lexus',
  'volvo': 'Volvo',
};

function normalizeMake(make) {
  if (!make) return '';
  return BRAND_ALIASES[make.trim().toLowerCase()] || make;
}

function cleanModel(make, model) {
  if (!model || !make) return model;
  const lowerMake = make.toLowerCase();
  const lowerModel = model.toLowerCase();
  if (lowerModel.startsWith(lowerMake + ' ')) {
    return model.slice(make.length + 1);
  }
  return model;
}

function findBestVariantMatch(variants, make, rawModel, year) {
  if (!variants || variants.length === 0) return null;
  const cleanedModel = cleanModel(make, rawModel).trim();
  if (!cleanedModel) return null;
  const lowerModel = cleanedModel.toLowerCase();
  const modelWords = lowerModel.split(/[\s\-]+/);

  let bestMatch = null;
  let bestOverlap = 0;
  for (const v of variants) {
    const vWords = v.model.toLowerCase().split(/[\s\-]+/);
    const overlap = modelWords.filter(w => vWords.includes(w)).length;
    const minLen = Math.min(modelWords.length, vWords.length);
    if (minLen > 0 && overlap >= minLen * 0.7 && overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = v;
    }
  }

  if (!bestMatch) {
    for (const v of variants) {
      const vLower = v.model.toLowerCase();
      if (vLower.includes(lowerModel) || lowerModel.includes(vLower)) {
        bestMatch = v;
        break;
      }
    }
  }

  if (bestMatch && year) {
    const yearInt = parseInt(year);
    const yearMatch = variants.find(v =>
      v.model === bestMatch.model &&
      v.year_start <= yearInt && v.year_end >= yearInt
    );
    if (yearMatch) return yearMatch;
  }

  return bestMatch;
}

// ==================== 車主註冊 ====================
router.post('/register', userLoginLimiter, async (req, res) => {
  try {
    const { phone, password, name, lineId, address, vehicle } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '手機號碼和密碼為必填' });
    if (!lineId) return res.status(400).json({ error: 'LINE 帳號為必填' });

    const existingUser = await prisma.endUser.findUnique({ where: { phone } });

    if (existingUser) {
      if (existingUser.is_approved) return res.status(409).json({ error: '此手機號碼已註冊' });

      const vinConflict = await prisma.vehicleProfile.findFirst({
        where: { vin: vehicle?.vin, NOT: { userId: existingUser.id } },
      });
      if (vinConflict) return res.status(409).json({ error: '此 VIN 已被其他帳號綁定' });

      await prisma.endUser.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: await bcrypt.hash(password, 12),
          name: name || existingUser.name,
          lineId: lineId || existingUser.lineId,
          address: address || existingUser.address,
          is_active: true,
          is_approved: false,  // 🆕 修改：重新註冊需重新審核
        },
      });

      return res.json({ message: '帳號已存在但未審核，已重新啟用並更新資料' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    let finalVariantId = null;
    let finalMake = '';
    let finalModel = '';
    let finalGeneration = '';
    let finalEngine = '';

    if (vehicle) {
      const { make, model, year, vin, engineCode, variantId } = vehicle;
      finalMake = normalizeMake(make);
      finalModel = cleanModel(make, model);

      // 🆕 優先使用前端傳來的 variantId（使用者已在註冊頁選好車型）
      if (variantId) {
        const directMatch = await prisma.vehicleVariant.findUnique({
          where: { id: parseInt(variantId) },
        });
        if (directMatch) {
          finalVariantId = directMatch.id;
          finalGeneration = directMatch.generation || '';
          finalEngine = directMatch.engine_code || '';
          finalMake = directMatch.make;
          finalModel = directMatch.model;
        }
      }

      // 沒有 variantId 或找不到 → 用 make/model/year 匹配
      if (!finalVariantId) {
        const dbVariants = await prisma.vehicleVariant.findMany({
          where: { make: { equals: finalMake, mode: 'insensitive' } },
          orderBy: { year_start: 'asc' },
        });

        const matched = findBestVariantMatch(dbVariants, finalMake, model, year);
        if (matched) {
          finalVariantId = matched.id;
          finalGeneration = matched.generation || '';
          finalEngine = matched.engine_code || '';
          finalMake = matched.make;
          finalModel = matched.model;
        } else {
          const newVariant = await prisma.vehicleVariant.create({
            data: {
              make: finalMake,
              model: finalModel,
              year_start: year ? parseInt(year) : new Date().getFullYear(),
              year_end: year ? parseInt(year) : new Date().getFullYear(),
              engine_code: engineCode || '',
              variant_name: `${finalMake} ${finalModel}`.trim(),
              generation: '',
              specs: {
                source: 'user_registration',
                fuel_type: '汽油',
              },
            },
          });
          finalVariantId = newVariant.id;
        }
      }
    }

    const user = await prisma.endUser.create({
      data: {
        id: crypto.randomUUID(),
        phone,
        passwordHash: hash,
        name: name || '',
        lineId,
        address: address || '',
        is_approved: false,  // 🆕 修改：新註冊需等待管理員審核
        is_active: true,
      },
    });

    if (vehicle && finalVariantId) {
      const vp = await prisma.vehicleProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          variantId: finalVariantId,
          make: finalMake,
          model: finalModel,
          generation: finalGeneration,
          year: vehicle.year ? parseInt(vehicle.year) : null,
          engine: finalEngine,
          vin: vehicle.vin || null,
          licensePlate: vehicle.licensePlate || null,
          updatedAt: new Date(),
        },
      });
      // 🆕 註冊即有一台車型：設為目前車輛
      await prisma.endUser.update({ where: { id: user.id }, data: { currentVehicleId: vp.id } });
    }

    const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, phone: user.phone, name: user.name, lineId: user.lineId } });
  } catch (error) {
    console.error('註冊失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤', detail: error.message });
  }
});

// ==================== 車主登入 ====================
router.post('/login', userLoginLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '請提供手機號碼和密碼' });
    const user = await prisma.endUser.findUnique({ where: { phone } });
    if (!user) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    if (!user.is_approved) return res.status(403).json({ error: '帳號尚未通過審核' });
    if (!user.is_active) return res.status(403).json({ error: '帳號已被停用' });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, lineId: user.lineId } });
  } catch (error) {
    res.status(500).json({ error: '登入失敗', detail: error.message });
  }
});

// ==================== 管理員登入 ====================
router.post('/admin/login', adminLoginLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '請提供手機號碼和密碼' });
    const workshop = await prisma.workshop.findFirst({ where: { phone, role: 'ADMIN' } });
    if (!workshop) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    const isMatch = await bcrypt.compare(password, workshop.password_hash);
    if (!isMatch) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    console.log('[DEBUG] JWT_SECRET at sign:', JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'UNDEFINED', 'len:', JWT_SECRET?.length);
    console.log('[DEBUG] JWT_SECRET raw bytes:', Buffer.from(JWT_SECRET).toString('hex').substring(0, 40) + '...');
    console.log('[DEBUG] JWT_SECRET sha256:', crypto.createHash('sha256').update(JWT_SECRET).digest('hex'));
    const token = jwt.sign({ workshopId: workshop.id, phone: workshop.phone, role: workshop.role }, JWT_SECRET, { expiresIn: '7d' });
    console.log('[DEBUG] Generated token sig len:', token.split('.')[2].length);
    console.log('[DEBUG] Generated token full:', token);
    console.log('[DEBUG] Generated token parts:', token.split('.').length);
    res.json({ token, user: { id: workshop.id, phone: workshop.phone, company_name: workshop.company_name, role: workshop.role } });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ==================== 車廠登入 ====================
router.post('/garage/login', garageLoginLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '請提供手機號碼和密碼' });
    const workshop = await prisma.workshop.findFirst({ where: { phone, is_garage: true, is_active: true } });
    if (!workshop) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    if (!workshop.is_approved) return res.status(403).json({ error: '帳號尚未通過審核' });
    const isMatch = await bcrypt.compare(password, workshop.password_hash);
    if (!isMatch) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    const token = jwt.sign({ workshopId: workshop.id, phone: workshop.phone, role: workshop.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: workshop.id, phone: workshop.phone, garage_name: workshop.garage_name || workshop.company_name, role: workshop.role } });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ==================== 車廠註冊 ====================
router.post('/garage/register', cardUpload.single('business_card'), async (req, res) => {
  try {
    const { phone, password, company_name, contact_person, address, garage_name, line_id } = req.body;
    if (!phone || !password || !company_name) return res.status(400).json({ error: '手機號碼、密碼和公司名稱為必填' });
    if (!line_id) return res.status(400).json({ error: 'LINE 帳號為必填' });
    if (!String(garage_name || '').trim()) return res.status(400).json({ error: '店家名稱為必填' });
    if (!req.file) return res.status(400).json({ error: '請上傳名片' });
    const existing = await prisma.workshop.findFirst({ where: { phone } });
    if (existing) return res.status(409).json({ error: '此手機號碼已註冊' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const workshop = await prisma.workshop.create({
      data: {
        email: `garage_${Date.now()}@garage.com`,
        password_hash: hash,
        company_name,
        contact_person: contact_person || '',
        phone,
        address: address || '',
        line_id,
        role: 'TRIAL',
        is_approved: false,
        is_active: true,
        is_garage: false,
        garage_name: String(garage_name).trim(),
      },
    });
    await prisma.workshop.update({
      where: { id: workshop.id },
      data: { garage_slots: { business_card: `/media/business_cards/${req.file.filename}` } },
    });
    res.status(201).json({ message: '註冊成功，請等待管理員審核', id: workshop.id });
  } catch (error) {
    res.status(500).json({ error: '註冊失敗', detail: error.message });
  }
});

// ==================== 🆕 忘記密碼（發送驗證碼到 LINE）====================
router.post('/forgot-password', userLoginLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: '請提供手機號碼' });

    const user = await prisma.endUser.findFirst({ where: { phone, is_active: true } });
    const generic = { message: '若此手機已註冊且綁定 LINE，驗證碼將傳送到您的 LINE' };
    if (!user || !user.lineId) return res.json(generic);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const hash = await bcrypt.hash(code, 10);
    await prisma.endUser.update({
      where: { id: user.id },
      data: { resetCodeHash: hash, resetCodeExpires: new Date(Date.now() + 10 * 60 * 1000) },
    });

    await pushMessage(user.lineId,
      `🔐 密碼重設驗證碼\n\n您的驗證碼：${code}\n\n10 分鐘內有效。若非本人操作請忽略此訊息。`);

    res.json(generic);
  } catch (error) {
    console.error('忘記密碼失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ==================== 🆕 重設密碼（驗證碼驗證）====================
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) return res.status(400).json({ error: '請提供手機號碼、驗證碼、新密碼' });
    const user = await prisma.endUser.findFirst({ where: { phone, is_active: true } });
    if (!user || !user.resetCodeHash || !user.resetCodeExpires) {
      return res.status(400).json({ error: '驗證碼無效或已過期' });
    }
    if (new Date() > new Date(user.resetCodeExpires)) {
      return res.status(400).json({ error: '驗證碼已過期' });
    }
    const isMatch = await bcrypt.compare(code, user.resetCodeHash);
    if (!isMatch) return res.status(400).json({ error: '驗證碼錯誤' });
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);
    await prisma.endUser.update({
      where: { id: user.id },
      data: { passwordHash: hash, resetCodeHash: null, resetCodeExpires: null },
    });
    res.json({ message: '密碼重設成功' });
  } catch (error) {
    console.error('重設密碼失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ==================== LINE 綁定 ====================
router.patch('/bind-line', authMiddleware, async (req, res) => {
  try {
    const { lineId } = req.body;
    if (!lineId) return res.status(400).json({ error: '請提供 LINE User ID' });
    await prisma.endUser.update({ where: { id: req.userId }, data: { lineId } });
    res.json({ success: true, message: 'LINE 已綁定' });
  } catch (error) {
    res.status(500).json({ error: '綁定失敗', detail: error.message });
  }
});

// ==================== 🆕 修改密碼（驗證舊密碼） ====================
router.patch('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '請填寫舊密碼與新密碼' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: '新密碼至少 6 碼' });
    }

    const user = await prisma.endUser.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: '找不到使用者' });

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: '舊密碼不正確' });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.endUser.update({ where: { id: req.userId }, data: { passwordHash: hash } });
    res.json({ success: true, message: '密碼已更新' });
  } catch (error) {
    console.error('修改密碼失敗:', error);
    res.status(500).json({ error: '修改密碼失敗，請稍後再試' });
  }
});

// ==================== 🆕 上傳會員頭像 ====================
router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到檔案' });

    const avatarUrl = `/media/avatars/${req.file.filename}`;

    await prisma.endUser.update({
      where: { id: req.userId },
      data: { avatar_url: avatarUrl },
    });

    res.json({ success: true, avatar_url: avatarUrl });
  } catch (error) {
    console.error('頭像上傳失敗:', error);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

// ==================== 🆕 更新車主個人資料 ====================
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone, address, lineId } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name === '' ? null : name;
    if (email !== undefined) updateData.email = email === '' ? null : email;
    if (phone !== undefined) updateData.phone = phone === '' ? null : phone;
    if (address !== undefined) updateData.address = address === '' ? null : address;
    if (lineId !== undefined) updateData.lineId = lineId === '' ? null : lineId;

    const user = await prisma.endUser.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        lineId: true,
        address: true,
        email: true,
        avatar_url: true,
      },
    });
    res.json(user);
  } catch (error) {
    console.error('更新個人資料失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤', detail: error.message });
  }
});

// ==================== 🆕 取得車主個人資料 ====================
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.endUser.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        lineId: true,
        address: true,
        email: true,
        avatar_url: true,
      },
    });
    if (!user) return res.status(404).json({ error: '找不到使用者' });
    res.json(user);
  } catch (error) {
    console.error('取得個人資料失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// ==================== 🆕 取得車廠/管理員個人資料 ====================
router.get('/workshop-profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const workshop = await prisma.workshop.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        company_name: true,
        address: true,
        role: true,
        is_garage: true,
      },
    });
    if (!workshop) return res.status(404).json({ error: '找不到帳號' });
    res.json(workshop);
  } catch (error) {
    console.error('取得車廠資料失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;