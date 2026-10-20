/**
 * Background Job Queue (BullMQ)
 * 處理非同步任務：維護提醒、預約提醒、降價通知、庫存同步
 */
const { Queue, Worker } = require('bullmq');
const { cacheService } = require('./cacheService');
const { createConnection } = require('../utils/redisConnection');

// 建立佇列
const queues = {};

// 任務類型定義
const JOB_TYPES = {
  MAINTENANCE_REMINDER: 'maintenance_reminder',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  PRICE_DROP_NOTIFICATION: 'price_drop_notification',
  INVENTORY_SYNC: 'inventory_sync',
  GARAGE_REPORT_GENERATION: 'garage_report_generation',
  EMAIL_NOTIFICATION: 'email_notification',
  LINE_NOTIFICATION: 'line_notification',
};

// 不可盲目重試的任務：失敗時只嘗試一次，避免重複扣庫存／重複入帳
const NON_RETRYABLE_JOB_TYPES = new Set([JOB_TYPES.INVENTORY_SYNC]);

/**
 * 初始化所有佇列
 */
async function initQueues() {
  const connection = createConnection();

  const queueConfig = {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  };

  // 建立各類佇列
  Object.values(JOB_TYPES).forEach(type => {
    queues[type] = new Queue(type, queueConfig);
  });

  console.log('✅ BullMQ queues initialized');
  return { queues };
}

/**
 * 新增任務到佇列
 * @param {string} type - 任務類型
 * @param {Object} data - 任務資料
 * @param {Object} options - 選項 (delay, priority, jobId 等)
 */
async function addJob(type, data, options = {}) {
  if (!queues[type]) {
    throw new Error(`Queue ${type} not initialized`);
  }

  const job = await queues[type].add(type, data, {
    delay: options.delay || 0,
    priority: options.priority || 0,
    jobId: options.jobId,
    // 不可重試任務（扣庫存類）預設只執行一次，除非呼叫端明確指定
    attempts: options.attempts ?? (NON_RETRYABLE_JOB_TYPES.has(type) ? 1 : undefined),
    ...options,
  });

  return job;
}

/**
 * 註冊 Worker 處理器
 * @param {string} type - 任務類型
 * @param {Function} processor - 處理函數
 * @param {Object} options - Worker 選項
 */
function registerWorker(type, processor, options = {}) {
  if (!queues[type]) {
    throw new Error(`Queue ${type} not initialized`);
  }

  const connection = createConnection();

  const worker = new Worker(type, processor, {
    connection,
    concurrency: options.concurrency || 5,
    limiter: options.limiter,
    ...options,
  });

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} (${type}) completed`);
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade || 0;
    const maxAttempts = job?.opts?.attempts || 1;
    if (attemptsMade >= maxAttempts) {
      // 最終失敗（重試次數用盡或不可重試）→ 以醒目標記供告警系統過濾
      console.error(`🚨 [JOB_FINAL_FAILURE] job=${job?.id} type=${type} attempts=${attemptsMade}/${maxAttempts} error=${err.message}`);
    } else {
      console.warn(`⚠️ Job ${job?.id} (${type}) failed (attempt ${attemptsMade}/${maxAttempts}), will retry: ${err.message}`);
    }
  });

  return worker;
}

/**
 * 取消/移除任務
 */
async function removeJob(type, jobId) {
  if (!queues[type]) return false;
  
  const job = await queues[type].getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

/**
 * 取得佇列統計
 */
async function getQueueStats(type) {
  if (!queues[type]) return null;
  
  const queue = queues[type];
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  return { waiting, active, completed, failed, delayed };
}

/**
 * 暫停/恢復佇列
 */
async function pauseQueue(type, pause = true) {
  if (!queues[type]) return;
  if (pause) await queues[type].pause();
  else await queues[type].resume();
}

/**
 * 清理佇列
 */
async function cleanQueue(type, grace = 86400000) { // 預設 1 天
  if (!queues[type]) return;
  await queues[type].clean(grace, 100, 'completed');
  await queues[type].clean(grace, 100, 'failed');
}

/**
 * 關閉所有佇列
 */
async function shutdownQueues() {
  for (const queue of Object.values(queues)) {
    await queue.close();
  }
  console.log('✅ All queues closed');
}

module.exports = {
  initQueues,
  addJob,
  registerWorker,
  removeJob,
  getQueueStats,
  pauseQueue,
  cleanQueue,
  shutdownQueues,
  JOB_TYPES,
  queues,
};