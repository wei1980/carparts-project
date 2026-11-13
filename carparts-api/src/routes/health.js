// src/routes/health.js
// 擴充健康檢查端點 - Redis/DB/外部 API 狀態

const express = require('express');
const router = express.Router();
const Redis = require('ioredis');
const axios = require('axios');

const prisma = require('../lib/prisma');
const adminAuth = require('../middleware/adminAuth');

// 快取 Redis 連線
let redisClient = null;
function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // 不自動重試，健康檢查用
      connectTimeout: 3000,
      lazyConnect: true
    });
  }
  return redisClient;
}

// 基礎健康檢查 (輕量)
router.get('/health', async (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    service: 'carparts-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 詳細健康檢查 (含依賴服務)
// 🔒 需要 ADMIN：輸出含 DB/Redis/外部服務的內部狀態與錯誤細節，
//    對外暴露等於給攻擊者一張「哪裡會壞」的地圖。
//    /health 與 /health/live 仍維持公開，供 LB 與外部監控使用。
router.get('/health/detailed', adminAuth, async (req, res) => {
  const startTime = Date.now();
  const checks = {
    database: { status: 'unknown', latencyMs: 0, details: {} },
    redis: { status: 'unknown', latencyMs: 0, details: {} },
    externalApis: { status: 'unknown', latencyMs: 0, details: {} }
  };

  // 1. PostgreSQL 檢查
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      latencyMs: Date.now() - dbStart,
      details: { message: 'PostgreSQL 連線正常' }
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      details: { error: 'unavailable' } // 不對外回傳原始例外字串
    };
  }

  // 2. Redis 檢查
  try {
    const redis = getRedisClient();
    if (redis) {
      const redisStart = Date.now();
      await redis.connect();
      await redis.ping();
      await redis.quit();
      checks.redis = {
        status: 'healthy',
        latencyMs: Date.now() - redisStart,
        details: { message: 'Redis 連線正常' }
      };
    } else {
      checks.redis = {
        status: 'not_configured',
        latencyMs: 0,
        details: { message: 'REDIS_URL 未設定' }
      };
    }
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      latencyMs: 0,
      details: { error: 'unavailable' } // 不對外回傳原始例外字串
    };
  }

  // 3. 外部 API 檢查
  const externalChecks = [];
  
  // AI 服務檢查
  if (process.env.AI_BASE_URL) {
    try {
      const aiStart = Date.now();
      await axios.get(`${process.env.AI_BASE_URL}/models`, { timeout: 3000 });
      externalChecks.push({
        name: 'ai_service',
        status: 'healthy',
        latencyMs: Date.now() - aiStart
      });
    } catch (error) {
      externalChecks.push({
        name: 'ai_service',
        status: 'unhealthy',
        latencyMs: 0,
        error: 'unavailable'
      });
    }
  }

  // LINE API 檢查
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    try {
      const lineStart = Date.now();
      await axios.get('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
        timeout: 3000
      });
      externalChecks.push({
        name: 'line_api',
        status: 'healthy',
        latencyMs: Date.now() - lineStart
      });
    } catch (error) {
      externalChecks.push({
        name: 'line_api',
        status: 'unhealthy',
        latencyMs: 0,
        error: 'unavailable'
      });
    }
  }

  // ngrok tunnel 檢查
  if (process.env.NGROK_URL) {
    try {
      const ngrokStart = Date.now();
      await axios.get(`${process.env.NGROK_URL}/health`, { timeout: 3000 });
      externalChecks.push({
        name: 'ngrok_tunnel',
        status: 'healthy',
        latencyMs: Date.now() - ngrokStart
      });
    } catch (error) {
      externalChecks.push({
        name: 'ngrok_tunnel',
        status: 'unhealthy',
        latencyMs: 0,
        error: 'unavailable'
      });
    }
  }

  checks.externalApis = {
    status: externalChecks.every(c => c.status === 'healthy') ? 'healthy' : 
            externalChecks.some(c => c.status === 'healthy') ? 'degraded' : 'unhealthy',
    latencyMs: Math.max(...externalChecks.map(c => c.latencyMs || 0), 0),
    details: { services: externalChecks }
  };

  // 綜合狀態
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const hasUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');
  const overallStatus = allHealthy ? 'healthy' : (hasUnhealthy ? 'unhealthy' : 'degraded');

  const totalLatency = Date.now() - startTime;

  res.status(overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalLatencyMs: totalLatency,
    checks
  });
});

// 快速就緒檢查
router.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    const redis = getRedisClient();
    if (redis) {
      await redis.connect();
      await redis.ping();
      await redis.quit();
    }
    
    res.json({ ready: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ 
      ready: false, 
      timestamp: new Date().toISOString(),
      error: 'not ready'
    });
  }
});

// 存活檢查
router.get('/health/live', (req, res) => {
  res.json({ alive: true, timestamp: new Date().toISOString() });
});

// Queue / Redis 健康檢查（BullMQ 佇列統計 + 連線狀態）
// 🔒 需要 ADMIN：輸出佇列待處理/失敗數與 Redis 狀態，屬內部維運資訊。
router.get('/health/queues', adminAuth, async (req, res) => {
  try {
    let redisStatus = { status: 'not_configured' };
    try {
      const { createConnection, getStatus } = require('../utils/redisConnection');
      const { getQueueStats, JOB_TYPES } = require('../services/jobQueue');
      const conn = createConnection();
      const pongStart = Date.now();
      const pong = await conn.ping();
      redisStatus = {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - pongStart,
        ...getStatus(),
      };
      const queueStats = {};
      for (const type of Object.values(JOB_TYPES)) {
        const s = await getQueueStats(type);
        if (s) queueStats[type] = s;
      }
      const anyFailed = Object.values(queueStats).some(s => s.failed > 0);
      return res.status(redisStatus.status === 'healthy' ? 200 : 503).json({
        status: redisStatus.status === 'healthy' ? (anyFailed ? 'degraded' : 'healthy') : 'unhealthy',
        timestamp: new Date().toISOString(),
        redis: redisStatus,
        queues: queueStats,
      });
    } catch (queueErr) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        redis: redisStatus,
        error: 'unavailable',
      });
    }
  } catch (error) {
    console.error('[HEALTH] queues check failed:', { message: error.message });
    res.status(500).json({ status: 'unknown', error: 'check failed' });
  }
});

// 指標端點
router.get('/metrics', async (req, res) => {
  try {
    const [orderCount, userCount, partCount, workshopCount] = await Promise.all([
      prisma.order.count(),
      prisma.endUser.count(),
      prisma.part.count({ where: { is_active: true } }),
      prisma.workshop.count()
    ]);

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send([
      `# HELP carparts_orders_total 總訂單數`,
      `# TYPE carparts_orders_total counter`,
      `carparts_orders_total ${orderCount}`,
      ``,
      `# HELP carparts_users_total 總用戶數`,
      `# TYPE carparts_users_total counter`,
      `carparts_users_total ${userCount}`,
      ``,
      `# HELP carparts_parts_active 正在銷售的零件數`,
      `# TYPE carparts_parts_active gauge`,
      `carparts_parts_active ${partCount}`,
      ``,
      `# HELP carparts_workshops_total 總車廠數`,
      `# TYPE carparts_workshops_total counter`,
      `carparts_workshops_total ${workshopCount}`,
      ``
    ].join('\n'));
  } catch (error) {
    res.status(500).send('# 錯誤：無法取得指標');
  }
});

module.exports = router;