// 統一術語常量檔
// 集中管理關鍵業務術語，避免硬式字串分散

export const TERMS = {
  // 價格相關
  SKU: '料號',
  SKU_LABEL: '料號',
  WHOLESALE_PRICE: '批發價',
  WHOLESALE_PRICE_LABEL: '批發價',
  MSRP_PRICE: '建議售價',
  MSRP_PRICE_LABEL: '建議售價',
  RETAIL_PRICE: '零售價',
  RETAIL_PRICE_LABEL: '零售價',
  
  // 庫存狀態
  IN_STOCK: '現貨',
  IN_STOCK_LABEL: '現貨供應',
  PREORDER: '代購',
  PREORDER_LABEL: '代購商品',
  OFFICIAL: '公司貨',
  OFFICIAL_LABEL: '公司貨',
  OUT_OF_STOCK: '缺貨',
  OUT_OF_STOCK_LABEL: '暫無庫存',
  
  // 通用型零件
  UNIVERSAL: '通用',
  UNIVERSAL_LABEL: '通用 全車系',
  UNIVERSAL_DESCRIPTION: '此零件適用於所有車型',
  
  // 改裝匹配
  MODIFICATION_MATCH: '改裝專用',
  MODIFICATION_MATCH_LABEL: '改裝匹配',
  MODIFICATION_MATCH_DESCRIPTION: '此零件專為您的改裝配置設計',
  
  // 訂單狀態
  ORDER_STATUS: {
    PENDING_PAYMENT: '待付款',
    PAID: '已付款',
    PROCESSING: '處理中',
    SHIPPED: '已出貨',
    DELIVERED: '已送達',
    CANCELLED: '已取消',
    REFUNDED: '已退款',
    COMPLETED: '已完成'
  },
  
  // 服務記錄狀態
  SERVICE_STATUS: {
    PENDING: '待確認',
    CONFIRMED: '已確認',
    ARRIVED: '已到店',
    IN_PROGRESS: '施工中',
    COMPLETED: '已完工',
    CANCELLED: '已取消'
  },
  
  // 車輛資訊
  VEHICLE_FIELDS: {
    MAKE: '品牌',
    BRAND: '品牌',
    MODEL: '車系',
    GENERATION: '世代',
    YEAR: '年份',
    ENGINE: '引擎',
    DRIVE_TYPE: '驅動方式',
    TRANSMISSION: '變速箱',
    LICENSE_PLATE: '車牌號碼',
    VIN: '車架號碼'
  },
  
  // 分類
  CATEGORY: '分類',
  SUBCATEGORY: '子分類',
  BRAND: '品牌',
  
  // 操作按鈕
  ACTIONS: {
    ADD_TO_CART: '加入購物車',
    ADDED_TO_CART: '已加入購物車',
    BUY_NOW: '立即購買',
    VIEW_DETAIL: '查看詳情',
    BACK_TO_SHOP: '返回商品列表',
    HOT_PARTS: '熱門零件',
    SEARCH_RESULTS: '搜尋結果',
    MATCHING_PARTS: '找到商品',
    EDIT: '編輯',
    DELETE: '刪除',
    SAVE: '儲存',
    CANCEL: '取消',
    CONFIRM: '確認',
    SUBMIT: '送出',
    RESET: '重置',
    SEARCH: '搜尋',
    FILTER: '篩選',
    EXPORT: '匯出',
    IMPORT: '匯入'
  },
  
  // 訊息
  MESSAGES: {
    LOADING: '載入中...',
    NO_DATA: '暫無資料',
    ERROR_OCCURRED: '發生錯誤，請稍後再試',
    NETWORK_ERROR: '網路連線失敗',
    UNAUTHORIZED: '請先登入',
    FORBIDDEN: '權限不足',
    NOT_FOUND: '找不到資料',
    VALIDATION_ERROR: '輸入資料有誤，請檢查後重試',
    NO_PARTS_FOUND: '找不到相符商品',
    AI_SEARCH_SUBMITTED: '上傳商品照片可由 AI 協助辨識零件。',
    PART_NOT_FOUND: '找不到此商品',
    SAVE_SUCCESS: '儲存成功',
    SAVE_FAILED: '儲存失敗',
    DELETE_CONFIRM: '確定要刪除嗎？此操作無法復原。',
    DELETE_SUCCESS: '刪除成功',
    DELETE_FAILED: '刪除失敗'
  },
  
  // 表單驗證訊息
  VALIDATION: {
    REQUIRED: '此欄位為必填',
    MIN_LENGTH: (min) => `至少需要 ${min} 個字元`,
    MAX_LENGTH: (max) => `最多 ${max} 個字元`,
    INVALID_EMAIL: '電子郵件格式不正確',
    INVALID_PHONE: '手機號碼格式不正確 (09xxxxxxxx)',
    INVALID_NUMBER: '請輸入有效數字',
    INVALID_INTEGER: '請輸入整數',
    POSITIVE_NUMBER: '請輸入大於 0 的數字',
    INVALID_YEAR: '年份格式不正確 (四位數，如 2024)',
    INVALID_PRICE: '價格格式不正確',
    INVALID_SKU: '料號格式不正確',
    PASSWORD_MISMATCH: '兩次密碼輸入不一致',
    PASSWORD_TOO_SHORT: '密碼至少需要 8 個字元'
  },
  
  // 單位
  UNITS: {
    PIECE: '件',
    SET: '組',
    PAIR: '雙',
    METER: '公尺',
    KILOGRAM: '公斤',
    LITER: '公升'
  },

  // 佔位符
  PLACEHOLDERS: {
    PART_SEARCH: '搜尋零件名稱、料號或品牌…',
    VEHICLE_SEARCH: '搜尋品牌、車系、年份…',
    VIN: '請輸入車架號碼 (VIN)',
    LICENSE_PLATE: '請輸入車牌號碼',
    QUANTITY: '請輸入數量',
    PRICE: '請輸入價格',
    SKU: '請輸入料號',
    NAME: '請輸入名稱',
    DESCRIPTION: '請輸入描述',
    BRAND: '請輸入品牌',
    CATEGORY: '請選擇分類',
    SUBCATEGORY: '請選擇子分類'
  }
};

// 取得術語的輔助函數
export const getTerm = (key) => {
  const keys = key.split('.');
  let value = TERMS;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // 找不到回傳原 key
    }
  }
  return value;
};

// 格式化價格顯示
export const formatPrice = (price, currency = 'NT$') => {
  if (price === null || price === undefined) return '—';
  const num = Number(price);
  if (isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString()}`;
};

// 格式化庫存顯示
export const formatStock = (qty) => {
  if (qty === null || qty === undefined) return TERMS.OUT_OF_STOCK_LABEL;
  const num = Number(qty);
  if (isNaN(num)) return TERMS.OUT_OF_STOCK_LABEL;
  if (num > 0) return `${TERMS.IN_STOCK} ${num}${TERMS.UNITS.PIECE}`;
  return TERMS.PREORDER_LABEL;
};

export default TERMS;