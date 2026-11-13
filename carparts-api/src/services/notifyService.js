// src/services/notifyService.js — 平台通知統一入口
// 車廠下採購單等平台側事件 → 通知管理者（你），通道由後端設定控制：
//   notifyChannel: 'line' | 'telegram' | 'both' | 'off'（存於 ADMIN garage_slots.system.notifyChannel）
// 收件人：
//   LINE      → .env ADMIN_LINE_USER_ID（你的 LINE userId，非車廠的 line_id）
//   Telegram  → .env TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
const axios = require('axios');
const prisma = require('../lib/prisma');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_LINE_USER_ID = process.env.ADMIN_LINE_USER_ID;
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/** 讀取系統設定（與 lineService 同源：ADMIN garage_slots.system） */
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

/**
 * 通知管理者（車廠下單等平台事件）。
 * @param {string} text 純文字訊息
 * @param {object} [opts] { eventKey?: string } — eventKey 對應細項開關（如 notifyOnPoCreated）
 * @returns {Promise<{sent: string[], skipped: string, errors: string[]}>}
 */
async function notifyAdmin(text, { eventKey } = {}) {
  const settings = await getSettings();

  // 總開關（沿用 lineNotifyEnabled 作為推播總開關；預設啟用）
  if (settings.lineNotifyEnabled === false) {
    return { sent: [], skipped: 'disabled', errors: [] };
  }
  // 細項開關（例如 notifyOnPoCreated 控制採購單通知）
  if (eventKey && settings[eventKey] === false) {
    return { sent: [], skipped: 'event_off', errors: [] };
  }

  const channel = settings.notifyChannel || 'line'; // 未設定時預設 LINE（既有行為）
  const sent = [], errors = [];

  const sendLine = async () => {
    if (!LINE_TOKEN || !ADMIN_LINE_USER_ID) return errors.push('LINE: 缺 ADMIN_LINE_USER_ID 或 Channel Token');
    try {
      await axios.post('https://api.line.me/v2/bot/message/push',
        { to: ADMIN_LINE_USER_ID, messages: [{ type: 'text', text }] },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` }, timeout: 8000 });
      sent.push('line');
    } catch (e) {
      errors.push(`LINE: ${e.response?.data?.message || e.message}`);
    }
  };

  const sendTelegram = async () => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return errors.push('Telegram: 缺 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
    try {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        { chat_id: TELEGRAM_CHAT_ID, text },
        { timeout: 8000 });
      sent.push('telegram');
    } catch (e) {
      errors.push(`Telegram: ${e.response?.data?.description || e.message}`);
    }
  };

  // 依設定的通道發送（both = 兩個都發）
  const tasks = [];
  if (channel === 'line' || channel === 'both') tasks.push(sendLine());
  if (channel === 'telegram' || channel === 'both') tasks.push(sendTelegram());

  await Promise.allSettled(tasks);
  return { sent, skipped: null, errors };
}

module.exports = { notifyAdmin, getSettings };
