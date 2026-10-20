// src/routes/consumerOrders.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/authMiddleware');
const multer = require('multer'); // 🆕 引入 multer 處理 FormData 檔案上傳
const fs = require('fs');         // 🆕 檔案系統操作
const path = require('path');     // 🆕 路徑處理
const crypto = require('crypto'); // 🆕 隨機檔名
const { notifyOrderUpdate } = require('../services/lineService');
const {
  InventoryLogType,
  createOrderWithInventory,
  checkAvailability,
} = require('../services/inventoryTransaction');

const { saveBankSubmission } = require('../services/orderBankSubmission');
const prisma = new PrismaClient();

// 🆕 訂單加收費用（暫時由系統設定決定是否開啟；因目前未開發票）
const ORDER_SHIPPING_FEE = 60;   // 每筆訂單加收運費 NT$60
const ORDER_TAX_RATE = 0.05;     // 稅金 5%

// 🆕 公開：查詢訂單加收費用設定（結帳前置顯示用，無需登入）
router.get('/order-fee', async (req, res) => {
  try {
    const admin = await prisma.workshop.findFirst({ where: { role: 'ADMIN' }, select: { garage_slots: true } });
    const enabled = !!admin?.garage_slots?.system?.orderFeeEnabled;
    res.json({ enabled, shippingFee: ORDER_SHIPPING_FEE, taxRate: ORDER_TAX_RATE });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// 🆕 售後附件上傳安全設定
// - 白名單 MIME + 副檔名（防病毒/惡意檔案）
// - 隨機檔名保留副檔名（避免路徑猜測）
// - 20 MB 大小限制
// ============================================================
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/webm',
];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.webm'];

const issueUploadDir = path.join(__dirname, '..', '..', 'uploads', 'issues');
if (!fs.existsSync(issueUploadDir)) {
  fs.mkdirSync(issueUploadDir, { recursive: true });
}

const issueStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, issueUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(Object.assign(new Error('不允許的檔案副檔名'), { code: 'INVALID_FILE_TYPE' }));
    }
    const random = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

const upload = multer({
  storage: issueStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 上限 20 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(Object.assign(new Error('只允許上傳圖片或影片'), { code: 'INVALID_FILE_TYPE' }));
    }
    cb(null, true);
  },
});

// 🆕 安全刪除附件實體檔案（只允許 /uploads/issues/ 下的檔案，避免路徑遍歷）
function safeDeleteIssueFile(url) {
  if (typeof url !== 'string') return;
  if (!url.startsWith('/uploads/issues/')) return;
  const filename = path.basename(url);
  if (!filename || filename.includes('..')) return;
  const filePath = path.join(issueUploadDir, filename);
  // 再次確認解析後路徑仍在 issueUploadDir 內
  if (!filePath.startsWith(issueUploadDir)) return;
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (err) { console.warn('刪除附件檔案失敗:', err.message); }
  }
}

router.use(auth);

// ===== 金流常數（由環境變數讀取，不寫死在前端）=====
const BANK_INFO = {
  bank_code: process.env.BANK_ACCOUNT_BANK_CODE || '822',
  account_number: process.env.BANK_ACCOUNT_NUMBER || '',
};

const PREORDER_DEPOSIT_RATE = 0.5; // 代購訂金 50%

// POST /api/consumer/orders — 建立訂單
router.post('/', async (req, res) => {
  try {
    const {
      items,
      shipping_address,    // 前端使用 snake_case
      receiver_name,       // 前端使用 snake_case
      receiver_phone,      // 前端使用 snake_case
      need_installation,   // 前端使用 snake_case
      vehicle_id,          // 前端使用 snake_case
      ignore_stock,        // 是否忽略庫存（進口訂購）
      note,
      idempotency_key,     // 🆕 冪等鍵：防止重複下單
    } = req.body;

    // ========== 1. 基本驗證 ==========
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '購物車為空' });
    }

    if (!receiver_name?.trim()) {
      return res.status(400).json({ error: '請填寫收件人姓名' });
    }
    if (!receiver_phone?.trim()) {
      return res.status(400).json({ error: '請填寫聯絡電話' });
    }
    if (!shipping_address?.trim()) {
      return res.status(400).json({ error: '請填寫收貨地址' });
    }

    // 同一商品在購物車中只處理一次，避免重複列項導致庫存判斷失真。
    const normalizedItems = Object.values(items.reduce((result, item) => {
      const partId = Number(item.part_id || item.partId);
      const qty = Number(item.quantity || item.qty || 1);
      if (!Number.isInteger(partId) || !Number.isInteger(qty) || qty < 1) {
        throw Object.assign(new Error('商品或數量格式錯誤'), { code: 'INVALID_ORDER_ITEM' });
      }
      result[partId] ||= { partId, qty: 0 };
      result[partId].qty += qty;
      return result;
    }, {})) || [];

    // ========== 2. 查詢商品資訊 ==========
    const partIds = normalizedItems.map(item => item.partId);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
    });

    if (parts.length !== normalizedItems.length) {
      return res.status(400).json({ error: '部分商品不存在' });
    }

    // 建立 part_id -> Part 的對照表
    const partMap = {};
    parts.forEach(p => { partMap[p.id] = p; });

    // ========== 3. 計算總金額（含現貨/代購拆分） ==========
    let instockTotal = 0;      // 現貨小計
    let preorderTotal = 0;     // 代購小計（全額）
    const orderItems = [];

    const ignoreStock = ignore_stock === true;

    for (const item of normalizedItems) {
      const partId = item.partId;
      const part = partMap[partId];
      const qty = item.qty;
      const price = Number(part.msrp_price);
      const subtotal = price * qty;
      // 現貨判定＝自備庫存＋總代理庫存（總代理有貨即視為現貨/公司貨）
      const availableQty = part.stock_qty + (part.distributor_stock_qty || 0);
      const isPreorder = ignoreStock || availableQty < qty;

      if (isPreorder) preorderTotal += subtotal;
      else instockTotal += subtotal;

      orderItems.push({
        partId: part.id,
        qty: qty,
        price: price,
        skuSnapshot: part.sku,
        nameSnapshot: part.name,
        isPreorder: isPreorder,
        promisedWeeks: ignoreStock ? 3 : (availableQty < qty ? Math.ceil((part.preorder_lead_time_days || 21) / 7) : 0),
        promisedWeeksMin: isPreorder ? 2 : null,
        promisedWeeksMax: isPreorder ? 4 : null,
      });
    }

    // ========== 4. 金流拆分：現貨 100% + 代購 50% 訂金（＋運費 60＋稅金 5%，依系統設定） ==========
    const admin = await prisma.workshop.findFirst({ where: { role: 'ADMIN' }, select: { garage_slots: true } });
    const orderFeeEnabled = !!admin?.garage_slots?.system?.orderFeeEnabled;

    const subtotal = instockTotal + preorderTotal;
    const shippingFee = orderFeeEnabled ? ORDER_SHIPPING_FEE : 0;
    const taxAmount = orderFeeEnabled ? Math.round(subtotal * ORDER_TAX_RATE) : 0;
    const total = subtotal + shippingFee + taxAmount;
    const payableAmount = Math.round(instockTotal + preorderTotal * PREORDER_DEPOSIT_RATE) + shippingFee + taxAmount;
    const depositAmount = payableAmount - instockTotal;
    const balanceAmount = total - payableAmount;

    // 訂單類型判定
    let orderType = 'INSTOCK';
    if (instockTotal > 0 && preorderTotal > 0) orderType = 'MIXED';
    else if (preorderTotal > 0) orderType = 'PREORDER';

    // ========== 5. 產生訂單編號 (修正為本地時間 ISO 字串避免時區跨日問題) ==========
    const offset = new Date().getTimezoneOffset() * 60000;
    const localDateStr = new Date(Date.now() - offset).toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `C${localDateStr}-${random}`;

    // ========== 6. 建立訂單（使用統一 Transaction Service） ==========
    const orderData = {
      order_number: orderNumber,
      userId: req.userId,
      status: 'PENDING_PAYMENT',
      subtotal_amount: subtotal,
      shipping_fee: shippingFee,
      tax_amount: taxAmount,
      total_amount: total,
      orderType: orderType,
      depositAmount: orderType === 'INSTOCK' ? null : depositAmount,
      balanceAmount: orderType === 'INSTOCK' ? null : balanceAmount,
      shipping_address: shipping_address,
      receiver_name: receiver_name,
      receiver_phone: receiver_phone,
      need_installation: need_installation || false,
      vehicle_id: vehicle_id || null,
      is_import_order: ignoreStock,
      note: note || null,
    };

    const result = await createOrderWithInventory({
      orderData,
      items: orderItems,
      idempotencyKey: idempotency_key,
      inventoryType: ignoreStock ? InventoryLogType.CONSUMER_ORDER : InventoryLogType.CONSUMER_ORDER,
      baseNote: `order:${orderNumber}`,
    });

    if (result.idempotent) {
      return res.status(200).json({
        idempotent: true,
        order_number: result.order.order_number,
        message: '訂單已存在，回傳現有訂單',
      });
    }

    const order = result.order;

    // ========== 7. 回傳成功（含匯款帳戶與應付金額） ==========
    res.status(201).json({
      order_number: order.order_number,
      status: order.status,
      subtotal_amount: subtotal,
      shipping_fee: shippingFee,
      tax_amount: taxAmount,
      total_amount: Number(order.total_amount),
      order_type: orderType,
      payable_amount: payableAmount,
      deposit_amount: orderType === 'INSTOCK' ? null : depositAmount,
      balance_amount: orderType === 'INSTOCK' ? null : balanceAmount,
      order_fee_enabled: orderFeeEnabled,
      bank_info: BANK_INFO,
      is_import_order: order.is_import_order || false,
      message: ignoreStock ? '進口訂購已成立' : '訂單已成立',
    });

  } catch (error) {
    console.error('建立訂單失敗:', { requestId: req.requestId, code: error.code, message: error.message });
    if (error.code === 'INVALID_ORDER_ITEM') {
      return res.status(400).json({ code: error.code, error: error.message, requestId: req.requestId });
    }
    if (error.code === 'INSUFFICIENT_STOCK' || error.code === 'PART_NOT_FOUND' || error.code === 'PART_INACTIVE') {
      return res.status(409).json({ code: error.code, error: error.message, requestId: req.requestId });
    }
    res.status(500).json({ code: 'ORDER_CREATE_FAILED', error: '建立訂單失敗，請稍後再試', requestId: req.requestId });
  }
});

// GET /api/consumer/orders — 查詢自己的訂單
router.get('/', async (req, res) => {
  try {
    // 🆕 分頁：?page=1&pageSize=10（不傳 page 則回全部，相容舊前端）
    const page = parseInt(req.query.page) || null;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 50);
    // 🆕 篩選：status（訂單狀態，AFTERSALE=售後中）與 keyword（訂單編號/商品名/零件號）
    const andConditions = [{ userId: req.userId }];
    if (req.query.status && req.query.status !== 'ALL') {
      if (req.query.status === 'AFTERSALE') {
        andConditions.push({
          OR: [
            { issues: { some: {} } },
            { returns: { some: { status: { in: ['PENDING', 'APPROVED', 'RECEIVED'] } } } },
          ],
        });
      } else {
        andConditions.push({ status: req.query.status });
      }
    }
    if (req.query.keyword && req.query.keyword.trim()) {
      const kw = req.query.keyword.trim();
      andConditions.push({
        OR: [
          { order_number: { contains: kw } },
          { items: { some: { OR: [
            { name_snapshot: { contains: kw } },
            { sku_snapshot: { contains: kw } },
          ] } } },
        ],
      });
    }
    const where = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const findArgs = {
      where,
      include: {
        items: {
          include: { part: true },
        },
        // 🆕 加入售後問題回報，讓客戶端也能看到自己提交過的紀錄		
		issues: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, issueType: true, description: true, mediaUrls: true, createdAt: true, orderItemId: true, adminNotes: true, status: true }
		},
        // 🆕 加入退貨申請紀錄（含商品明細，名稱回查 orderItem）
        returns: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { orderItem: true } } },
        },
        // 🆕 國內物流業者
        domesticCarrier: { select: { id: true, name: true, code: true, trackingUrl: true } },
      },
      orderBy: { created_at: 'desc' },
    };
    if (page) {
      findArgs.skip = (page - 1) * pageSize;
      findArgs.take = pageSize;
    }

    const [orders, total] = await Promise.all([
      prisma.consumerOrder.findMany(findArgs),
      prisma.consumerOrder.count({ where: { userId: req.userId } }),
    ]);

    // 🆕 每筆訂單的匯款明細：已認列（入賬）+ 未認列餘額（待核，以最近一次補登的日期/末五碼呈現）
    const claimRows = await prisma.bankRemittanceClaim.findMany({
      where: { orderId: { in: orders.map(o => o.id) } },
      orderBy: { createdAt: 'asc' },
    });
    const claimsByOrder = new Map();
    for (const c of claimRows) {
      if (!claimsByOrder.has(c.orderId)) claimsByOrder.set(c.orderId, []);
      claimsByOrder.get(c.orderId).push({ amount: Number(c.amount), transactionDate: c.transactionDate, last5: c.last5, verified: true });
    }
    for (const o of orders) {
      const claims = claimsByOrder.get(o.id) || [];
      const declared = Number(o.bankDepositActualAmount || 0);
      const claimedSum = claims.reduce((s, c) => s + Number(c.amount), 0);
      const pending = declared - claimedSum;
      o.remittances = pending > 0
        ? [...claims, { amount: pending, transactionDate: o.bankDepositDate ? new Date(o.bankDepositDate).toISOString().slice(0, 10) : null, last5: o.bankLastFiveDigits, verified: false }]
        : claims;
    }

    if (page) {
      res.json({
        orders,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } else {
      res.json(orders); // 舊格式：純陣列
    }
  } catch (error) {
    console.error('查詢訂單失敗:', error);
    res.status(500).json({ error: '查詢失敗' });
  }
});

// ============================================================
// POST /api/consumer/orders/:id/payment-method — 客戶選擇尾款支付方式
// ============================================================
router.post('/:id/payment-method', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { method } = req.body;
    if (!['BANK', 'COD'].includes(method)) return res.status(400).json({ error: '無效的支付方式' });

    const order = await prisma.consumerOrder.findFirst({ where: { id: orderId, userId: req.userId } });
    if (!order) return res.status(404).json({ error: '訂單不存在' });
    if (order.status !== 'AWAITING_BALANCE') return res.status(400).json({ error: '目前狀態無法設定尾款支付方式' });

    const baseBalance = Number(order.balanceAmount || 0) - Number(order.cod_fee || 0); // 原尾款（扣回之前加的手續費）
    const update = method === 'COD'
      ? { payment_method: 'COD', cod_fee: Math.round(baseBalance * 0.02), balanceAmount: Math.round(baseBalance * 1.02) }
      : { payment_method: 'BANK', cod_fee: 0, balanceAmount: baseBalance };
    const updated = await prisma.consumerOrder.update({
      where: { id: orderId },
      data: update,
      include: { user: { select: { lineId: true } } },
    });
    try { await notifyOrderUpdate(updated); } catch (err) { console.error('LINE 通知失敗:', err.message); }
    res.json({ message: method === 'COD' ? '已選擇貨到付款（尾款含 2% 手續費）' : '已選擇匯款支付尾款', order: updated });
  } catch (error) {
    console.error('payment-method error:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// 🆕 PATCH /api/consumer/orders/:id/complete — 客戶確認收貨
// 僅允許將 SHIPPED 狀態推進為 COMPLETED
// ============================================================
router.patch('/:id/complete', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // 確認訂單存在且屬於當前使用者
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
    });

    if (!order) return res.status(404).json({ error: '訂單不存在' });
    if (order.status !== 'SHIPPED') {
      return res.status(400).json({ error: '目前訂單狀態無法確認收貨' });
    }

    const updated = await prisma.consumerOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    // 發送 LINE 通知（失敗不影響結果）
    try {
      const withUser = await prisma.consumerOrder.findUnique({
        where: { id: orderId },
        include: { user: { select: { lineId: true } } },
      });
      if (withUser) await notifyOrderUpdate(withUser);
    } catch (err) {
      console.error('LINE 通知發送失敗:', err.message);
    }

    res.json({ message: '已確認收貨，感謝您的購買！', status: updated.status });
  } catch (error) {
    console.error('確認收貨失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/consumer/orders/refund-account — 客戶最近一次退貨的退款帳戶（重複申請免再填）
router.get('/refund-account', async (req, res) => {
  try {
    const last = await prisma.orderReturn.findFirst({
      where: {
        order: { userId: req.userId },
        refundBankCode: { not: '' },
      },
      orderBy: { createdAt: 'desc' },
      select: { refundBankCode: true, refundAccount: true, refundAccountName: true },
    });
    res.json(last || null);
  } catch (error) {
    console.error('查詢退款帳戶失敗:', error);
    res.status(500).json({ error: '查詢失敗，請稍後再試' });
  }
});

// GET /api/consumer/orders/:id — 單一訂單詳情
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.consumerOrder.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.userId,
      },
      include: {
        items: {
          include: { part: true },
        },
        // 🆕 單一訂單詳情也帶上 issues
        issues: {
          orderBy: { createdAt: 'desc' },
        },
        // 🆕 退貨申請（含商品明細）
        returns: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { orderItem: true } } },
        },
        // 🆕 國內物流業者
        domesticCarrier: { select: { id: true, name: true, code: true, trackingUrl: true } },
      },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在' });
    res.json(order);
  } catch (error) {
    console.error('查詢訂單詳情失敗:', error);
    res.status(500).json({ error: '查詢失敗' });
  }
});

// GET /api/consumer/orders/bank-info — 取得匯款帳戶資訊（車主結帳/補單用）
router.get('/bank-info', (req, res) => {
  res.json(BANK_INFO);
});

// POST /api/consumer/orders/:id/bank-info — 客戶補登匯款資料
router.post('/:id/bank-info', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { bankDepositDate, bankLastFiveDigits, actualAmount } = req.body;

    // 驗證
    if (!bankDepositDate) return res.status(400).json({ error: '請填寫匯款日期' });
    if (!bankLastFiveDigits || !/^\d{5}$/.test(String(bankLastFiveDigits))) {
      return res.status(400).json({ error: '帳號後五碼需為 5 位數字' });
    }
    if (!actualAmount || Number(actualAmount) <= 0) {
      return res.status(400).json({ error: '請填寫匯款金額' });
    }

    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, ...(!req.isAdmin && { userId: req.userId }) },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在' });

    // 待付款 / 待審核 / 已付訂金 / 待補尾款狀態皆可補登（分次匯款：每次匯款都會累加）
    const allowed = ['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'DEPOSIT_PAID', 'AWAITING_BALANCE'];
    if (!allowed.includes(order.status)) {
      return res.status(400).json({ error: `目前狀態（${order.status}）無法補登匯款` });
    }

    const isPreorder = order.orderType === 'PREORDER' || order.orderType === 'MIXED';

    const bankArgs = { orderId, isPreorder, bankDepositDate, bankLastFiveDigits, actualAmount };
    if (!req.isAdmin) bankArgs.userId = req.userId;
    const updated = await saveBankSubmission(prisma, bankArgs);

    try {
      await notifyOrderUpdate(updated);
    } catch (err) {
      console.error('LINE 通知發送失敗:', err.message);
    }

    res.json({
      message: '匯款資料已提交，等待對帳確認',
      status: updated.status,
      expected_amount: isPreorder ? Number(order.depositAmount || order.total_amount) : Number(order.total_amount),
      submitted_amount: Number(actualAmount),
      amount_mismatch: Number(actualAmount) !== (isPreorder ? Number(order.depositAmount || order.total_amount) : Number(order.total_amount)),
    });

    // 🆕 客戶送出匯款資料 → 自動觸發銀行對帳（背景執行，不延遲回應；比對成功會自動認列並推進狀態）
    setImmediate(() => {
      require('./adminBank').runReconcile()
        .then(r => console.log(`[自動對帳] 完成：比對成功 ${r.summary.matched} 筆、待人工審核 ${r.summary.manual_review} 筆`))
        .catch(err => console.error('[自動對帳] 失敗:', err.message));
    });
  } catch (error) {
    if (error.code === 'ORDER_STATE_CHANGED') {
      return res.status(409).json({ code: error.code, error: error.message });
    }
    console.error('補登匯款失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// 🆕 POST /api/consumer/orders/:id/issues — 客戶回報售後問題（支援多圖/影片）
// ============================================================
router.post('/:id/issues', upload.array('media', 5), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { orderItemId, issueType, description } = req.body;

    // 1. 權限驗證：確認該訂單存在且屬於當前登入使用者
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId }
    });

    if (!order) {
      return res.status(404).json({ error: '訂單不存在或無存取權限' });
    }

    // 2. 處理上傳檔案路徑 (若使用者有上傳)
    const mediaUrls = req.files && req.files.length > 0 
      ? req.files.map(file => `/uploads/issues/${file.filename}`) 
      : [];

    // 3. 寫入資料庫 (寫入你在 schema.prisma 中擴充的 OrderIssue 表)
    const issue = await prisma.orderIssue.create({
      data: {
        orderId: orderId,
        orderItemId: parseInt(orderItemId),
        issueType: issueType,
        description: description,
        mediaUrls: mediaUrls
      }
    });
    
    // TODO: (可選) 在此處呼叫 lineService.js 通知管理員有新的客訴單產生
    // try { await notifyOrderIssue(issue); } catch(err) { console.warn('通知發送失敗', err); }

    res.status(201).json({ message: '回報已成功送出', issue });
  } catch (error) {
    // 🆕 上傳相關錯誤處理
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ code: error.code, error: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: error.code, error: '檔案大小超過 20 MB 限制' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ code: error.code, error: '一次最多上傳 5 個檔案' });
    }
    console.error('售後回報送出失敗:', error);
    res.status(500).json({ error: '回報送出失敗，請稍後再試' });
  }
});

// ============================================================
// 🆕 PATCH /api/consumer/orders/:id/issues/:issueId — 客戶修改自己的售後回報
// - 可修改 issueType、description
// - 可透過 removeMediaUrls 標記要移除的既有附件（會同步刪除實體檔案）
// - 可上傳新附件（media 欄位，最多 5 個）
// ============================================================
router.patch('/:id/issues/:issueId', upload.array('media', 5), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const issueId = parseInt(req.params.issueId);
    const { issueType, description } = req.body;

    // 權限：訂單必須屬於當前使用者
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在或無存取權限' });

    // 權限：回報必須屬於該訂單
    const existing = await prisma.orderIssue.findFirst({
      where: { id: issueId, orderId },
    });
    if (!existing) return res.status(404).json({ error: '售後回報不存在' });

    // 驗證 issueType（若有帶）
    if (issueType && !['DEFECT', 'MISMATCH'].includes(issueType)) {
      return res.status(400).json({ error: '無效的問題類型' });
    }
    // 驗證 description（若有帶）
    if (description !== undefined && !String(description).trim()) {
      return res.status(400).json({ error: '問題描述不可為空' });
    }

    // 解析 removeMediaUrls（可能是 JSON 字串、陣列，或單一字串）
    let removeList = [];
    const rawRemove = req.body.removeMediaUrls;
    if (Array.isArray(rawRemove)) {
      removeList = rawRemove;
    } else if (typeof rawRemove === 'string' && rawRemove.trim()) {
      try {
        const parsed = JSON.parse(rawRemove);
        removeList = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        removeList = [rawRemove];
      }
    }

    // 安全刪除要被移除的實體檔案
    for (const url of removeList) {
      safeDeleteIssueFile(url);
    }

    // 保留未被移除的既有附件
    const keptMedia = (existing.mediaUrls || []).filter(u => !removeList.includes(u));

    // 新上傳的附件
    const newMedia = req.files && req.files.length > 0
      ? req.files.map(file => `/uploads/issues/${file.filename}`)
      : [];

    const updated = await prisma.orderIssue.update({
      where: { id: issueId },
      data: {
        issueType: issueType || existing.issueType,
        description: description !== undefined ? String(description).trim() : existing.description,
        mediaUrls: [...keptMedia, ...newMedia],
      },
    });

    res.json({ message: '回報已更新', issue: updated });
  } catch (error) {
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ code: error.code, error: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: error.code, error: '檔案大小超過 20 MB 限制' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ code: error.code, error: '一次最多上傳 5 個檔案' });
    }
    console.error('售後回報更新失敗:', error);
    res.status(500).json({ error: '更新失敗，請稍後再試' });
  }
});

// ============================================================
// 🆕 DELETE /api/consumer/orders/:id/issues/:issueId — 客戶刪除自己的售後回報
// ============================================================
router.delete('/:id/issues/:issueId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const issueId = parseInt(req.params.issueId);

    // 權限：訂單必須屬於當前使用者
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在或無存取權限' });

    // 權限：回報必須屬於該訂單
    const existing = await prisma.orderIssue.findFirst({
      where: { id: issueId, orderId },
    });
    if (!existing) return res.status(404).json({ error: '售後回報不存在' });

    // 刪除所有附件實體檔案
    for (const url of existing.mediaUrls || []) {
      safeDeleteIssueFile(url);
    }

    await prisma.orderIssue.delete({ where: { id: issueId } });

    res.json({ message: '回報已刪除' });
  } catch (error) {
    console.error('售後回報刪除失敗:', error);
    res.status(500).json({ error: '刪除失敗，請稍後再試' });
  }
});

// PATCH /api/consumer/orders/:id — 更新訂單狀態
// 一般使用者不可自行標記付款／出貨狀態（金流一律走 adminBank 對帳確認）。
// 唯一允許的狀態操作是取消，且必須經 orderCancellation 服務（交易 + 冪等）。
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (status !== 'CANCELLED') {
      return res.status(403).json({ error: '付款與出貨狀態由平台確認，僅可取消訂單' });
    }

    const { cancelConsumerOrder } = require('../services/orderCancellation');
    const cancelArgs = { id: req.params.id };
    // 🆕 管理員可取消任意訂單，顧客僅限本人訂單
    if (!req.isAdmin) cancelArgs.userId = req.userId;
    await prisma.$transaction((tx) => cancelConsumerOrder(tx, cancelArgs));

    res.json({ message: '訂單已取消' });
  } catch (error) {
    if (error.code === 'ORDER_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'ORDER_NOT_CANCELLABLE') return res.status(400).json({ error: error.message });
    if (error.code === 'ORDER_ALREADY_CANCELLED') return res.status(409).json({ error: error.message });
    console.error('更新訂單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/consumer/orders/:id/cancel — 取消訂單
// 統一走 orderCancellation 服務：條件式狀態轉換（冪等）、只回補實際扣庫存品項、寫 cancel log。
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { cancelConsumerOrder } = require('../services/orderCancellation');
    const cancelArgs = { id: req.params.id };
    // 🆕 管理員可取消任意訂單，顧客僅限本人訂單
    if (!req.isAdmin) cancelArgs.userId = req.userId;
    await prisma.$transaction((tx) => cancelConsumerOrder(tx, cancelArgs));

    // LINE 通知（失敗不影響取消結果）
    try {
      const order = await prisma.consumerOrder.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { user: { select: { lineId: true } } },
      });
      if (order) await notifyOrderUpdate(order);
    } catch (err) {
      console.error('LINE 通知發送失敗:', err.message);
    }

    res.json({ message: '訂單已取消' });
  } catch (error) {
    if (error.code === 'ORDER_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'ORDER_NOT_CANCELLABLE') return res.status(400).json({ error: error.message });
    if (error.code === 'ORDER_ALREADY_CANCELLED') return res.status(409).json({ error: error.message });
    console.error('取消訂單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ============================================================
// 🆕 退貨功能（2026-10-03）
// 規則：
//  - 僅 SHIPPED / COMPLETED 訂單可申請
//  - 收貨後 7 天內（起算：出貨日 shipped_at，無則用 updated_at）
//  - 代購商品（is_preorder）：僅 DEFECT（瑕疵）/ MISMATCH（規格錯誤）可退
//  - 支援整單退貨（orderItemId=null）或單品部分退貨
//  - 退款至客戶填寫之銀行帳戶（銀行代碼/帳號/戶名）
// ============================================================
const RETURN_REASONS = ['DEFECT', 'MISMATCH', 'CHANGE_MIND', 'OTHER'];
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

// 退貨期限起算日：出貨日優先，無出貨日則用最後更新日
function returnDeadline(order) {
  const anchor = order.shipped_at || order.updated_at;
  return new Date(new Date(anchor).getTime() + RETURN_WINDOW_MS);
}

// POST /api/consumer/orders/:id/returns — 提出退貨申請
// body: { returnReason, description, refundBankCode, refundAccount, refundAccountName,
//         items?: [{ orderItemId, qty }] } — 勾選商品與數量；空白 = 整單退貨
router.post('/:id/returns', upload.array('media', 5), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    let { orderItemId, returnReason, description, refundBankCode, refundAccount, refundAccountName } = req.body;
    let items = req.body.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = null; }
    }

    // 1. 訂單權限驗證
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
      include: { items: true },
    });
    if (!order) {
      return res.status(404).json({ error: '訂單不存在或無存取權限' });
    }

    // 2. 狀態檢查
    if (!['SHIPPED', 'COMPLETED'].includes(order.status)) {
      return res.status(400).json({ error: '目前訂單狀態不可申請退貨（僅已出貨／已完成訂單）' });
    }

    // 3. 7 天退貨時限
    const deadline = returnDeadline(order);
    if (new Date() > deadline) {
      return res.status(400).json({ error: `已超過退貨期限（收貨後 7 天內，期限至 ${deadline.toLocaleDateString('zh-TW')}）` });
    }

    // 4. 原因與說明驗證
    if (!RETURN_REASONS.includes(returnReason)) {
      return res.status(400).json({ error: '請選擇退貨原因' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: '請填寫退貨原因說明' });
    }

    // 5. 退貨範圍：勾選商品 × 數量，並自動計算退款金額
    let targetItems;
    let refundAmount;
    let returnItemRows; // 存入 order_return_items 的明細
    if (Array.isArray(items) && items.length > 0) {
      // 部分退貨：依勾選商品與數量計算
      const seen = new Set();
      targetItems = [];
      returnItemRows = [];
      for (const it of items) {
        const itemId = parseInt(it.orderItemId);
        const qty = parseInt(it.qty);
        if (!itemId || !qty || qty < 1) {
          return res.status(400).json({ error: '退貨商品與數量不合法' });
        }
        if (seen.has(itemId)) {
          return res.status(400).json({ error: '同一商品不可重複選取' });
        }
        seen.add(itemId);
        const orderItem = order.items.find(i => i.id === itemId);
        if (!orderItem) {
          return res.status(400).json({ error: '退貨商品不在此訂單中' });
        }
        if (qty > orderItem.qty) {
          return res.status(400).json({ error: `「${orderItem.name_snapshot}」退貨數量超出購買數量（最多 ${orderItem.qty}）` });
        }
        targetItems.push(orderItem);
        returnItemRows.push({ orderItemId: itemId, qty, price: orderItem.price_snapshot });
      }
      // 自動計算退款金額 = Σ（單價 × 退貨數量）
      refundAmount = returnItemRows.reduce(
        (sum, it) => sum + Number(order.items.find(i => i.id === it.orderItemId).price_snapshot) * it.qty,
        0,
      );
    } else if (orderItemId) {
      // 相容舊格式：單一商品
      const item = order.items.find(i => i.id === parseInt(orderItemId));
      if (!item) {
        return res.status(404).json({ error: '訂單商品不存在' });
      }
      targetItems = [item];
      refundAmount = Number(item.price_snapshot) * item.qty;
      returnItemRows = [{ orderItemId: item.id, qty: item.qty, price: item.price_snapshot }];
    } else {
      // 整單退貨
      targetItems = order.items;
      refundAmount = Number(order.total_amount);
      returnItemRows = order.items.map(i => ({ orderItemId: i.id, qty: i.qty, price: i.price_snapshot }));
    }

    if (targetItems.length === 0) {
      return res.status(400).json({ error: '請選擇退貨商品' });
    }

    // 6. 代購商品限制：特殊訂購商品僅瑕疵／規格錯誤可退
    const preorderItems = targetItems.filter(i => i.is_preorder);
    if (preorderItems.length > 0 && !['DEFECT', 'MISMATCH'].includes(returnReason)) {
      return res.status(400).json({
        error: '代購商品為特殊訂購商品，不接受退貨、取消或退款；僅商品規格錯誤或瑕疵可申請退貨。',
      });
    }

    // 7. 退款帳戶資料（退款至客戶指定銀行帳戶）
    if (!refundBankCode?.trim() || !refundAccount?.trim() || !refundAccountName?.trim()) {
      return res.status(400).json({ error: '請填寫退款帳戶資料（銀行代碼、帳號、戶名）' });
    }

    // 8. 防止重複送件：同一訂單已有待審核退貨
    const existing = await prisma.orderReturn.findFirst({
      where: { orderId, status: 'PENDING' },
    });
    if (existing) {
      return res.status(409).json({ error: '此訂單已有待審核的退貨申請，請等待處理結果' });
    }

    // 9. 附件處理（沿用 issues 上傳設定）
    const mediaUrls = req.files && req.files.length > 0
      ? req.files.map(file => `/uploads/issues/${file.filename}`)
      : [];

    // 10. 建立退貨申請（含商品明細）
    const returnRecord = await prisma.orderReturn.create({
      data: {
        orderId,
        orderItemId: returnItemRows.length === 1 ? returnItemRows[0].orderItemId : null,
        returnReason,
        description: String(description).trim(),
        mediaUrls,
        refundAmount,
        refundBankCode: String(refundBankCode).trim(),
        refundAccount: String(refundAccount).trim(),
        refundAccountName: String(refundAccountName).trim(),
        items: {
          create: returnItemRows.map(it => ({ orderItemId: it.orderItemId, qty: it.qty, price: it.price })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ message: '退貨申請已送出，等待客服審核', return: returnRecord });
  } catch (error) {
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ code: error.code, error: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: error.code, error: '檔案大小超過 20 MB 限制' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ code: error.code, error: '一次最多上傳 5 個檔案' });
    }
    console.error('退貨申請送出失敗:', error);
    res.status(500).json({ error: '退貨申請送出失敗，請稍後再試' });
  }
});

// PATCH /api/consumer/orders/:id/returns/:returnId — 修改待審核的退貨申請
router.patch('/:id/returns/:returnId', upload.array('media', 5), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const returnId = parseInt(req.params.returnId);
    const { description, refundBankCode, refundAccount, refundAccountName } = req.body;

    // 權限：訂單必須屬於當前使用者
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在或無存取權限' });

    // 權限：退貨申請必須屬於該訂單，且僅 PENDING 可修改
    const existing = await prisma.orderReturn.findFirst({
      where: { id: returnId, orderId },
    });
    if (!existing) return res.status(404).json({ error: '退貨申請不存在' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: `退貨申請已${existing.status === 'REJECTED' ? '駁回' : '處理'}，無法修改` });
    }

    if (description !== undefined && !String(description).trim()) {
      return res.status(400).json({ error: '退貨說明不可為空' });
    }

    // 解析 removeMediaUrls（JSON 陣列或單一字串）
    let removeList = [];
    const rawRemove = req.body.removeMediaUrls;
    if (Array.isArray(rawRemove)) {
      removeList = rawRemove;
    } else if (typeof rawRemove === 'string' && rawRemove.trim()) {
      try {
        const parsed = JSON.parse(rawRemove);
        removeList = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        removeList = [rawRemove];
      }
    }

    // 安全刪除要被移除的實體檔案
    for (const url of removeList) {
      safeDeleteIssueFile(url);
    }

    // 保留未被移除的既有附件 + 新上傳附件
    const keptMedia = (existing.mediaUrls || []).filter(u => !removeList.includes(u));
    const newMedia = req.files && req.files.length > 0
      ? req.files.map(file => `/uploads/issues/${file.filename}`)
      : [];

    const updated = await prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        description: description !== undefined ? String(description).trim() : existing.description,
        mediaUrls: [...keptMedia, ...newMedia],
        refundBankCode: refundBankCode?.trim() || existing.refundBankCode,
        refundAccount: refundAccount?.trim() || existing.refundAccount,
        refundAccountName: refundAccountName?.trim() || existing.refundAccountName,
      },
    });

    res.json({ message: '退貨申請已更新', return: updated });
  } catch (error) {
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ code: error.code, error: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: error.code, error: '檔案大小超過 20 MB 限制' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ code: error.code, error: '一次最多上傳 5 個檔案' });
    }
    console.error('退貨申請更新失敗:', error);
    res.status(500).json({ error: '更新失敗，請稍後再試' });
  }
});

// DELETE /api/consumer/orders/:id/returns/:returnId — 撤回待審核的退貨申請
router.delete('/:id/returns/:returnId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const returnId = parseInt(req.params.returnId);

    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在或無存取權限' });

    const existing = await prisma.orderReturn.findFirst({
      where: { id: returnId, orderId },
    });
    if (!existing) return res.status(404).json({ error: '退貨申請不存在' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: '僅待審核的退貨申請可撤回' });
    }

    // 刪除附件實體檔案
    for (const url of existing.mediaUrls || []) {
      safeDeleteIssueFile(url);
    }

    await prisma.orderReturn.delete({ where: { id: returnId } });

    res.json({ message: '退貨申請已撤回' });
  } catch (error) {
    console.error('撤回退貨申請失敗:', error);
    res.status(500).json({ error: '撤回失敗，請稍後再試' });
  }
});

// ============================================================
// 🆕 POST /api/consumer/orders/:id/issues/:issueId/notes — 買家追蹤回覆
// 買家針對售後回報追加回覆（延續對話），寫入 adminNotes 並標記為客戶
// ============================================================
router.post('/:id/issues/:issueId/notes', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const issueId = parseInt(req.params.issueId);
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: '請填寫回覆內容' });
    }

    // 權限：訂單必須屬於當前使用者
    const order = await prisma.consumerOrder.findFirst({
      where: { id: orderId, userId: req.userId },
    });
    if (!order) return res.status(404).json({ error: '訂單不存在或無存取權限' });

    const issue = await prisma.orderIssue.findFirst({
      where: { id: issueId, orderId },
    });
    if (!issue) return res.status(404).json({ error: '售後回報不存在' });

    const existing = Array.isArray(issue.adminNotes) ? issue.adminNotes : [];
    const newNote = {
      at: new Date().toISOString(),
      by: req.userId,
      byName: '客戶（買家）',
      text: String(text).trim(),
    };

    const updated = await prisma.orderIssue.update({
      where: { id: issueId },
      data: { adminNotes: [...existing, newNote] },
    });

    res.json({ message: '回覆已送出', issue: updated });
  } catch (error) {
    console.error('買家回覆失敗:', error);
    res.status(500).json({ error: '回覆失敗，請稍後再試' });
  }
});

module.exports = router;