import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || `${API_BASE_URL.replace(/\/$/, '')}/admin`;

let csrfTokenCache = null;
let csrfTokenPromise = null;

async function getCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  
  if (!csrfTokenPromise) {
    csrfTokenPromise = axios.get(`${API_BASE_URL.replace(/\/$/, '')}/csrf-token`, { withCredentials: true })
      .then(res => res.data.csrfToken)
      .catch(() => null);
  }
  
  try {
    csrfTokenCache = await csrfTokenPromise;
    return csrfTokenCache;
  } finally {
    csrfTokenPromise = null;
  }
}

function clearCsrfToken() {
  csrfTokenCache = null;
}

// 🔔 憑證失效事件：axios 攔截器（無 React 依賴）通知 AuthContext 與路由守衛。
//    自訂事件而非直接 import AuthContext，避免循環依賴（client ← AuthContext）。
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// 同一時間可能有多個並行請求同時 401，只提示一次
let lastExpiredNoticeAt = 0;
let expiredNoticeTimer = null;

export function notifyAuthExpired(tokenStorageKey) {
  const now = Date.now();
  if (now - lastExpiredNoticeAt > 3000) {
    lastExpiredNoticeAt = now;
    if (expiredNoticeTimer) clearTimeout(expiredNoticeTimer);
    // 延遲一點再提示，避免與路由跳轉競爭
    expiredNoticeTimer = setTimeout(() => {
      toast('登入已失效，請重新登入');
    }, 300);
  }
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { tokenStorageKey } }));
}

// axios 預設 timeout 為 0（永不逾時）。若 API 掛了或網路中斷，
// 請求會永久 pending → 畫面卡在「載入中…」，使用者只能手動重新整理。
// 這裡設 15 秒：超過就拋錯，讓各頁的 catch 顯示錯誤態（已補上「重新載入」）。
const REQUEST_TIMEOUT_MS = 15000;

function createClient(baseURL, tokenStorageKey) {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // 重要：允許攜帶 cookie (CSRF cookie)
    timeout: REQUEST_TIMEOUT_MS,
  });

  client.interceptors.request.use(async (config) => {
    const token = localStorage.getItem(tokenStorageKey);
    
    // 有 Bearer token 時，不需要 CSRF token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // 無 Bearer token 且為 state-changing 操作，需附加 CSRF token
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
        const csrfToken = await getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }
    
    config.headers['X-Request-Id'] ||= crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 🔒 憑證失效：清掉 token 並通知全站（AuthContext / 路由守衛），
        //    否則只有 localStorage 被清，React 的 user state 仍是「已登入」，
        //    PrivateRoute 會放行，使用者停在空白頁面而不被導向登入頁。
        localStorage.removeItem(tokenStorageKey);
        if (tokenStorageKey === 'token') localStorage.removeItem('user');
        notifyAuthExpired(tokenStorageKey);
      }
      // CSRF token 失效時清除快取並重試一次
      if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_INVALID') {
        clearCsrfToken();
        // Only replay an explicit pre-handler CSRF rejection, never generic 403/5xx.
        // Keep the request ID/body and cap the retry to prevent duplicate mutations/loops.
        if (error.config && !error.config._csrfRetried) {
          error.config._csrfRetried = true;
          return client.request(error.config);
        }
      }
      // 逾時：給使用者看得懂的訊息，而不是 "timeout of 15000ms exceeded"
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        error.friendlyMessage = '連線逾時，請確認網路後再試';
      }
      return Promise.reject(error);
    },
  );

  return client;
}

// 消費者端 - 走 Vite proxy，token 較短
export const consumerClient = createClient(API_BASE_URL, 'token');

// 車廠端 - 走 Vite proxy，token 較短
export const garageClient = createClient(API_BASE_URL, 'garageToken');

// 管理端同源部署；憑證只透過 Authorization 傳遞，不進入 URL。
export const adminClient = createClient(ADMIN_API_BASE_URL, 'adminToken');

// 向後相容：舊代碼直接 import { api } from '@/api/client'
export const api = consumerClient;

// 導出 CSRF 工具供前端手動呼叫
export { getCsrfToken, clearCsrfToken };
