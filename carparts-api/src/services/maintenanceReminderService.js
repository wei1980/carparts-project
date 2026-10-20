// src/services/maintenanceReminderService.js
// 保養提醒：工單完工時依更換項目自動產生（可調整週期），車主亦可手動自訂。
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 預設保養週期表：關鍵字 → { interval_km, interval_days }
const DEFAULT_INTERVALS = [
  { keywords: ['機油'],           interval_km: 5000,  interval_days: 180 },
  { keywords: ['機油濾芯', '機油芯', 'oil filter'], interval_km: 5000, interval_days: 180 },
  { keywords: ['空氣濾芯', '空濾', 'air filter'],   interval_km: 20000, interval_days: 365 },
  { keywords: ['冷氣濾網', '冷氣濾芯', 'cabin'],     interval_km: 20000, interval_days: 365 },
  { keywords: ['煞車來令片', '來令片', '煞車皮', 'brake pad'], interval_km: 30000, interval_days: 730 },
  { keywords: ['煞車盤', '碟盤'],   interval_km: 60000, interval_days: 1095 },
  { keywords: ['變速箱油', 'ATF'],  interval_km: 40000, interval_days: 730 },
  { keywords: ['火星塞', 'spark plug'], interval_km: 50000, interval_days: 1460 },
  { keywords: ['電瓶', '電池', 'battery'], interval_days: 730 },
  { keywords: ['皮帶'],            interval_km: 80000, interval_days: 1825 },
  { keywords: ['冷卻液', '水箱精', '水箱水'], interval_km: 40000, interval_days: 730 },
  { keywords: ['雨刷'],            interval_days: 365 },
  { keywords: ['輪胎'],            interval_km: 50000, interval_days: 1825 },
  { keywords: ['動力方向機油', '方向機油'], interval_km: 40000, interval_days: 730 },
];

// 依工項名稱比對預設週期；找不到則不產生提醒（避免亂提醒）
function matchInterval(itemName) {
  const lower = String(itemName || '').toLowerCase();
  const rule = DEFAULT_INTERVALS.find((r) => r.keywords.some((k) => lower.includes(k.toLowerCase())));
  if (!rule) return null;
  return { interval_km: rule.interval_km || null, interval_days: rule.interval_days || null };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 工單完工時呼叫：對每個 PART/LABOR 工項比對週期表，upsert 對應提醒。
 * - 同車同標題已存在 AUTO 提醒 → 更新基準（里程/日期），不重複建立
 * - MANUAL 提醒不覆蓋
 */
async function generateRemindersFromRecord(record) {
  const created = [];
  for (const item of record.items || []) {
    // 只對「更換類」零件項目產生提醒；LABOR 若名稱含更換關鍵字也納入
    const isReplace = item.kind === 'PART' || /更換|替換/.test(item.name || '');
    if (!isReplace) continue;

    const interval = matchInterval(item.name);
    if (!interval) continue;

    const title = item.name.trim();
    const base = {
      base_mileage: record.mileage_km ?? null,
      due_date: interval.interval_days ? addDays(record.completed_at || new Date(), interval.interval_days) : null,
    };

    const existing = await prisma.maintenanceReminder.findFirst({
      where: { vehicle_id: record.vehicle_id, title, source: 'AUTO' },
    });

    if (existing) {
      await prisma.maintenanceReminder.update({ where: { id: existing.id }, data: { ...base, enabled: true } });
      created.push(existing.id);
    } else {
      const r = await prisma.maintenanceReminder.create({
        data: {
          user_id: record.user_id,
          vehicle_id: record.vehicle_id,
          title,
          interval_km: interval.interval_km,
          interval_days: interval.interval_days,
          source: 'AUTO',
          ...base,
        },
      });
      created.push(r.id);
    }
  }
  return created;
}

/** 到期狀態：DUE_NOW / DUE_SOON（30 天或 1000km 內）/ OK */
async function withDueStates(reminders, currentMileageMap = {}) {
  return reminders.map((r) => {
    const now = new Date();
    let state = 'OK';
    const kmToGo =
      r.interval_km && r.base_mileage != null && currentMileageMap[r.vehicle_id] != null
        ? r.base_mileage + r.interval_km - currentMileageMap[r.vehicle_id]
        : null;
    const daysToGo = r.due_date ? Math.ceil((new Date(r.due_date) - now) / 86400000) : null;

    if ((daysToGo != null && daysToGo <= 0) || (kmToGo != null && kmToGo <= 0)) state = 'DUE_NOW';
    else if ((daysToGo != null && daysToGo <= 30) || (kmToGo != null && kmToGo <= 1000)) state = 'DUE_SOON';

    return { ...r, days_to_go: daysToGo, km_to_go: kmToGo, state };
  });
}

module.exports = { generateRemindersFromRecord, withDueStates, matchInterval, DEFAULT_INTERVALS };
