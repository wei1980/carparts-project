// src/services/lineService.js
const axios = require('axios');
const prisma = require('../lib/prisma');

// 引入 Flex Message 樣板
const { 
  buildOrderStatusNotification,
  buildMaintenanceReminder,
  buildAiDraftNotification,
  buildProductCard,
  sendFlexMessage,
  sendFlexMessageMulticast
} = require('./lineFlexTemplates');

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// 🆕 取得系統設定
async function getSettings() {
  try {
    const admin = await prisma.workshop.findFirst({
      where: { role: 'ADMIN' },
      select: { garage_slots: true },
    });
    return admin?.garage_slots?.system || {};
  } catch {
    return {};
  }
}

// 🆕 檢查是否啟用推播
async function isLineNotifyEnabled() {
  const settings = await getSettings();
  return settings.lineNotifyEnabled !== false; // 預設啟用
}

/**
 * 推送訊息給指定用戶
 * @param {string} userId - LINE user ID
 * @param {string|object} message - 文字訊息或 Flex Message 物件
 * @param {string} altText - 當訊息為 Flex Message 時的替代文字
 */
async function pushMessage(userId, message, altText = '車大師通知') {
  if (!LINE_TOKEN) {
    console.debug('⚠️ LINE_CHANNEL_ACCESS_TOKEN 未設定');
    return;
  }
  if (!userId) {
    console.debug('⚠️ 用戶未綁定 LINE');
    return;
  }

  // 🆕 檢查全域開關
  const enabled = await isLineNotifyEnabled();
  if (!enabled) {
    console.debug('🔕 LINE 推播已關閉');
    return;
  }

  try {
    const messages = typeof message === 'string' 
      ? [{ type: 'text', text: message }]
      : [{ type: 'flex', altText, contents: message }];
    
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`,
      },
    });
    console.debug('✅ LINE 推播已發送');
  } catch (error) {
    console.error('❌ LINE 推播失敗:', error.response?.data || error.message);
  }
}

const statusMap = {
  PENDING: '🟡 待確認',
  CONFIRMED: '🟢 已確認',
  ARRIVED: '🚗 已到店',
  IN_PROGRESS: '🔧 施工中',
  COMPLETED: '✅ 已完成',
  CANCELLED: '❌ 已取消',
};

const orderStatusMap = {
  PENDING_PAYMENT: '🟡 待付款',
  PAYMENT_REVIEW: '🟡 待查核',
  DEPOSIT_PAID: '🟠 訂金已付',
  AWAITING_BALANCE: '🚢 代購到貨，待補尾款',
  PAID: '🟢 已付款',
  SHIPPED: '📦 已出貨',
  COMPLETED: '✅ 已完成',
  CANCELLED: '❌ 已取消',
};

/**
 * 發送預約狀態變更通知 (使用 Flex Message)
 */
async function notifyAppointmentUpdate(appointment) {
  // 🆕 檢查細項開關
  const settings = await getSettings();
  if (appointment.status === 'CONFIRMED' && settings.notifyOnConfirm === false) return;
  if (appointment.status === 'COMPLETED' && settings.notifyOnComplete === false) return;
  if (appointment.status === 'CANCELLED' && settings.notifyOnCancel === false) return;

  const vehicle = appointment.vehicle;
  const garage = appointment.garage;
  const status = statusMap[appointment.status] || appointment.status;
  const time = new Date(appointment.scheduled_at).toLocaleString('zh-TW');

  // 使用 Flex Message 樣板
  const flexMessage = buildOrderStatusNotification({
    orderNumber: `APT-${appointment.id}`,
    status: appointment.status,
    totalAmount: 0, // 預約不涉及金額
    items: [{
      name: `${vehicle?.make || ''} ${vehicle?.model || ''}`,
      qty: 1
    }]
  });

  await pushMessage(appointment.user?.lineId, flexMessage);
}

/**
 * 發送訂單狀態變更通知 (使用 Flex Message)
 */
/**
 * 🆕 組裝訂單通知訊息（純函式，方便單元測試）
 */
function buildOrderNotifyMessage(order) {
  // 🆕 代購到貨：顯示應補尾款與補款提示
  const isArrival = order.status === 'AWAITING_BALANCE';
  const balanceLine = isArrival && order.balanceAmount
    ? `💳 應補尾款：NT$ ${Number(order.balanceAmount).toLocaleString()}\n📌 請到 [我的訂單] 點「補繳尾款」\n`
    : '';

  return [
    isArrival ? `🚢 代購商品到貨通知` : `🔔 訂單狀態更新`,
    `━━━━━━━━━━━━━━`,
    `📦 訂單編號：${order.order_number}`,
    `💰 金額：NT$ ${Number(order.total_amount).toLocaleString()}`,
    ...(balanceLine ? [balanceLine.trimEnd()] : []),
    `📊 狀態：${orderStatusMap[order.status] || order.status}`,
    `━━━━━━━━━━━━━━`,
    `感謝您使用車大師平台 🙏`,
  ].join('\n');
}

async function notifyOrderUpdate(order) {
  // 🆕 檢查細項開關
  const settings = await getSettings();
  if (order.status === 'PAID' && settings.notifyOnOrderPaid === false) return;
  if (order.status === 'SHIPPED' && settings.notifyOnOrderShipped === false) return;
  // 🆕 到貨通知開關：管理端把代購單推進到 AWAITING_BALANCE（代購到貨）時推播
  if (order.status === 'AWAITING_BALANCE' && settings.notifyOnArrival === false) return;

  // 使用 Flex Message 樣板
  const flexMessage = buildOrderStatusNotification(order);

  await pushMessage(order.user?.lineId, flexMessage);
}

module.exports = { pushMessage, notifyAppointmentUpdate, notifyOrderUpdate, buildOrderNotifyMessage, statusMap, orderStatusMap };