/**
 * Job Scheduler — 定時任務
 *
 * ⚠️ 兩種執行模式：
 *   1. BullMQ 佇列（Redis 可用時）：任務進佇列，由 Worker 背景處理
 *   2. 直跑模式（Redis 不可用 / 未設定）：cron 直接呼叫 worker 函式
 *
 * 原本只有模式 1，而且 server.js 因 Redis 未啟動而把 initializeJobSystem()
 * 整個註解掉 → 6 個排程（保養提醒 / 預約提醒 / 降價通知 / 庫存同步 /
 * 月報表）從未執行過。現在改成 cron 一律掛上，佇列可用時走佇列、
 * 不可用時直接跑，功能不會因為沒有 Redis 而消失。
 */
const { WORKER_PROCESSORS } = require('./jobWorkers');
const cron = require('node-cron');
// 共用 Prisma 單例：cron 內不可 $disconnect（會抽掉全應用的連線池）
const prisma = require('../lib/prisma');

let queuesInitialized = false;
let schedulerStarted = false;
let queueMode = false;   // true = BullMQ 可用，走佇列

/** Redis / BullMQ 是否可實際使用（連不上就回 false，不阻斷啟動） */
async function canUseQueues() {
  try {
    const { initQueues, getQueueStats } = require('./jobQueue');
    const { queues } = await initQueues();
    const anyQ = Object.values(queues)[0];
    if (!anyQ) return false;
    await anyQ.getJobCounts('waiting', 'active', 'completed', 'failed');
    return true;
  } catch (e) {
    console.warn(`⚠️ Redis 不可用，排程改用直跑模式（不經佇列）: ${String(e.message).split('\n')[0]}`);
    return false;
  }
}

/**
 * 執行單一任務：有佇列就進佇列，沒有就直接呼叫 worker。
 * 直跑時給 worker 一個最小 job 外殼（worker 只讀 job.data）。
 */
async function dispatch(type, data) {
  if (queueMode) {
    const { addJob } = require('./jobQueue');
    return addJob(type, data);
  }
  const processor = WORKER_PROCESSORS[type];
  if (!processor) {
    console.warn(`⚠️ 沒有對應的 worker: ${type}`);
    return { skipped: true, reason: 'NO_WORKER' };
  }
  return processor({ data });
}

/**
 * 初始化所有佇列和 Worker
 */
async function initializeJobSystem() {
  if (queuesInitialized) {
    console.log('⚠️ Job system already initialized');
    return;
  }

  // 先探測佇列可用性；不可用不阻斷（直跑模式照樣運作）
  queueMode = await canUseQueues();

  if (queueMode) {
    try {
      const { registerWorker } = require('./jobQueue');
      Object.keys(WORKER_PROCESSORS).forEach((type) => {
        registerWorker(type, WORKER_PROCESSORS[type], {
          concurrency: type === 'line_notification' ? 10 : 5,
        });
        console.log(`✅ Worker registered: ${type}`);
      });
      console.log('✅ Job system initialized with BullMQ');
    } catch (err) {
      console.warn(`⚠️ Worker 註冊失敗，改用直跑模式: ${String(err.message).split('\n')[0]}`);
      queueMode = false;
    }
  } else {
    console.log('ℹ️ 排程直跑模式（不經 Redis/BullMQ）');
  }

  // cron 兩種模式都要掛
  setupCronJobs();

  queuesInitialized = true;
}

/**
 * 設定定時任務
 */
function setupCronJobs() {
  if (schedulerStarted) return;

  // 每天早上 8:00 發送維護提醒
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily maintenance reminder job...');
    try {
      // 找出所有啟用的提醒
      const reminders = await prisma.maintenanceReminder.findMany({
        where: { enabled: true },
        select: { id: true },
      });

      for (const reminder of reminders) {
        await dispatch('maintenance_reminder', { reminderId: reminder.id });
      }

      console.log(`✅ Scheduled ${reminders.length} maintenance reminders`);
    } catch (err) {
      console.error('❌ 保養提醒排程失敗:', String(err.message).split('\n')[0]);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每小時檢查 1 小時後的預約
  cron.schedule('0 * * * *', async () => {
    try {

      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
      const oneHourWindow = new Date(oneHourLater.getTime() + 5 * 60 * 1000);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduled_at: {
            gte: oneHourLater,
            lte: oneHourWindow,
          },
        },
        select: { id: true },
      });

      for (const appt of appointments) {
        await dispatch('appointment_reminder', { appointmentId: appt.id, type: '1hour' });
      }

      console.log(`✅ Scheduled ${appointments.length} 1-hour appointment reminders`);
    } catch (err) {
      console.error('Hourly appointment reminder cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每天早上 9:00 發送 1 天後的預約提醒
  cron.schedule('0 9 * * *', async () => {
    try {

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduled_at: {
            gte: tomorrow,
            lte: tomorrowEnd,
          },
        },
        select: { id: true },
      });

      for (const appt of appointments) {
        await dispatch('appointment_reminder', { appointmentId: appt.id, type: '1day' });
      }

      console.log(`✅ Scheduled ${appointments.length} 1-day appointment reminders`);
    } catch (err) {
      console.error('Daily appointment reminder cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每天早上 10:00 檢查降價通知
  cron.schedule('0 10 * * *', async () => {
    try {
      await dispatch('price_drop_notification', {});
      console.log('✅ Scheduled price drop notification check');
    } catch (err) {
      console.error('Price drop notification cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每週一早上 6:00 執行庫存同步
  cron.schedule('0 6 * * 1', async () => {
    try {
      await dispatch('inventory_sync', {});
      console.log('✅ Scheduled weekly inventory sync');
    } catch (err) {
      console.error('Weekly inventory sync cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每月 1 號早上 6:00 生成車廠月報表
  cron.schedule('0 6 1 * *', async () => {
    try {

      const garages = await prisma.workshop.findMany({
        where: { is_garage: true, is_active: true },
        select: { id: true },
      });

      // ⚠️ 這個 cron 在每月 1 號 06:00 跑，要報的是「上個月」的報表。
      //    原本用 new Date() 取當月 → 1 號跑時當月只有 1 天資料，報表幾乎全 0。
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      for (const garage of garages) {
        await dispatch('garage_report_generation', { garageId: garage.id, month });
      }

      console.log(`✅ Scheduled ${garages.length} garage monthly reports`);
    } catch (err) {
      console.error('Monthly garage report cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每 5 分鐘清理記憶體快取
  setInterval(() => {
    if (global.cacheService) {
      global.cacheService._cleanupMemory();
    }
  }, 5 * 60 * 1000);

  console.log('✅ Cron jobs scheduled');
  return true;
}

/**
 * 手動觸發任務 (用於測試)
 */
async function triggerJob(type, data) {
  const { addJob } = require('./jobQueue');
  return await dispatch(type, data);
}

/**
 * 獲取所有佇列狀態
 */
async function getAllQueueStats() {
  if (!queueMode) return { mode: 'direct' };
  try {
    const { getQueueStats } = require('./jobQueue');
    const stats = {};
    for (const type of Object.keys(WORKER_PROCESSORS)) {
      stats[type] = await getQueueStats(type);
    }
    return { mode: 'bullmq', ...stats };
  } catch (e) {
    return { mode: 'unavailable', error: String(e.message).split('\n')[0] };
  }
}

module.exports = {
  initializeJobSystem,
  setupCronJobs,
  triggerJob,
  getAllQueueStats,
};