const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { needsInstalledCaliperReview } = require('./services/installedCaliperCompatibility');

const garageCustomersRoutes = require('./routes/garageCustomers'); // 🆕 車廠客戶管理
const apiRoutes = require('./routes/api');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

// CSRF 中介軟體：測試環境不載入 (避免 csurf ES module 問題)
let csrfMiddleware;
if (process.env.NODE_ENV !== 'test') {
  csrfMiddleware = require('./middleware/csrfProtection');
} else {
  // 測試環境用 noop middleware
  csrfMiddleware = {
    csrfProtection: (req, res, next) => next(),
    getCsrfToken: (req, res) => res.json({ csrfToken: 'mock-csrf-token' }),
    verifyCsrfToken: (req, res, next) => next(),
    skipCsrfFor: () => (req, res, next) => next(),
  };
}
const vehicleRoutes = require('./routes/vehicles');
const vehicleModificationRoutes = require('./routes/vehicleModifications');
const consumerPartsRoutes = require('./routes/consumerParts');
const consumerOrderRoutes = require('./routes/consumerOrders');
const aiRoutes = require('./routes/ai');
const garageRoutes = require('./routes/garages');
const appointmentRoutes = require('./routes/appointments');
const reviewRoutes = require('./routes/reviews'); // 🆕 車廠評價
const adminAppointmentRoutes = require('./routes/adminAppointments');
const adminGarageRoutes = require('./routes/adminGarages');
const garageAppointmentRoutes = require('./routes/garageAppointments');
const garageSettingsRoutes = require('./routes/garageSettings'); // 🆕 車廠門店設定（店面照/工資表）
const seoRoutes = require('./routes/seo'); // 🆕 SEO：sitemap.xml 自動生成
const garageReportsRoutes = require('./routes/garageReports'); // 🆕 車廠月報表
const adminStockAlertsRoutes = require('./routes/adminStockAlerts'); // 🆕 低庫存警示（可開關）
const serviceRecordRoutes = require('./routes/serviceRecords');
const garageServiceRecordRoutes = require('./routes/garageServiceRecords');
const garagePurchaseOrderRoutes = require('./routes/garagePurchaseOrders'); // 🆕 B2B 採購單
const adminPurchaseOrderRoutes = require('./routes/adminPurchaseOrders');   // 🆕 管理端採購單
const adminStatsRoutes = require('./routes/adminStats');
const adminSettingsRoutes = require('./routes/adminSettings');
const adminInventoryRoutes = require('./routes/adminInventory');
const adminUserRoutes = require('./routes/adminUsers');
const adminVehicleRoutes = require('./routes/adminVehicles');
const adminBackupRoutes = require('./routes/adminBackup');
const adminVehicleVariantRoutes = require('./routes/adminVehicleVariants');
const adminVehicleVariantsRoutes = require('./routes/adminVehicleVariants');
const adminAiDraftRoutes = require('./routes/adminAiDrafts');
const adminPartsRouter = require('./routes/adminParts'); // 🆕 商品管理路由
const aiSearchRoutes = require('./routes/aiSearch');
const adminCategoryRoutes = require('./routes/adminCategories');
const maintenanceReminderRoutes = require('./routes/maintenanceReminders');
const repurchaseRoutes = require('./routes/repurchase');
const myCarRoutes = require('./routes/myCar');                    // 🆕 我的愛車
const wishlistRoutes = require('./routes/wishlist');              // 🆕 願望清單/降價通知
const adminDashboardInsightsRoutes = require('./routes/adminDashboardInsights'); // 🆕 儀表板聚合
const adminProcurementRoutes = require('./routes/adminProcurement'); // 🆕 進貨成本管理
const adminBankRoutes = require('./routes/adminBank'); // 🆕 管理端銀行對帳與訂單操作

const prisma = new PrismaClient();
const app = express();

// 🔒 可選車廠辨識：公開商品端點依 req.isGarage 決定是否回傳批發價/料號
const optionalGarageAuth = require('./middleware/optionalGarageAuth');
const { csrfProtection, verifyCsrfToken } = require('./middleware/csrfProtection');

// 🔒 CORS 白名單：ALLOWED_ORIGINS 以逗號分隔；未設定時預設僅本機開發埠＋站方 ngrok 網域
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://localhost:5174,https://chewy-licking-grumbling.ngrok-free.dev')
  .split(',').map(s => s.trim()).filter(Boolean);

// 安全與 CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(morgan('dev'));
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: "10mb" }));
app.use(compression());

// CSRF 保護：針對會話型認證的路由（排除純 token API、webhook、公開端點）
// 規則：
// - 公開 GET 端點：跳過
// - 含 Authorization Bearer token 的 API：跳過（由 token 保護）
// - 登入/註冊/公開頁面：跳過
// - 其他會話型 POST/PATCH/DELETE：啟用 CSRF
app.use((req, res, next) => {
  // GET/HEAD/OPTIONS 不需 CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // 有 Bearer token 的請求跳過 CSRF (Token-based auth 免疫 CSRF)
  const auth = req.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return next();
  }
  
  // 豁免特定公開路由
  const exemptPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/garage/login',
    '/api/auth/admin/login',
    '/api/auth/send-code',
    '/api/auth/verify-code',
    '/api/auth/refresh',
    '/api/health',
    '/health',
    '/api/parts/recommended',
    '/api/support/replies', // 內部：Hermes adapter 轉送客服回覆（自帶 X-Internal-Secret 驗證）
  ];
  
  const path = req.path;
  const isExempt = exemptPaths.some(p => path.startsWith(p));
  if (isExempt) return next();
  
  // Webhook 路由跳過
  if (path.startsWith('/api/webhooks/')) return next();
  
  // 其他 API 路由啟用 CSRF — Bearer token（JWT）已具備身份驗證，跳過 CSRF
  if (path.startsWith('/api/')) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return next(); // JWT 身份驗證，無需 CSRF 檢查
    }
    return verifyCsrfToken(req, res, next);
  }
  
  next();
  });

  // CSRF Token 端點：前端在初始化時呼叫取得 token
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // 請求鏈路診斷：可用 request ID 比對瀏覽器、代理與 API；絕不記錄 token 內容。
  app.use((req, res, next) => {
  req.requestId = req.get('X-Request-Id') || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const authorization = req.get('Authorization');
  // 永遠記錄 Authorization header 的長度與格式（不記錄 token 內容）
  if (authorization) {
    console.info('[EXPRESS_ENTRY] Authorization received', {
      requestId: req.requestId,
      path: req.originalUrl,
      authorizationLength: authorization.length,
      hasBearerPrefix: authorization.startsWith('Bearer '),
    });
  } else {
    console.info('[EXPRESS_ENTRY] No Authorization header', {
      requestId: req.requestId,
      path: req.originalUrl,
    });
  }
  next();
});

// 靜態目錄掛載
const mediaDir = path.join(__dirname, "../media");
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

// 🟢 圖片自動補全中間件（雙向支援 PNG ↔ JPG ↔ WebP）
app.use("/media", (req, res, next) => {
  const requestPath = req.path;
  const filePath = path.join(mediaDir, requestPath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') {
    const webpPath = filePath.replace(/\.(jpg|jpeg)$/i, '.webp');
    if (fs.existsSync(webpPath)) return res.sendFile(webpPath);
    const pngPath = filePath.replace(/\.(jpg|jpeg)$/i, '.png');
    if (fs.existsSync(pngPath)) return res.sendFile(pngPath);
  }

  if (ext === '.png') {
    const webpPath = filePath.replace(/\.png$/i, '.webp');
    if (fs.existsSync(webpPath)) return res.sendFile(webpPath);
    const jpgPath = filePath.replace(/\.png$/i, '.jpg');
    if (fs.existsSync(jpgPath)) return res.sendFile(jpgPath);
    const jpegPath = filePath.replace(/\.png$/i, '.jpeg');
    if (fs.existsSync(jpegPath)) return res.sendFile(jpegPath);
  }

  next();
});
app.use("/media", express.static(mediaDir));

// ============================================================
// 🆕 售後問題附件（order_issues）上傳檔案
// 掛載 /uploads 靜態目錄，讓前端 <img src="..."> 能顯示縮圖
// - 設定 7 天快取
// - 非圖片/影片一律加上 Content-Disposition: attachment
// - 加上 X-Content-Type-Options: nosniff 防止 MIME 嗅探
// ============================================================
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir, {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.webm'].includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// API 路由（部分需公開）
app.use('/api/ai', aiRoutes);
app.use('/api/garages', garageRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes); // 🆕 車廠評價
app.use('/api/admin/appointments', adminAppointmentRoutes);

// ========================================
// 🌐 公開 API（僅顯示已審核車型）
// ========================================
app.get('/api/categories/tree', async (req, res) => {
  try {
    const cats = await prisma.categories.findMany({
      where: { is_active: true },
      include: { subcategories: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
      orderBy: { sort_order: 'asc' },
    });
    res.json(cats);
  } catch (err) { console.error('categories/tree 錯誤:', err); res.status(500).json({ error: '無法取得分類' }); }
});

app.get('/api/vehicles/years', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1; // 允許當前年份+1（預售車款）
    
    const years = await prisma.vehicleVariant.findMany({
      where: { 
        is_approved: true,
        year_start: { lte: maxYear } // 過濾掉未來不合理的年份
      },
      select: { year_start: true },
      distinct: ['year_start'],
      orderBy: { year_start: 'desc' },
    });
    res.json(years.map(y => y.year_start));
  } catch (err) { console.error('vehicles/years 錯誤:', err); res.status(500).json({ error: '無法取得年份列表' }); }
});

app.get('/api/vehicles/makes', async (req, res) => {
  try {
    const { year } = req.query;
    const where = { is_approved: true };
    if (year) { where.year_start = { lte: parseInt(year) }; where.year_end = { gte: parseInt(year) }; }
    const makes = await prisma.vehicleVariant.findMany({
      where, select: { make: true }, distinct: ['make'], orderBy: { make: 'asc' },
    });
    res.json(makes.map(m => m.make));
  } catch (err) { console.error('vehicles/makes 錯誤:', err); res.status(500).json({ error: '無法取得廠牌列表' }); }
});

app.get('/api/vehicles/models', async (req, res) => {
  try {
    const { make, year } = req.query;
    if (!make) return res.status(400).json({ error: '請提供 make' });
    const where = { is_approved: true, make: String(make) };
    if (year) { where.year_start = { lte: parseInt(year) }; where.year_end = { gte: parseInt(year) }; }
    const models = await prisma.vehicleVariant.findMany({
      where, select: { model: true }, distinct: ['model'], orderBy: { model: 'asc' },
    });
    res.json(models.map(m => m.model));
  } catch (err) { console.error('vehicles/models 錯誤:', err); res.status(500).json({ error: '無法取得車型列表' }); }
});

app.get('/api/vehicles/variants', async (req, res) => {
  try {
    const { make, model, year } = req.query;
    if (!make || !model) return res.status(400).json({ error: '請提供 make 和 model' });
    const where = { is_approved: true, make: String(make), model: String(model) };
    if (year) { where.year_start = { lte: parseInt(year) }; where.year_end = { gte: parseInt(year) }; }
    const variants = await prisma.vehicleVariant.findMany({ where, orderBy: { year_start: 'asc' } });
    res.json(variants);
  } catch (err) { console.error('vehicles/variants 錯誤:', err); res.status(500).json({ error: '無法取得車輛列表' }); }
});

// ========================================
// 🔓 公開端點：引擎列表 (不需驗證)
// ========================================
app.get('/api/vehicles/engines', async (req, res) => {
  try {
    const { make, model, year } = req.query;
    if (!make || !model) return res.status(400).json({ error: '請提供品牌和車系' });

    const where = {
      is_approved: true,
      make: String(make),
      model: String(model)
    };
    if (year) {
      where.year_start = { lte: parseInt(year) };
      where.year_end = { gte: parseInt(year) };
    }

    const engines = await prisma.vehicleVariant.findMany({
      where,
      select: {
        id: true,
        engine_code: true,
        drive_type: true,
      },
      distinct: ['engine_code']
    });

    const enginesFormatted = engines
      .filter(e => e.engine_code)
      .map(e => ({
        id: e.id,
        code: e.engine_code,
        display: e.engine_code + (e.drive_type ? ' - ' + e.drive_type : '')
      }))
      .filter((e, i, arr) => arr.findIndex(x => x.code === e.code) === i);

    res.json(enginesFormatted);
  } catch (err) { console.error('vehicles/engines 錯誤:', err); res.status(500).json({ error: '無法取得引擎列表' }); }
});

// =======================================
// 🆕 零件品牌清單（公開，品牌篩選用）
// =======================================
app.get('/api/parts/brands', async (req, res) => {
  try {
    // 🆕 連動過濾：依零件類別/零件項目回傳有商品的品牌
    const { subcategory, category } = req.query;
    const where = { is_active: true };
    if (subcategory) where.subcategory_id = parseInt(subcategory);
    if (category) where.category = category;
    const brands = await prisma.part.findMany({
      where,
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    res.json(brands.map(b => b.brand).filter(Boolean));
  } catch (error) {
    console.error('零件品牌列表失敗:', error);
    res.status(500).json({ error: '無法取得品牌列表' });
  }
});

// =======================================
// 推薦/搜尋零件 API（放在 /api/parts/:id 之前）
// =======================================
app.get('/api/parts/recommended', optionalGarageAuth, async (req, res) => {
  try {
    const { variantId, search, category, subcategory, brand, page = 1, pageSize = 12, sort = 'hot' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.min(50, parseInt(pageSize));
    const skip = (pageNum - 1) * limit;

    let whereClause = { is_active: true };

    if (variantId) {
      // 🆕 通用型零件（is_universal）在任何車型篩選下都會出現
      whereClause.AND = [
        {
          OR: [
            { is_universal: true },
            { compatible_vehicles: { some: { vehicle_id: parseInt(variantId) } } },
          ],
        },
      ];
    }

    if (category) whereClause.category = category;
    if (subcategory) whereClause.subcategory_id = parseInt(subcategory);
    // 🆕 零件品牌精確篩選
    if (brand) whereClause.brand = brand;

    if (search && search.trim() !== '') {
      // 與上方 AND 組合成 (車型/通用件) AND (關鍵字) 語意
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 🔒 料號/批發價為車廠專屬欄位：匿名與一般車主一律不回傳（防比價爬蟲）
    const baseSelect = {
      id: true, name: true, brand: true,
      msrp_price: true,
      stock_qty: true, image_url: true, description: true,
      category: true, subcategory_id: true, created_at: true,
      is_universal: true, // 🆕 前端顯示通用型標記
      distributor_stock_qty: true, // 🆕 總代理庫存（現貨判定：自備＋總代理）
      is_official: true, // 🆕 公司貨標記（MST/KN/Pipercross）
    };
    const select = req.isGarage ? { ...baseSelect, sku: true, wholesale_price: true } : baseSelect;

    const orderBy = sort === 'hot' ? { created_at: 'desc' } :
                   sort === 'newest' ? { created_at: 'desc' } :
                   sort === 'price_asc' ? { msrp_price: 'asc' } :
                   sort === 'price_desc' ? { msrp_price: 'desc' } :
                   { name: 'asc' };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where: whereClause,
        select,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.part.count({ where: whereClause })
    ]);

    res.json({ 
      parts, 
      pagination: { page: pageNum, limit, total, pages: Math.ceil(total / limit) },
      fallbackVehicle: null
    });
  } catch (error) {
    console.error('推薦零件搜尋失敗:', error);
    res.status(500).json({ error: '搜尋失敗' });
  }
});

// 商品與目前車輛的適配判定：只根據已建檔的相容表與通用件，不將未知資料誤標為可安裝。
app.get('/api/parts/:id/compatibility', require('./middleware/optionalAuthMiddleware'), async (req, res) => {
  try {
    const partId = Number(req.params.id);
    if (!Number.isInteger(partId)) return res.status(400).json({ code: 'INVALID_PART_ID', message: '無效的商品 ID' });

    // 匿名訪客：引導登入／選車，不洩漏相容資料
    if (!req.userId) {
      return res.json({ status: 'NEEDS_VEHICLE', reason: '登入並選擇車輛後即可確認適用性', vehicle: null });
    }

    const user = await prisma.endUser.findUnique({
      where: { id: req.userId },
      select: { currentVehicleId: true },
    });
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: {
        userId: req.userId,
        ...(user?.currentVehicleId ? { id: user.currentVehicleId } : {}),
      },
      include: { variant: true, modifications_detail: true },
    });
    if (!vehicle) {
      return res.json({ status: 'NEEDS_VEHICLE', reason: '尚未選擇目前車輛', vehicle: null });
    }

    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: {
        id: true, name: true, category: true, is_universal: true,
        subcategory: { select: { name: true, category: { select: { name: true } } } },
        parts_on_categories: { select: { category: { select: { name: true } } } },
        compatible_vehicles: { select: { vehicle_id: true } },
      },
    });
    if (!part) return res.status(404).json({ code: 'PART_NOT_FOUND', message: '找不到此商品' });

    if (needsInstalledCaliperReview(vehicle, part)) {
      return res.json({
        status: 'NEEDS_REVIEW',
        reason: '此車已記錄安裝卡鉗，原廠車型相容資料或通用件標示不足以確認煞車耗材適配。請由合作車廠核對實際卡鉗、前後軸與來令片形狀／尺寸；活塞數或相似型號不能作為已驗證適配依據。',
        vehicle: formatVehicle(vehicle),
      });
    }

    if (part.is_universal) {
      return res.json({ status: 'CONFIRMED', reason: '此商品已標示為通用件，仍請依安裝條件確認。', vehicle: formatVehicle(vehicle) });
    }

    const compatibleIds = new Set(part.compatible_vehicles.map((item) => item.vehicle_id));
    const variantId = vehicle.variantId || vehicle.variant?.id;
    const confirmed = Boolean(variantId && compatibleIds.has(variantId));
    return res.json({
      status: confirmed ? 'CONFIRMED' : 'NEEDS_REVIEW',
      reason: confirmed ? '已由已建檔車型相容資料確認。' : '目前尚無此車型的已驗證相容資料，請交由合作車廠確認。',
      vehicle: formatVehicle(vehicle),
    });
  } catch (error) {
    console.error('商品相容性查詢失敗:', { requestId: req.requestId, message: error.message });
    res.status(500).json({ code: 'COMPATIBILITY_LOOKUP_FAILED', message: '暫時無法確認相容性', requestId: req.requestId });
  }
});

function formatVehicle(vehicle) {
  return {
    id: vehicle.id,
    variantId: vehicle.variantId || vehicle.variant?.id || null,
    make: vehicle.make || vehicle.variant?.make || null,
    model: vehicle.model || vehicle.variant?.model || null,
    generation: vehicle.generation || vehicle.variant?.generation || null,
    year: vehicle.year || null,
    engine: vehicle.engine || vehicle.variant?.engine_code || null,
  };
}

// 取得單一商品詳情
app.get('/api/parts/:id', optionalGarageAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: '無效的商品 ID 格式' });
    }

    const part = await prisma.part.findUnique({ where: { id } });
    if (!part) return res.status(404).json({ message: '找不到此商品' });

    // 🔒 車廠專屬欄位過濾：批發價/料號不給匿名與一般車主（防比價）
    let payload = part;
    if (!req.isGarage) {
      const { sku, wholesale_price, ...rest } = part;
      payload = rest;
    }

    // 🔥 點閱統計（熱門零件排序用；不阻塞回應、失敗不影響瀏覽）
    prisma.part.update({
      where: { id },
      data: { view_count: { increment: 1 } }
    }).catch(err => console.error('點閱統計失敗:', err.message));

    res.status(200).json(payload);
  } catch (error) {
    console.error('取得商品詳情失敗:', error);
    res.status(500).json({ message: '伺服器內部錯誤' });
  }
});

// ========================================
// 🔐 需驗證的路由掛載
// ========================================
app.use('/', apiRoutes);
app.use('/api', apiRoutes);
app.use('/', shopRoutes);
app.use('/shop', shopRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehicles', vehicleModificationRoutes);
app.use('/api/consumer/parts', consumerPartsRoutes);
app.use('/api/brake-specs', require('./routes/brakeSpecs')); // 煞車件規格（跨廠牌對應）
app.use('/api/consumer/orders', consumerOrderRoutes);
app.use('/api/admin/garages', adminGarageRoutes);
app.use('/api/garage/appointments', garageAppointmentRoutes);
app.use('/api/garage/schedule', require('./routes/garageSchedule')); // 🆕 車廠排程管理
app.use('/api/garage/work-orders', require('./routes/garageWorkOrders')); // 🆕 車廠工單管理
app.use('/api/garage/settings', garageSettingsRoutes); // 🆕 車廠門店設定（店面照/工資表）
app.use('/api/garage/customers', garageCustomersRoutes); // 🆕 車廠客戶管理
app.use('/', seoRoutes); // 🆕 sitemap.xml（掛根路徑）
app.use('/api/garage/reports', garageReportsRoutes); // 🆕 車廠月報表
app.use('/api/admin/analytics', require('./routes/analyticsReports')); // 🆕 管理端銷售分析儀表板
app.use('/api/admin/stock-alerts', adminStockAlertsRoutes); // 🆕 低庫存警示
app.use('/api/service-records', serviceRecordRoutes);
app.use('/api/garage/service-records', garageServiceRecordRoutes);
app.use('/api/maintenance-reminders', maintenanceReminderRoutes); // 🆕 保養提醒
app.use('/api/repurchase', repurchaseRoutes);                     // 🆕 回購專區
app.use('/api/garage/purchase-orders', garagePurchaseOrderRoutes); // 🆕 B2B 採購單
app.use('/api/admin/purchase-orders', adminPurchaseOrderRoutes);   // 🆕 管理端採購單
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/vehicles', adminVehicleRoutes);
app.use('/api/admin', adminBackupRoutes);
app.use('/api/admin/variants', adminVehicleVariantsRoutes);
app.use('/api/admin/ai-drafts', adminAiDraftRoutes);
app.use('/api/admin/parts', adminPartsRouter); // 🆕 商品管理路由
app.use('/api/admin/media', require('./routes/adminMedia')); // 🆕 媒體檔案瀏覽
app.use('/api/ai', aiSearchRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/my-car', myCarRoutes);                       // 🆕 我的愛車
app.use('/api/wishlist', wishlistRoutes);                  // 🆕 願望清單
app.use('/api/admin/dashboard-insights', adminDashboardInsightsRoutes); // 🆕 儀表板聚合
app.use('/api/admin/procurement', adminProcurementRoutes); // 🆕 進貨成本管理
app.use('/api/admin', adminBankRoutes); // 🆕 管理端銀行對帳與訂單操作
app.use('/api/support', require('./routes/support')); // 🆕 即時客服訊息轉發（Hermes webhook → Telegram）

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/api/health", (req, res) => res.json({ ok: true })); // 與 /health 同義，供 LB／檢查清單使用

// ========================================
// 🏥 健康檢查端點 (詳細版)
// ========================================
app.use('/health', require('./routes/health'));

// 404 處理 - 使用統一錯誤格式
const { notFoundError } = require('./utils/errorHandler');
app.use((req, res) => notFoundError(res, 'Not Found', { path: req.originalUrl }));

// 全域錯誤處理
const { internalError } = require('./utils/errorHandler');
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  // 如果已經有響應，則不要覆蓋
  if (res.headersSent) {
    return next(err);
  }
  internalError(res, 'Internal Server Error', err.message);
});

module.exports = app;