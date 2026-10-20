const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const Papa = require('papaparse');
const rateLimit = require('express-rate-limit');
const { apiError } = require('../utils/errorHandler');

// 設定上傳記憶體儲存 (for CSV import)
// 限制 20MB，僅接受 CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('只接受 CSV 檔案'));
    }
  },
});

// 速率限制：10 次/分鐘/IP
const bulkUploadLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    apiError(res, 429, '請求過於頻繁，請稍後再試', 'RATE_LIMIT_EXCEEDED');
  }
});

// ==========================================
// 1. 儀表板統計 API (Dashboard Stats)
// ==========================================

router.get('/stats/users', async (req, res) => {
  try {
    const totalUsers = await prisma.workshop.count({
      where: { is_active: true }
    });
    res.json({ totalUsers });
  } catch (error) {
    apiError(res, 500, 'Failed to fetch user stats', 'STATS_ERROR');
  }
});

router.get('/stats/online', (req, res) => {
  // TODO: 如需精確線上人數，需在 app.js 加入全域 middleware 追蹤
  // 這裡先回傳 0 避免前端報錯
  res.json({ onlineUsers: 0 });
});

// ==========================================
// 2. 分類管理 API (Categories)
// ==========================================

// 取得分類樹
router.get('/categories/tree', async (req, res) => {
  try {
    // 這裡暫時回傳靜態結構，確保前端能渲染
    // 未來應從 Category Table 讀取
    const roots = [
      { id: 1, name: '引擎系統', is_active: true, children: [] },
      { id: 2, name: '底盤系統', is_active: true, children: [] },
      { id: 3, name: '電系設備', is_active: true, children: [] },
      { id: 4, name: '車身外觀', is_active: true, children: [] }
    ];
    res.json(roots);
  } catch (error) {
    apiError(res, 500, 'Failed to fetch categories', 'CATEGORIES_ERROR');
  }
});

// 新增分類 (Mock)
router.post('/categories', async (req, res) => {
  res.json({ message: 'Category created (Mock)', id: Date.now() });
});

router.put('/categories/:id', async (req, res) => {
  res.json({ message: 'Category updated (Mock)' });
});

router.delete('/categories/:id', async (req, res) => {
  res.json({ message: 'Category deleted (Mock)' });
});

// ==========================================
// 3. 車廠審核 API (Shops Review)
// ==========================================

// 取得待審核列表
router.get('/shops/review', async (req, res) => {
  try {
    const { status = 'PENDING', page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // 篩選尚未核准且啟用中的車廠
    const where = { 
      is_approved: false,
      is_active: true
    };

    const [shops, total] = await Promise.all([
      prisma.workshop.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.workshop.count({ where })
    ]);

    res.json({ shops, total });
  } catch (error) {
    apiError(res, 500, 'Failed to fetch shops', 'SHOPS_REVIEW_ERROR');
  }
});

// 核准車廠 (升級為 VERIFIED)
router.post('/shops/:id/approve', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.workshop.update({
      where: { id },
      data: {
        role: 'VERIFIED',      // 升級角色
        is_approved: true,
        // query_quota: 999999 // 移除此行，因為 schema 中 Workshop 可能沒有此欄位，或是依賴 query_usage 表
      }
    });
    res.json({ success: true });
  } catch (error) {
    apiError(res, 500, 'Failed to approve shop', 'APPROVE_ERROR');
  }
});

// 拒絕/停用車廠
router.post('/shops/:id/reject', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.workshop.update({
      where: { id },
      data: { is_active: false } // 軟刪除/停用
    });
    res.json({ success: true });
  } catch (error) {
    apiError(res, 500, 'Failed to reject shop', 'REJECT_ERROR');
  }
});

// ==========================================
// 4. 商品管理 API (Parts)
// ==========================================

// 單筆新增
router.post('/parts', async (req, res) => {
  try {
    const data = req.body;
    // 簡單驗證
    if (!data.sku || !data.name) {
      return apiError(res, 400, 'SKU and Name are required', 'MISSING_REQUIRED_FIELDS');
    }

    const part = await prisma.part.create({
      data: {
        sku: data.sku,
        name: data.name,
        brand: data.brand || 'Generic',
        category_main: data.category_main || 'Other',
        msrp_price: data.msrp_price || 0,
        wholesale_price: data.wholesale_price || 0,
        stock_qty: data.stock_qty || 0,
        preorder_lead_time_days: data.lead_time_days || 21,
        is_active: true
      }
    });
    res.json({ message: 'Part created', data: part });
  } catch (error) {
    apiError(res, 500, 'Failed to create part', 'CREATE_PART_ERROR');
  }
});

// 批次操作 (上架/下架/刪除)
router.post('/parts/batch', async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!ids || !ids.length) return apiError(res, 400, 'No IDs provided', 'NO_IDS_PROVIDED');

    if (action === 'delete') {
      await prisma.part.deleteMany({ where: { id: { in: ids } } });
    } else if (action === 'publish') {
      await prisma.part.updateMany({ where: { id: { in: ids } }, data: { is_active: true } });
    } else if (action === 'unpublish') {
      await prisma.part.updateMany({ where: { id: { in: ids } }, data: { is_active: false } });
    } else {
      return apiError(res, 400, 'Invalid action', 'INVALID_ACTION');
    }

    res.json({ success: true });
  } catch (error) {
    apiError(res, 500, 'Batch operation failed', 'BATCH_ERROR');
  }
});

// CSV 批次匯入 (Bulk Import)
router.post('/parts/bulk', bulkUploadLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return apiError(res, 400, '請上傳 CSV 檔案', 'NO_FILE_UPLOADED');

  try {
    const csvString = req.file.buffer.toString('utf-8');
    const { data: rows, errors } = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true
    });

    if (errors.length > 0) return apiError(res, 400, 'CSV 解析失敗', 'CSV_PARSE_ERROR', { details: errors });

    // 檢查行數上限
    if (rows.length > 10000) {
      return apiError(res, 400, 'CSV 行數過多，上限 10,000 列', 'CSV_TOO_MANY_ROWS');
    }

    // 檢查危險字元開頭的儲存格
    const dangerousPrefixes = ['=', '+', '-', '@'];
    for (const row of rows) {
      for (const key in row) {
        if (row.hasOwnProperty(key) && typeof row[key] === 'string') {
          const trimmed = row[key].trim();
          if (trimmed.length > 0 && dangerousPrefixes.includes(trimmed[0])) {
            return apiError(res, 400, 'CSV 包含危險公式字開頭的儲存格', 'CSV_DANGEROUS_CONTENT');
          }
        }
      }
    }

    const results = { success: 0, failed: 0, errors: [] };

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        try {
          if (!row.sku || !row.name) continue;

          // Upsert: 存在則更新，不存在則新增
          await tx.part.upsert({
            where: { sku: row.sku },
            update: {
              name: row.name,
              msrp_price: row.msrp ? Number(row.msrp) : undefined,
              wholesale_price: row.wholesale ? Number(row.wholesale) : undefined,
              stock_qty: row.stock ? Number(row.stock) : undefined
            },
            create: {
              sku: row.sku,
              name: row.name,
              brand: row.brand || 'Generic',
              category_main: row.category || 'Other',
              msrp_price: row.msrp ? Number(row.msrp) : 0,
              wholesale_price: row.wholesale ? Number(row.wholesale) : 0,
              stock_qty: row.stock ? Number(row.stock) : 0
            }
          });
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push({ sku: row.sku, error: err.message });
        }
      }
    });

    res.json({ message: 'Import completed', results });
  } catch (error) {
    apiError(res, 500, '匯入過程發生錯誤', 'BULK_IMPORT_ERROR');
  }
});

module.exports = router;