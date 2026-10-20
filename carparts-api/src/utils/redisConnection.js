// src/utils/redisConnection.js
// 共用 Redis 連線工廠：統一 reconnect 策略與連線狀態追蹤（供 BullMQ Queue/Worker 與健康檢查使用）
const Redis = require('ioredis');

// 連線狀態（供 /health/queues 觀測）
const connectionStatus = {
  lastConnectedAt: null,
  lastError: null,
  lastErrorAt: null,
  reconnectCount: 0,
};

function getUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

// 指數退避重連：1s, 2s, 4s ... 上限 30s；重連次數計入狀態
function reconnectStrategy(retries) {
  connectionStatus.reconnectCount += 1;
  const delay = Math.min(retries > 0 ? Math.min(1000 * 2 ** (retries - 1), 30000) : 1000, 30000);
  console.warn(`[REDIS] reconnect attempt #${retries + 1} in ${delay}ms`);
  return delay;
}

function createConnection(options = {}) {
  const conn = new Redis(getUrl(), {
    // BullMQ 建議：不限制每請求重試，由 blocking command 自行處理
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy: reconnectStrategy,
    ...options,
  });

  conn.on('connect', () => {
    connectionStatus.lastConnectedAt = new Date().toISOString();
    console.log('✅ [REDIS] connected', getUrl());
  });
  conn.on('error', (err) => {
    // 連線錯誤率限：同訊息 60 秒內只記一次，避免斷線期間洗版
    const now = Date.now();
    if (!connectionStatus.lastErrorAt || now - connectionStatus.lastErrorAt > 60000 || connectionStatus.lastError !== err.message) {
      console.error('❌ [REDIS] connection error:', err.message);
      connectionStatus.lastError = err.message;
      connectionStatus.lastErrorAt = new Date().toISOString();
    }
  });

  return conn;
}

function getStatus() {
  return { urlSet: !!process.env.REDIS_URL, ...connectionStatus };
}

module.exports = { createConnection, getStatus, reconnectStrategy, getUrl };
