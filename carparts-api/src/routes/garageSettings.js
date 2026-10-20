// src/routes/garageSettings.js — 🆕 車廠門店設定（店面照 / 營業時間 / 標準工資表）
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const garageAuth = require('../middleware/garageAuth');
const { compressImage } = require('../services/imageService');

const prisma = new PrismaClient();
router.use(garageAuth);

// 店面照上傳目錄
const photoDir = path.join(__dirname, '../../media/garage_photos');
if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

// multer 用 memoryStorage：先過 sharp 壓縮再寫檔（webp/JPG q80，最長邊 800px）
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('僅支援 JPG / PNG / WebP 圖片'));
  },
});

const MAX_PHOTOS = 6; // 每間車廠最多 6 張店面照

// 可自行編輯的欄位白名單（不含 role/is_approved/password 等）
const EDITABLE_FIELDS = [
  'garage_name',
  'garage_phone',
  'garage_address',
  'contact_person',
  'job_title',
  'phone',
  'address',
  'shop_type',
];

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function serializeWorkshop(w) {
  return {
    id: w.id,
    email: w.email,
    company_name: w.company_name,
    garage_name: w.garage_name || w.company_name,
    garage_phone: w.garage_phone || w.phone,
    garage_address: w.garage_address || w.address,
    lat: w.lat,
    lng: w.lng,
    rating: w.rating,
    review_count: w.review_count,
    opening_hours: parseJsonField(w.opening_hours),
    garage_photos: (parseJsonField(w.garage_photos) || []).sort((a, b) => (a.sort || 0) - (b.sort || 0)),
    labor_fees: w.laborFees || [],
  };
}

async function loadWorkshop(workshopId) {
  return prisma.workshop.findUnique({
    where: { id: workshopId },
    include: {
      laborFees: { where: { is_active: true }, orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
    },
  });
}

// GET /api/garage/settings — 取得自己的門店設定
router.get('/', async (req, res) => {
  try {
    const workshop = await loadWorkshop(req.workshopId);
    if (!workshop) return res.status(404).json({ error: '車廠不存在' });
    res.json(serializeWorkshop(workshop));
  } catch (error) {
    console.error('取得車廠設定失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/settings — 更新基本資料與營業時間
router.patch('/', async (req, res) => {
  try {
    const data = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) data[field] = String(req.body[field]).trim() || null;
    }
    // 營業時間：物件，值為 "HH:mm-HH:mm" 或 null（公休）
    if (req.body.opening_hours !== undefined) {
      const oh = req.body.opening_hours;
      if (oh === null) {
        data.opening_hours = null;
      } else if (typeof oh === 'object' && !Array.isArray(oh)) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const clean = {};
        for (const d of days) {
          if (oh[d] === undefined) continue;
          clean[d] = oh[d] ? String(oh[d]).slice(0, 20) : null;
        }
        data.opening_hours = JSON.stringify(clean);
      } else {
        return res.status(400).json({ error: 'opening_hours 格式錯誤' });
      }
    }

    const workshop = await prisma.workshop.update({
      where: { id: req.workshopId },
      data,
      include: {
        laborFees: { where: { is_active: true }, orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
      },
    });
    res.json(serializeWorkshop(workshop));
  } catch (error) {
    console.error('更新車廠設定失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/garage/settings/photos — 上傳店面照（sharp 壓縮）
router.post('/photos', photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請選擇照片' });

    const workshop = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      select: { garage_photos: true },
    });
    let photos = parseJsonField(workshop.garage_photos) || [];
    if (photos.length >= MAX_PHOTOS) {
      return res.status(400).json({ error: `最多上傳 ${MAX_PHOTOS} 張店面照` });
    }

    // 壓縮後存檔為 .jpg（統一格式，/media 自動補全機制也吃得到）
    const compressed = await compressImage(req.file.buffer, { maxEdge: 1200, quality: 82 });
    const filename = `garage_${req.workshopId}_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(photoDir, filename), compressed);
    const url = `/media/garage_photos/${filename}`;

    photos.push({ url, sort: photos.length });
    await prisma.workshop.update({
      where: { id: req.workshopId },
      data: { garage_photos: JSON.stringify(photos) },
    });

    res.json({ success: true, url, photos: photos.sort((a, b) => a.sort - b.sort) });
  } catch (error) {
    console.error('上傳店面照失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/garage/settings/photos/:idx — 刪除第 idx 張（0 起算）並重排
router.delete('/photos/:idx', async (req, res) => {
  try {
    const idx = parseInt(req.params.idx);
    const workshop = await prisma.workshop.findUnique({
      where: { id: req.workshopId },
      select: { garage_photos: true },
    });
    let photos = (parseJsonField(workshop.garage_photos) || []).sort((a, b) => a.sort - b.sort);
    if (idx < 0 || idx >= photos.length) return res.status(404).json({ error: '照片不存在' });

    const [removed] = photos.splice(idx, 1);
    // 刪除實體檔案（路徑必須以 /media/garage_photos/ 開頭，防目錄跳脫）
    if (removed.url && removed.url.startsWith('/media/garage_photos/')) {
      const filePath = path.join(photoDir, path.basename(removed.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    photos = photos.map((p, i) => ({ ...p, sort: i }));
    await prisma.workshop.update({
      where: { id: req.workshopId },
      data: { garage_photos: JSON.stringify(photos) },
    });

    res.json({ success: true, photos });
  } catch (error) {
    console.error('刪除店面照失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// =========================================
// 標準工資表 CRUD
// =========================================

// POST /api/garage/settings/labor-fees — 新增工資項目
router.post('/labor-fees', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const price = parseInt(req.body.price);
    if (!name) return res.status(400).json({ error: '請填寫項目名稱' });
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: '工資金額格式錯誤' });

    const fee = await prisma.garageLaborFee.create({
      data: {
        workshop_id: req.workshopId,
        name: name.slice(0, 60),
        price,
        note: req.body.note ? String(req.body.note).slice(0, 200) : null,
        sort_order: parseInt(req.body.sort_order) || 0,
      },
    });
    res.json(fee);
  } catch (error) {
    console.error('新增工資項目失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/settings/labor-fees/:id — 修改工資項目（限自己的）
router.patch('/labor-fees/:id', async (req, res) => {
  try {
    const fee = await prisma.garageLaborFee.findFirst({
      where: { id: parseInt(req.params.id), workshop_id: req.workshopId },
    });
    if (!fee) return res.status(404).json({ error: '工資項目不存在' });

    const data = {};
    if (req.body.name !== undefined) data.name = String(req.body.name).trim().slice(0, 60);
    if (req.body.price !== undefined) {
      const price = parseInt(req.body.price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: '工資金額格式錯誤' });
      data.price = price;
    }
    if (req.body.note !== undefined) data.note = req.body.note ? String(req.body.note).slice(0, 200) : null;
    if (req.body.is_active !== undefined) data.is_active = Boolean(req.body.is_active);
    if (req.body.sort_order !== undefined) data.sort_order = parseInt(req.body.sort_order) || 0;

    const updated = await prisma.garageLaborFee.update({ where: { id: fee.id }, data });
    res.json(updated);
  } catch (error) {
    console.error('修改工資項目失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/garage/settings/labor-fees/:id — 刪除工資項目（限自己的）
router.delete('/labor-fees/:id', async (req, res) => {
  try {
    const fee = await prisma.garageLaborFee.findFirst({
      where: { id: parseInt(req.params.id), workshop_id: req.workshopId },
    });
    if (!fee) return res.status(404).json({ error: '工資項目不存在' });
    await prisma.garageLaborFee.delete({ where: { id: fee.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('刪除工資項目失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
