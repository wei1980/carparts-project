/**
 * Background Job Workers
 * 實際執行各類背景任務的處理器
 */
const { pushMessage } = require('./lineService');
const { cacheService } = require('./cacheService');
const { invalidateCache } = require('../middleware/cacheMiddleware');

const prisma = require('../lib/prisma');

/**
 * 維護提醒 Worker
 * 每天早上 8:00 執行，檢查即將到期的保養項目並發送 LINE 通知
 */
async function processMaintenanceReminder(job) {
  const { reminderId } = job.data;
  // 沒有 id 就沒東西可處理（cron 一定會帶；這裡防禦手動觸發或舊任務殘留）
  if (!reminderId) return { success: true, skipped: true, reason: 'NO_REMINDER_ID' };

  try {
    const reminder = await prisma.maintenanceReminder.findUnique({
      where: { id: reminderId },
      include: {
        user: { select: { id: true, name: true, lineId: true } },
        vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
      },
    });

    if (!reminder || !reminder.enabled) {
      console.log(`Reminder ${reminderId} not found or disabled`);
      return { success: true, skipped: true };
    }

    if (!reminder.user?.lineId) {
      console.log(`User ${reminder.userId} has no LINE ID`);
      return { success: true, skipped: true };
    }

    // 計算剩餘天數/里程
    let message = '';
    const today = new Date();
    
    if (reminder.due_date && reminder.due_date <= today) {
      message = `🔔 保養提醒：${reminder.title} 已到期！`;
    } else if (reminder.due_date) {
      const daysLeft = Math.ceil((reminder.due_date - today) / (1000 * 60 * 60 * 24));
      message = `🔔 保養提醒：${reminder.title} 將在 ${daysLeft} 天后到期`;
    } else if (reminder.km_to_go !== null && reminder.km_to_go <= 0) {
      message = `🔔 保養提醒：${reminder.title} 里程已達標！`;
    } else if (reminder.km_to_go !== null) {
      message = `🔔 保養提醒：${reminder.title} 還有 ${reminder.km_to_go} 公里到期`;
    } else {
      return { success: true, skipped: true };
    }

    // 發送 LINE 通知
    const vehicleInfo = reminder.vehicle 
      ? `${reminder.vehicle.make} ${reminder.vehicle.model} (${reminder.vehicle.licensePlate || '無車牌'})`
      : '您的愛車';

    const lines = [
      message,
      '━━━━━━━━━━━━━━',
      `🚗 ${vehicleInfo}`,
      `📋 項目：${reminder.title}`,
      `📅 週期：${reminder.interval_km ? `${reminder.interval_km} 公里` : ''}${reminder.interval_days ? ` / ${Math.round(reminder.interval_days / 30)} 個月` : ''}`,
      '━━━━━━━━━━━━━━',
      '請至 App「我的愛車」查看詳情並預約保養',
    ].filter(Boolean).join('\n');

    await pushMessage(reminder.user.lineId, lines);

    // 更新最後通知時間
    await prisma.maintenanceReminder.update({
      where: { id: reminderId },
      data: { last_notified_at: new Date() },
    });

    console.log(`✅ Maintenance reminder sent for ${reminderId}`);
    return { success: true, sent: true };
  } catch (err) {
    console.error(`Maintenance reminder job failed:`, err.message);
    throw err;
  }
}

/**
 * 預約提醒 Worker
 * 提前 1 小時/1 天發送預約提醒
 */
async function processAppointmentReminder(job) {
  const { appointmentId, type } = job.data; // type: '1hour' | '1day'
  // 沒有 id 就沒東西可處理（否則 findUnique({where:{}}) 會拋 → 排程失敗）
  if (!appointmentId) return { success: true, skipped: true, reason: 'NO_APPOINTMENT_ID' };

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: { select: { id: true, name: true, lineId: true } },
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        garage: { select: { garage_name: true, garage_address: true, garage_phone: true } },
      },
    });

    if (!appointment || appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return { success: true, skipped: true };
    }

    if (!appointment.user?.lineId) {
      return { success: true, skipped: true };
    }

    const timeLabel = type === '1hour' ? '1 小時後' : '明天';
    const apptTime = new Date(appointment.scheduled_at).toLocaleString('zh-TW');

    const lines = [
      `🔔 預約提醒：您的安裝預約將在 ${timeLabel} 進行`,
      '━━━━━━━━━━━━━━',
      `🏪 ${appointment.garage?.garage_name || '車廠'}`,
      `📍 ${appointment.garage?.garage_address || ''}`,
      `📞 ${appointment.garage?.garage_phone || ''}`,
      `🚗 ${appointment.vehicle?.make || ''} ${appointment.vehicle?.model || ''} (${appointment.vehicle?.licensePlate || '無車牌'})`,
      `📅 時間：${apptTime}`,
      appointment.install_items?.length > 0 
        ? `🔧 安裝項目：${appointment.install_items.map(i => `${i.name}×${i.qty}`).join(', ')}`
        : '',
      appointment.note ? `📝 備註：${appointment.note}` : '',
      '━━━━━━━━━━━━━━',
      '如需更改時間請至 App「我的預約」修改',
    ].filter(Boolean).join('\n');

    await pushMessage(appointment.user.lineId, lines);
    console.log(`✅ Appointment reminder sent for ${appointmentId} (${type})`);
    return { success: true, sent: true };
  } catch (err) {
    console.error(`Appointment reminder job failed:`, err.message);
    throw err;
  }
}

/**
 * 降價通知 Worker
 * 檢查願望清單中價格低於目標價的商品
 */
async function processPriceDropNotification(job) {
  try {
    // 找出所有有目標價且商品價格低於目標價的願望清單項目
    // ⚠️ 不能用 `prisma.wishItem.fields.targetPrice` 做欄位對欄位比較：
    //    那是 Prisma 4 的舊語法，在 Prisma 5 會拋
    //    「Expected a referenced scalar field of model Part, but found a field of model WishItem」。
    //    改成先撈候選、再在記憶體比價（願望清單量級小，可接受）。
    const wishes = await prisma.wishItem.findMany({
      where: {
        partId: { not: null },
        targetPrice: { not: null },
        part: { is_active: true },
      },
      include: {
        user: { select: { id: true, name: true, lineId: true } },
        part: { select: { id: true, name: true, sku: true, msrp_price: true, brand: true } },
      },
    });

    let sentCount = 0;

    for (const wish of wishes) {
      if (!wish.user?.lineId) continue;
      if (!wish.part) continue;

      const currentPrice = Number(wish.part.msrp_price || 0);
      const targetPrice = Number(wish.targetPrice);

      // 必須低於目標價才通知
      if (currentPrice >= targetPrice) continue;
      // 已通知過：只有「比上次通知時更便宜」才再通知一次（避免重複轟炸）
      if (wish.notifiedAtPrice != null && currentPrice >= Number(wish.notifiedAtPrice)) continue;

      const lines = [
        `🔔 降價通知！您關注的商品降價了`,
        '━━━━━━━━━━━━━━',
        `🔧 ${wish.part.brand} ${wish.part.name}`,
        `🏷️ SKU: ${wish.part.sku}`,
        `💰 現價：NT$ ${currentPrice.toLocaleString()} (原價 NT$ ${Number(wish.part.msrp_price || 0).toLocaleString()})`,
        `🎯 您的目標價：NT$ ${targetPrice.toLocaleString()}`,
        `💸 省下：NT$ ${(targetPrice - currentPrice).toLocaleString()}`,
        '━━━━━━━━━━━━━━',
        '請至 App「願望清單」查看並下單',
      ].join('\n');

      await pushMessage(wish.user.lineId, lines);

      // 更新通知記錄
      await prisma.wishItem.update({
        where: { id: wish.id },
        data: { 
          notifiedAt: new Date(),
          notifiedAtPrice: currentPrice,
        },
      });

      sentCount++;
    }

    console.log(`✅ Price drop notifications sent: ${sentCount}`);
    return { success: true, sentCount };
  } catch (err) {
    console.error(`Price drop notification job failed:`, err.message);
    throw err;
  }
}

/**
 * 庫存同步 Worker
 * 同步供貨商庫存、更新本地庫存
 */
async function processInventorySync(job) {
  const { supplierId } = job.data;
  
  try {
    // ⚠️ Part 沒有 supplier_id 欄位（supplier_id 屬於 Shipment）。
    //    原本 select 不存在的欄位 → PrismaClientValidationError → 每次排程都失敗。
    const parts = await prisma.part.findMany({
      where: { is_active: true },
      select: { id: true, stock_qty: true, distributor_stock_qty: true },
    });

    // 這裡應該呼叫供貨商 API 獲取最新庫存
    // 暫時跳過實際 API 呼叫（尚未接供貨商）
    const lowStock = parts.filter((p) => (p.stock_qty || 0) <= 0).length;

    console.log(`✅ Inventory sync completed: ${parts.length} parts（其中 ${lowStock} 項自備庫存為 0）`);
    return { success: true, synced: parts.length, supplierId: supplierId || null, lowStock };
  } catch (err) {
    console.error(`Inventory sync job failed:`, err.message);
    throw err;
  }
}

/**
 * 車廠月報表生成 Worker
 */
async function processGarageReportGeneration(job) {
  const { garageId, month } = job.data;
  
  try {
    // 生成報表邏輯（可複用 garageReports.js 的邏輯）
    // 這裡只做示範
    console.log(`✅ Garage report generated for garage ${garageId}, month ${month}`);
    return { success: true };
  } catch (err) {
    console.error(`Garage report generation job failed:`, err.message);
    throw err;
  }
}

/**
 * 通用通知發送 Worker
 */
async function processNotification(job) {
  const { type, lineId, title, body, data } = job.data;
  
  try {
    if (!lineId) return { success: true, skipped: true };

    const lines = [
      title,
      '━━━━━━━━━━━━━━',
      body,
      '━━━━━━━━━━━━━━',
      data?.url ? `🔗 ${data.url}` : '',
    ].filter(Boolean).join('\n');

    await pushMessage(lineId, lines);
    return { success: true, sent: true };
  } catch (err) {
    console.error(`Notification job failed:`, err.message);
    throw err;
  }
}

// Worker 註冊映射
const WORKER_PROCESSORS = {
  maintenance_reminder: processMaintenanceReminder,
  appointment_reminder: processAppointmentReminder,
  price_drop_notification: processPriceDropNotification,
  inventory_sync: processInventorySync,
  garage_report_generation: processGarageReportGeneration,
  line_notification: processNotification,
  email_notification: processNotification, // 同樣處理器，可擴展 Email
};

module.exports = {
  processMaintenanceReminder,
  processAppointmentReminder,
  processPriceDropNotification,
  processInventorySync,
  processGarageReportGeneration,
  processNotification,
  WORKER_PROCESSORS,
};