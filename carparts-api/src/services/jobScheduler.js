/**
 * Job Queue Initialization
 * 在應用啟動時初始化佇列並註冊 Worker
 */
const { initQueues, registerWorker, addJob } = require('./jobQueue');
const { WORKER_PROCESSORS } = require('./jobWorkers');
const cron = require('node-cron');

let queuesInitialized = false;
let schedulerStarted = false;

/**
 * 初始化所有佇列和 Worker
 */
async function initializeJobSystem() {
  if (queuesInitialized) {
    console.log('⚠️ Job system already initialized');
    return;
  }

  try {
    const { initQueues: initBullMQ } = require('./jobQueue');
    const { queues, scheduler } = await initBullMQ();
    
    // 註冊所有 Worker
    Object.entries(require('./jobWorkers').WORKER_PROCESSORS).forEach(([type, processor]) => {
      const worker = require('./jobQueue').registerWorker(type, processor, {
        concurrency: type === 'line_notification' ? 10 : 5,
      });
      console.log(`✅ Worker registered: ${type}`);
    });

    // 設定定時任務
    setupCronJobs();

    queuesInitialized = true;
    console.log('✅ Job system initialized with BullMQ');
  } catch (err) {
    console.error('❌ Failed to initialize job system:', err.message);
    // 不拋出錯誤，讓應用繼續運行
  }
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
      const { addJob } = require('./jobQueue');
      const { JOB_TYPES } = require('./jobQueue');
      
      // 找出所有啟用的提醒
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const reminders = await prisma.maintenanceReminder.findMany({
        where: { enabled: true },
        select: { id: true },
      });

      for (const reminder of reminders) {
        await addJob('maintenance_reminder', { reminderId: reminder.id });
      }

      console.log(`✅ Scheduled ${reminders.length} maintenance reminders`);
      await prisma.$disconnect();
    } catch (err) {
      console.error('Daily maintenance reminder cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每小時檢查 1 小時後的預約
  cron.schedule('0 * * * *', async () => {
    try {
      const { addJob } = require('./jobQueue');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

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
        await addJob('appointment_reminder', { appointmentId: appt.id, type: '1hour' });
      }

      console.log(`✅ Scheduled ${appointments.length} 1-hour appointment reminders`);
      await prisma.$disconnect();
    } catch (err) {
      console.error('Hourly appointment reminder cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每天早上 9:00 發送 1 天後的預約提醒
  cron.schedule('0 9 * * *', async () => {
    try {
      const { addJob } = require('./jobQueue');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

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
        await addJob('appointment_reminder', { appointmentId: appt.id, type: '1day' });
      }

      console.log(`✅ Scheduled ${appointments.length} 1-day appointment reminders`);
      await prisma.$disconnect();
    } catch (err) {
      console.error('Daily appointment reminder cron failed:', err.message);
    }
  }, {
    timezone: 'Asia/Taipei',
  });

  // 每天早上 10:00 檢查降價通知
  cron.schedule('0 10 * * *', async () => {
    try {
      const { addJob } = require('./jobQueue');
      await addJob('price_drop_notification', {});
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
      const { addJob } = require('./jobQueue');
      await addJob('inventory_sync', {});
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
      const { addJob, JOB_TYPES } = require('./jobQueue');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const garages = await prisma.workshop.findMany({
        where: { is_garage: true, is_active: true },
        select: { id: true },
      });

      const month = new Date().toISOString().slice(0, 7); // YYYY-MM

      for (const garage of garages) {
        await addJob(JOB_TYPES.GARAGE_REPORT_GENERATION, { garageId: garage.id, month });
      }

      console.log(`✅ Scheduled ${garages.length} garage monthly reports`);
      await prisma.$disconnect();
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
  return await addJob(type, data);
}

/**
 * 獲取所有佇列狀態
 */
async function getAllQueueStats() {
  const { getQueueStats } = require('./jobQueue');
  const { JOB_TYPES } = require('./jobQueue');
  
  const stats = {};
  for (const type of Object.values(JOB_TYPES)) {
    stats[type] = await getQueueStats(type);
  }
  return stats;
}

module.exports = {
  initializeJobSystem,
  setupCronJobs,
  triggerJob,
  getAllQueueStats,
};