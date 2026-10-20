// src/utils/userFriendlyErrors.js
// 技術錯誤碼 → 使用者可理解的訊息 + 下一步建議

/**
 * 錯誤代碼對應表
 * 後端回傳的 code 對應使用者友善訊息
 */
export const ERROR_MESSAGES = {
  // 認證相關
  UNAUTHORIZED: {
    message: '登入已過期，請重新登入',
    action: '前往登入',
    actionType: 'redirect',
    actionTarget: '/login',
  },
  FORBIDDEN: {
    message: '權限不足，無法執行此操作',
    action: '聯繫管理員',
    actionType: 'external',
    actionTarget: 'mailto:admin@carparts.com',
  },
  TOKEN_EXPIRED: {
    message: '登入逾時，請重新登入',
    action: '重新登入',
    actionType: 'redirect',
    actionTarget: '/login',
  },

  // 資源相關
  NOT_FOUND: {
    message: '找不到指定資料',
    action: '返回列表',
    actionType: 'back',
  },
  CONFLICT: {
    message: '資料衝突，可能已被他人修改',
    action: '重新整理',
    actionType: 'refresh',
  },
  VALIDATION_ERROR: {
    message: '輸入資料格式不正確',
    action: '檢查輸入',
    actionType: 'focus',
  },

  // 庫存相關
  INSUFFICIENT_STOCK: {
    message: '庫存不足，無法完成出貨',
    action: '查看庫存',
    actionType: 'redirect',
    actionTarget: '/admin/inventory',
  },
  PART_NOT_COMPATIBLE: {
    message: '此零件不相容於您的車型',
    action: '查看相容車型',
    actionType: 'redirect',
    actionTarget: '/parts/:id/compatibility',
  },
  VEHICLE_MISMATCH: {
    message: '選擇的車型與零件不符',
    action: '重新選擇車型',
    actionType: 'redirect',
    actionTarget: '/vehicle-selector',
  },

  // 訂單相關
  ORDER_ALREADY_PROCESSED: {
    message: '此訂單已處理，無法重複操作',
    action: '查看訂單詳情',
    actionType: 'redirect',
    actionTarget: '/orders/:id',
  },
  ORDER_CANCELLED: {
    message: '訂單已取消',
    action: '查看其他訂單',
    actionType: 'redirect',
    actionTarget: '/orders',
  },
  IDEMPOTENCY_CONFLICT: {
    message: '重複提交，請勿重複點擊',
    action: '查看結果',
    actionType: 'refresh',
  },

  // 預約相關
  SLOT_UNAVAILABLE: {
    message: '此時段已被預約',
    action: '選擇其他時段',
    actionType: 'redirect',
    actionTarget: '/appointments',
  },
  APPOINTMENT_CONFLICT: {
    message: '您已有同時間的預約',
    action: '查看我的預約',
    actionType: 'redirect',
    actionTarget: '/my-appointments',
  },

  // 付款相關
  PAYMENT_FAILED: {
    message: '付款失敗，請檢查帳戶餘額或聯繫銀行',
    action: '重試付款',
    actionType: 'retry',
  },
  PAYMENT_TIMEOUT: {
    message: '付款逾時，訂單已保留',
    action: '繼續付款',
    actionType: 'redirect',
    actionTarget: '/payment/:orderId',
  },

  // 車輛相關
  VEHICLE_NOT_VERIFIED: {
    message: '車輛資訊尚未驗證',
    action: '提交驗證',
    actionType: 'redirect',
    actionTarget: '/vehicle-verification',
  },
  VEHICLE_ALREADY_EXISTS: {
    message: '此車輛已在您的車庫中',
    action: '查看車庫',
    actionType: 'redirect',
    actionTarget: '/my-cars',
  },

  // 系統相關
  SERVER_ERROR: {
    message: '系統暫時無法處理，請稍後再試',
    action: '稍後重試',
    actionType: 'retry',
  },
  SERVICE_UNAVAILABLE: {
    message: '服務維護中，預計稍後恢復',
    action: '查看公告',
    actionType: 'external',
    actionTarget: '/announcements',
  },
  NETWORK_ERROR: {
    message: '網路連線異常，請檢查網路後重試',
    action: '重試',
    actionType: 'retry',
  },
};

/**
 * 取得使用者友善錯誤資訊
 * @param {Error|Object} err - 錯誤物件或回應
 * @param {string} fallbackPrefix - 回退前綴
 * @returns {Object} { message, action, actionType, actionTarget }
 */
export function getUserFriendlyError(err, fallbackPrefix = '操作失敗') {
  // 嘗試從回應取得 code
  let code = null;
  let originalMessage = null;

  if (err?.response?.data?.code) {
    code = err.response.data.code;
  } else if (err?.response?.data?.error) {
    originalMessage = err.response.data.error;
  } else if (err?.message) {
    originalMessage = err.message;
  } else if (typeof err === 'string') {
    originalMessage = err;
  }

  // 1. 先嘗試 code 對應
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // 2. 嘗試從訊息關鍵字推斷
  if (originalMessage) {
    const msg = originalMessage.toLowerCase();
    
    if (msg.includes('unauthorized') || msg.includes('token') || msg.includes('登入') || msg.includes('驗證')) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    if (msg.includes('forbidden') || msg.includes('權限') || msg.includes('permission')) {
      return ERROR_MESSAGES.FORBIDDEN;
    }
    if (msg.includes('not found') || msg.includes('找不到') || msg.includes('404')) {
      return ERROR_MESSAGES.NOT_FOUND;
    }
    if (msg.includes('conflict') || msg.includes('衝突') || msg.includes('重複') || msg.includes('已存在')) {
      return ERROR_MESSAGES.CONFLICT;
    }
    if (msg.includes('stock') || msg.includes('庫存') || msg.includes('不足')) {
      return ERROR_MESSAGES.INSUFFICIENT_STOCK;
    }
    if (msg.includes('compatible') || msg.includes('相容') || msg.includes('不符') || msg.includes('車型')) {
      return ERROR_MESSAGES.VEHICLE_MISMATCH;
    }
    if (msg.includes('payment') || msg.includes('付款') || msg.includes('付費')) {
      return ERROR_MESSAGES.PAYMENT_FAILED;
    }
    if (msg.includes('appointment') || msg.includes('預約') || msg.includes('時段')) {
      return ERROR_MESSAGES.SLOT_UNAVAILABLE;
    }
    if (msg.includes('network') || msg.includes('網路') || msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('timeout')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
  }

  // 3. 回退：顯示原始訊息（但不顯示技術細節）
  return {
    message: originalMessage ? `${fallbackPrefix}：${originalMessage}` : `${fallbackPrefix}，請稍後再試`,
    action: '重試',
    actionType: 'retry',
  };
}

/**
 * 錯誤訊息顯示元件 Props 型別
 */
export const ERROR_ACTION_TYPES = {
  redirect: 'redirect',      // 跳轉頁面
  back: 'back',              // 返回上頁
  refresh: 'refresh',        // 重新整理當前頁
  retry: 'retry',            // 重試同一操作
  focus: 'focus',            // 聚焦到表單欄位
  external: 'external',      // 外部連結
};

/**
 * 取得錯誤動作的執行函式
 */
export function createErrorActionHandler(navigate) {
  return ({ actionType, actionTarget, onRetry }) => {
    switch (actionType) {
      case 'redirect':
        if (actionTarget) navigate(actionTarget);
        break;
      case 'back':
        navigate(-1);
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'retry':
        onRetry?.();
        break;
      case 'focus':
        // 由表單元件自行處理
        break;
      case 'external':
        if (actionTarget) window.open(actionTarget, '_blank');
        break;
      default:
        break;
    }
  };
}

/**
 * Toast 顯示錯誤的統一入口
 */
export function showUserFriendlyError(err, fallbackPrefix, toastOptions = {}) {
  const { message, action, actionType, actionTarget } = getUserFriendlyError(err, fallbackPrefix);
  
  // 使用 react-hot-toast 顯示
  // 可以擴展為自定義 toast 包含 action 按鈕
  return toast.error(message, {
    duration: 5000,
    ...toastOptions,
  });
}