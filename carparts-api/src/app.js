const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const { PrismaClient } = require('@prisma/client');

const garageCustomersRoutes = require('./routes/garageCustomers'); // 🆕 車廠客戶管理
const apiRoutes = require('./routes/api');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
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

// 安全與 CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(morgan('dev'));
// 🔒 CORS 白名單：ALLOWED_ORIGINS 以逗號分隔；未設定時預設僅本機開發埠＋站方 ngrok 網域
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://localhost:5174,https://chewy-licking-grumbling.ngrok-free.dev')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // 同源/curl/伺服器間呼叫（無 Origin header）一律放行
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false); // 不在白名單：不給 CORS 憑證（瀏覽器會擋）
  }
}));
app.use(express.json({ limit: "10mb" }));
app.use(compression());

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
        displacement: true,
        horsepower: true,
        fuel_type: true,
        drive_type: true,
        transmission: true
      },
      distinct: ['engine_code']
    });

    const enginesFormatted = engines
      .filter(e => e.engine_code)
      .map(e => ({
        id: e.id,
        code: e.engine_code,
        display: e.engine_code + (e.displacement ? ' (' + e.displacement + ')' : '') + (e.horsepower ? ' - ' + e.horsepower + 'hp' : '') + (e.fuel_type ? ' - ' + e.fuel_type : '') + (e.drive_type ? ' - ' + e.drive_type : '')
      }))
      .filter((e, i, arr) => arr.findIndex(x => x.code === e.code) === i);

    res.json(enginesFormatted);
  } catch (err) { console.error('vehicles/engines 錯誤:', err); res.status(500).json({ error: '無法取得引擎列表' }); }
});

// ========================================
// 推薦/搜尋零件 API（放在 /api/parts/:id 之前）
// ========================================
app.get('/api/parts/recommended', optionalGarageAuth, async (req, res) => {
  try {
    const { variantId, search, category, subcategory } = req.query;
    let whereClause = { is_active: true };

    if (variantId) {
      whereClause.compatible_vehicles = {
        some: { vehicle_id: parseInt(variantId) }
      };
    }

    if (category) whereClause.category = category;
    if (subcategory) whereClause.subcategory_id = parseInt(subcategory);

    if (search && search.trim() !== '') {
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
    };
    const select = req.isGarage ? { ...baseSelect, sku: true, wholesale_price: true } : baseSelect;

    const parts = await prisma.part.findMany({
      where: whereClause,
      select,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.json({ parts });
  } catch (error) {
    console.error('推薦零件搜尋失敗:', error);
    res.status(500).json({ error: '搜尋失敗' });
  }
});

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
app.use('/api/ai', aiSearchRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/my-car', myCarRoutes);                       // 🆕 我的愛車
app.use('/api/wishlist', wishlistRoutes);                  // 🆕 願望清單
app.use('/api/admin/dashboard-insights', adminDashboardInsightsRoutes); // 🆕 儀表板聚合
app.use('/api/admin/procurement', adminProcurementRoutes); // 🆕 進貨成本管理
app.use('/api/admin', adminBankRoutes); // 🆕 管理端銀行對帳與訂單操作

app.get("/health", (req, res) => res.json({ ok: true }));

// ========================================
// 🏥 健康檢查端點 (詳細版)
// ========================================
app.use('/health', require('./routes/health'));

// 404 處理
app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.originalUrl }));

// 全域錯誤處理
const { apiError } = require('./utils/errorHandler');
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack);
  // 如果已經有響應，則不要覆蓋
  if (res.headersSent) {
    return next(err);
  }
  apiError(res, 500, 'Internal Server Error', 'INTERNAL_ERROR');
});

module.exports = app;