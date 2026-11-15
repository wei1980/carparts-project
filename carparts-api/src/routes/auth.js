// src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { userLoginLimiter, adminLoginLimiter, garageLoginLimiter, registerLimiter, resetPasswordLimiter } = require('../middleware/rateLimiters');

// 🔐 緩存 JWT_SECRET，防止運行時被修改
const JWT_SECRET = process.env.JWT_SECRET;

const prisma = require('../lib/prisma');
const crypto = require('crypto');
const { pushMessage } = require('../services/lineService');
const { deleteAccount } = require('../services/accountDeletion');

// ============================================================
// 🍪 媒體存取 cookie
//
// <img src="/media/..."> 不會帶 Authorization header，因此登入時一併下一個
// httpOnly + SameSite=Lax 的 cookie，讓 /media 的存取控制（app.js）能驗證身分。
// - httpOnly：前端 JS 讀不到，降低 XSS 外洩風險
// - SameSite=Lax：允許同源 <img> 帶 cookie，跨站 POST 不帶（搭配 CSRF）
// - maxAge 與 JWT 的 7 天一致；JWT 過期後 cookie 自然也失效
// ============================================================
const MEDIA_COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setMediaCookie(res, token) {
  if (!token) return;
  res.cookie('carparts_at', token, MEDIA_COOKIE);
}

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
    else cb(Object.assign(new Error('只允許上傳 JPG, PNG, WebP 圖片'), { code: 'INVALID_FILE_TYPE' }));
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

// 記錄「註冊時車型庫找不到」的請求（方案 A 的後勤配套）。
// 同一 phone + make + model 未解決時只累加次數，避免同一人不斷重試塞滿表。
async function recordVariantRequest({ phone, vehicle }) {
  const mk = String(vehicle?.make || '').trim().slice(0, 60);
  const md = String(vehicle?.model || '').trim().slice(0, 80);
  if (!mk || !md) return;
  try {
    const existing = await prisma.vehicleVariantRequest.findFirst({
      where: { phone, make: mk, model: md, status: 'PENDING' },
      select: { id: true },
    });
    if (existing) {
      await prisma.vehicleVariantRequest.update({
        where: { id: existing.id },
        data: { request_count: { increment: 1 }, updated_at: new Date() },
      });
    } else {
      await prisma.vehicleVariantRequest.create({
        data: {
          phone,
          make: mk,
          model: md,
          year: vehicle?.year ? parseInt(vehicle.year, 10) : null,
          generation: String(vehicle?.generation || '').slice(0, 80) || null,
          engine_code: String(vehicle?.engineCode || '').slice(0, 60) || null,
          note: '註冊時車型庫無對應資料',
        },
      });
    }
  } catch (e) {
    // 記錄失敗不得影響註冊流程的回應
    console.error('記錄被擋車型失敗:', String(e.message).split(String.fromCharCode(10))[0]);
  }
}

// ==================== 車主註冊 ====================
router.post('/register', userLoginLimiter, async (req, res) => {
  try {
    const { phone, password, name, lineId, address, vehicle } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '手機號碼和密碼為必填' });
    if (String(password).length < 8) return res.status(400).json({ error: '密碼至少 8 碼' });
    if (!lineId) return res.status(400).json({ error: 'LINE 帳號為必填' });
    // 🔒 平台定位是「車廠與車主之間的橋樑」，沒有車就無法判斷零件是否裝得上，
    //    所以註冊一定要帶車型（前端 Login.jsx 已要求 make/model/VIN，這裡是後端閘門，
    //    避免直接打 API 繞過）。缺 make/model 一律擋下。
    if (!vehicle || !String(vehicle.make || '').trim() || !String(vehicle.model || '').trim()) {
      return res.status(400).json({ error: '註冊需提供車型（廠牌與車型）' });
    }

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
          // 🔒 不再自動建立車型：註冊是對外入口，若允許任意廠牌/車型，
        //    任何人都可灌入假 variant 污染車型庫（實測 NOSUCHBRAND/NOSUCHMODEL
//    會被建成真實 variantId，之後所有車型選單都會出現這個假車型）。
//    要求使用者從既有車型清單中選擇；選不到就擋下，並記錄下來。
          await recordVariantRequest({ phone, vehicle });
          throw Object.assign(
            new Error('找不到對應的車型，請從車型清單中重新選擇廠牌／車型／年份'),
            { code: 'VEHICLE_NOT_FOUND' },
          );
        }
      }
    }

    // 🔒 車型必須能對應到 vehicle_variants 的 variantId，
    //    否則首頁「熱門零件」永遠是空的（hasVariant=false），等於註冊沒完成。
    if (!finalVariantId) {
      await recordVariantRequest({ phone, vehicle });
      return res.status(400).json({
        error: '找不到對應的車型，請重新選擇廠牌／車型／年份'
          + '（若您的車型較新或較冷門，請來電或加 LINE 告知我們，我們會補進車型庫）',
      });
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

    // 🔒 未通過審核的帳號不發 token：以前這裡會發 7 天有效的 JWT，等於核可前就有完整權限
    //    （實測可打 profile / wishlist / orders / appointments 等全部消費者端點）。
    //    註冊成功只回報待審核，請使用者等審核通過再登入。
    res.status(201).json({
      message: '註冊成功，請等待管理員審核通過後再登入',
      id: user.id,
      is_approved: user.is_approved,
    });
  } catch (error) {
    console.error('註冊失敗:', error);
    if (error.code === 'VEHICLE_NOT_FOUND') {
      return res.status(400).json({ error: '找不到對應的車型，請從車型清單中重新選擇' });
    }
    res.status(500).json({ error: '伺服器內部錯誤' });
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
    setMediaCookie(res, token);
    res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, lineId: user.lineId } });
  } catch (error) {
    res.status(500).json({ error: '登入失敗',  });
  }
});

// ==================== 管理員登入 ====================
router.post('/admin/login', adminLoginLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '請提供手機號碼和密碼' });
    const workshop = await prisma.workshop.findFirst({ where: { phone, role: 'ADMIN' } });
    if (!workshop) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    if (!workshop.is_active) return res.status(403).json({ error: '帳號已被停用' });
    const isMatch = await bcrypt.compare(password, workshop.password_hash);
    if (!isMatch) return res.status(401).json({ error: '手機號碼或密碼錯誤' });
    // ⚠️ 不要在這裡印 JWT_SECRET 的任何片段（前綴 / 原始位元組 / sha256）或完整 token。
    //    部分金鑰＋穩定 hash 等於洩漏指紋，可被用來跨環境比對與縮小暴力破解範圍。
    const token = jwt.sign({ workshopId: workshop.id, phone: workshop.phone, role: workshop.role }, JWT_SECRET, { expiresIn: '7d' });
    setMediaCookie(res, token);
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
    setMediaCookie(res, token);
    res.json({ token, user: { id: workshop.id, phone: workshop.phone, garage_name: workshop.garage_name || workshop.company_name, role: workshop.role } });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ==================== 車廠註冊 ====================
// 車廠註冊會真的建帳號 + 寫入名片檔：與 /register 共用註冊額度（每 IP 每小時 5 筆）
router.post('/garage/register', registerLimiter, cardUpload.single('business_card'), async (req, res) => {
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
    res.status(500).json({ error: '註冊失敗',  });
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
// 🔒 限流：驗證碼只有 6 位數、10 分鐘有效，沒有 attempt 上限等於可線上暴力破解。
//    這支 limiter 是本端點唯一的嘗試次數防線（5 次 / 15 分鐘 / IP）。
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) return res.status(400).json({ error: '請提供手機號碼、驗證碼、新密碼' });
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: '新密碼至少 8 碼' });
    }
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
    res.status(500).json({ error: '綁定失敗',  });
  }
});

// ==================== 🆕 修改密碼（驗證舊密碼） ====================
router.patch('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '請填寫舊密碼與新密碼' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: '新密碼至少 8 碼' });
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
    res.status(500).json({ error: '伺服器內部錯誤',  });
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

// ==================== 🆕 刪除我的帳號（隱私權政策：刪除請求） ====================
// DELETE /api/auth/account
//   一律要求再次確認（confirm: true）與重複輸入手機號碼（phone），避免誤觸或 XSS 被濫用。
//   - 有交易/工單紀錄 → 匿名化（保留訂單數字供對帳，個資清空、帳號停用）
//   - 完全無紀錄     → 硬刪（連同車輛、提醒、願望清單）
//   兩種情況都會寫 AuditLog。
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const { confirm, phone } = req.body || {};
    if (confirm !== true) {
      return res.status(400).json({ error: '請明確送出 confirm: true 以確認刪除帳號' });
    }
    const me = await prisma.endUser.findUnique({ where: { id: req.userId }, select: { phone: true } });
    if (!me) return res.status(404).json({ error: '找不到使用者' });
    if (phone !== me.phone) {
      return res.status(400).json({ error: '手機號碼不符，無法刪除帳號' });
    }

    const result = await deleteAccount({
      userId: req.userId,
      actorId: req.userId,
      actorType: 'USER',
      requestId: req.requestId,
      ip: req.ip,
    });

    res.clearCookie('carparts_at', { path: '/' });
    res.json({
      message: result.mode === 'anonymized'
        ? `帳號已匿名化；為符合會計與對帳需求，保留 ${result.retainedOrders} 筆既有訂單紀錄`
        : '帳號與相關資料已刪除',
      ...result,
    });
  } catch (error) {
    console.error('刪除帳號失敗:', error);
    res.status(500).json({ error: '刪除帳號失敗，請稍後再試' });
  }
});

module.exports = router;