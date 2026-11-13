// src/routes/aiSearch.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/authMiddleware');

const prisma = require('../lib/prisma');

// 設定圖片上傳
const uploadDir = path.join(__dirname, '../../media/ai_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// 🔒 圖片白名單：只收 jpeg/png/webp；副檔名一律由 MIME 重寫（防 .html/.svg 落公開 /media 造成儲存型 XSS）
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const safeImgExt = m => (m === 'image/png' ? '.png' : m === 'image/webp' ? '.webp' : '.jpg');

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, `ai_${Date.now()}${safeImgExt(file.mimetype)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, IMAGE_MIMES.includes(file.mimetype)),
});

router.use(auth);

// POST /api/ai/search-part
router.post('/search-part', upload.single('image'), async (req, res) => {
  try {
    const { query, customerVehicleId } = req.body;
    const imageFile = req.file;

    if ((!query || !query.trim()) && !imageFile) {
      return res.status(400).json({ error: '請輸入文字或上傳圖片' });
    }

    // 驗證客戶車輛
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: customerVehicleId, userId: req.userId },
    });
    if (!vehicle) {
      return res.status(404).json({ error: '找不到您的車輛，請先選擇車輛' });
    }

    let sourceType = 'text';
    let rawContent = query || '';

    if (imageFile) {
      sourceType = 'image';
      rawContent = `/media/ai_uploads/${imageFile.filename}`;
    }

    // 🆕 立即建立 pending 草稿，不等待 AI
    const draft = await prisma.aiPartDraft.create({
      data: {
        userId: req.userId,
        customerVehicleId: vehicle.id,
        query: query || `圖片搜尋 (${imageFile.originalname})`,
        source_type: sourceType,
        source_url: null,
        raw_content: rawContent,
        result_json: [], // 先空，背景處理後更新
        status: 'pending',
      },
    });

    res.json({
      success: true,
      draftId: draft.id,
      status: 'pending',
      message: '已收到！AI 正在背景處理，完成後會顯示在待審核列表。',
    });
  } catch (error) {
    console.error('提交草稿失敗:', error);
    res.status(500).json({ error: '處理失敗',  });
  }
});

module.exports = router;