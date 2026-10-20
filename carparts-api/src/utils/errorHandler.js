const crypto = require('crypto');

/**
 * 統一錯誤回應格式
 * 所有 API 錯誤回應結構：
 * {
 *   code: string,           // 錯誤代碼（如 VALIDATION_ERROR, NOT_FOUND, INSUFFICIENT_STOCK）
 *   message: string,        // 人類可讀的錯誤訊息
 *   requestId: string,      // 可用於日誌追蹤的請求 ID
 *   details?: object        // 選填：驗證錯誤欄位詳情、參數等
 * }
 */

/**
 * 標準化錯誤回應
 * @param {import('express').Response} res
 * @param {number} status - HTTP 狀態碼
 * @param {string} message - 錯誤訊息
 * @param {string} code - 錯誤代碼
 * @param {object} [details] - 額外詳情（如 validation fields）
 */
function apiError(res, status, message, code = 'UNKNOWN_ERROR', details) {
  const requestId = res.locals?.requestId || res.getHeader?.('X-Request-Id') || crypto.randomUUID();
  const payload = { code, message, requestId };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

/**
 * 驗證錯誤專用回應
 * @param {import('express').Response} res
 * @param {string} message
 * @param {object} fieldErrors - { fieldName: 'error message' }
 */
function validationError(res, message = '輸入資料驗證失敗', fieldErrors) {
  return apiError(res, 400, message, 'VALIDATION_ERROR', { fields: fieldErrors });
}

/**
 * 404 Not Found 專用
 */
function notFoundError(res, message = '資源不存在', details) {
  return apiError(res, 404, message, 'NOT_FOUND', details);
}

/**
 * 409 Conflict (如庫存不足、冪等鍵衝突)
 */
function conflictError(res, message, details) {
  return apiError(res, 409, message, 'CONFLICT', details);
}

/**
 * 401 Unauthorized
 */
function unauthorizedError(res, message = '未授權或 Token 失效', details) {
  return apiError(res, 401, message, 'UNAUTHORIZED', details);
}

/**
 * 403 Forbidden
 */
function forbiddenError(res, message = '權限不足', details) {
  return apiError(res, 403, message, 'FORBIDDEN', details);
}

/**
 * 500 Internal Server Error
 */
function internalError(res, message = '伺服器內部錯誤', details) {
  return apiError(res, 500, message, 'INTERNAL_ERROR', details);
}

module.exports = {
  apiError,
  validationError,
  notFoundError,
  conflictError,
  unauthorizedError,
  forbiddenError,
  internalError,
};