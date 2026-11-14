// src/routes/garageReports.js — 🆕 車廠月報表（工單數/營收/熱門工項）
const express = require('express');
const router = express.Router();
const garageAuth = require('../middleware/garageAuth');

const prisma = require('../lib/prisma');
router.use(garageAuth);

// ============================================================
// ⚠️ 月份邊界必須用「本地時間」計算，且位移月份前要先 setDate(1)。
//    原本直接 `new Date(start).setMonth(m-1)` 有兩個錯：
//      1) 月末溢出：3/31 減一個月 → 3/3（不是 2 月底）
//      2) toISOString() 取 YYYY-MM 會轉 UTC，台北時間 8/1 00:00
//         變成 UTC 7/31 16:00 → 標籤變「2026-07」（整整早一個月）
//    這裡統一用本地年月日組字串，並以 setDate(1) 對齊月初再位移。
// ============================================================
function monthStart(base, offsetMonths = 0) {
  const d = new Date(base.getFullYear(), base.getMonth() + offsetMonths, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function nextMonthStart(d) {
  return monthStart(d, 1);
}
function monthLabel(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function parseMonthParam(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { year: y, month: mo - 1 }; // month 為 0-based
}

// GET /api/garage/reports/monthly?month=2026-08（預設當月）
router.get('/monthly', async (req, res) => {
  try {
    // 月份以本地時間解析（台北 8/1 00:00 = UTC 7/31 16:00，用 UTC 取月會早一格）
    const parsed = parseMonthParam(req.query.month);
    const anchor = parsed ? new Date(parsed.year, parsed.month, 1) : monthStart(new Date());
    const start = monthStart(anchor);
    const end = nextMonthStart(start);
    const month = monthLabel(start);

    // 當月「開立」的工單（工單數、熱門工項用這個口徑）
    const records = await prisma.serviceRecord.findMany({
      where: {
        garage_id: req.workshopId,
        created_at: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
      },
      include: { items: true },
    });

    // ⚠️ 營收一律以「當月完工」計（completed_at），與 revenue_trend 同口徑。
    //    原本用 created_at 篩、再 filter(status==='COMPLETED')，
    //    但「8 月開立、9 月完工」的工單會被算進 8 月營收 → 與趨勢圖永遠對不上。
    const completed = await prisma.serviceRecord.findMany({
      where: {
        garage_id: req.workshopId,
        status: 'COMPLETED',
        completed_at: { gte: start, lt: end },
      },
      include: { items: true },
    });

    const totalRevenue = completed.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const laborRevenue = completed.reduce(
      (s, r) => s + (r.items || [])
        .filter(it => it.kind === 'LABOR')
        .reduce((x, it) => x + Number(it.unit_price || 0) * Number(it.quantity || 0), 0), 0);
    const partRevenue = totalRevenue - laborRevenue;

    // 熱門工項（LABOR 名稱聚合，取前 5）
    const laborCount = {};
    for (const r of records) {
      for (const it of r.items) {
        if (it.kind !== 'LABOR') continue;
        laborCount[it.name] = (laborCount[it.name] || 0) + it.quantity;
      }
    }
    const topLaborItems = Object.entries(laborCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    // 預約統計
    const appointments = await prisma.appointment.aggregate({
      where: { garage_id: req.workshopId, scheduled_at: { gte: start, lt: end } },
      _count: { id: true },
    });
    const completedAppts = await prisma.appointment.count({
      where: { garage_id: req.workshopId, scheduled_at: { gte: start, lt: end }, status: 'COMPLETED' },
    });

    // 近 6 個月營收趨勢
    // 一次撈完近 6 個月的完工工單，在記憶體分組（避免 6 次 DB 往返）
    const trendStart = monthStart(start, -5);
    const trendRecords = await prisma.serviceRecord.findMany({
      where: {
        garage_id: req.workshopId,
        status: 'COMPLETED',
        completed_at: { gte: trendStart, lt: end },
      },
      select: { completed_at: true, total_amount: true },
    });
    const trendMap = new Map();
    for (let i = 5; i >= 0; i--) {
      const ms = monthStart(start, -i);
      trendMap.set(monthLabel(ms), 0);
    }
    for (const r of trendRecords) {
      if (!r.completed_at) continue;
      const d = new Date(r.completed_at);
      const key = monthLabel(new Date(d.getFullYear(), d.getMonth(), 1));
      if (trendMap.has(key)) trendMap.set(key, trendMap.get(key) + (Number(r.total_amount) || 0));
    }
    const trend = [...trendMap.entries()].map(([m, revenue]) => ({ month: m, revenue }));

    res.json({
      month,
      summary: {
        work_orders_total: records.length,
        work_orders_completed: completed.length,
        total_revenue: totalRevenue,
        labor_revenue: laborRevenue,
        part_revenue: partRevenue,
        avg_order_value: completed.length ? Math.round(totalRevenue / completed.length) : 0,
      },
      appointments: {
        total: appointments._count.id,
        completed: completedAppts,
      },
      top_labor_items: topLaborItems,
      revenue_trend: trend,
    });
  } catch (error) {
    console.error('車廠月報表失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/garage/reports/stats — 統計資料（給行事曆統計視圖用）
router.get('/stats', async (req, res) => {
  try {
    const workshopId = req.workshopId;
    const now = new Date();
    // 本月邊界用「下月 1 日 00:00」當 exclusive 上界：
    // 用月末 23:59:59 會漏掉 23:59:59.xxx 的資料。
    const startOfMonth = monthStart(now);
    const endOfMonthExclusive = nextMonthStart(startOfMonth);

    // 本月預約
    const [totalAppointments, pendingCount, completedAppts] = await Promise.all([
      prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lt: endOfMonthExclusive } }
      }),
      prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lt: endOfMonthExclusive }, status: 'PENDING' }
      }),
      prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lt: endOfMonthExclusive }, status: 'COMPLETED' }
      }),
    ]);

    // 狀態分布
    const statusCounts = await prisma.appointment.groupBy({
      by: ['status'],
      where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lt: endOfMonthExclusive } },
      _count: { id: true },
    });
    const byStatus = {};
    statusCounts.forEach(s => { byStatus[s.status] = s._count.id; });

    // 完工工單營收
    const completedRecords = await prisma.serviceRecord.findMany({
      where: { garage_id: workshopId, status: 'COMPLETED', completed_at: { gte: startOfMonth, lt: endOfMonthExclusive } },
      select: { total_amount: true }
    });
    const revenue = completedRecords.reduce((s, r) => s + (r.total_amount || 0), 0);
    const completedCount = completedRecords.length;

    // 每日預約趨勢：一次撈本月預約，在記憶體按日分組
    // （原本每天一次 count，一個月 31 次 DB 往返；且 endOfMonth 用 23:59:59 會漏毫秒）
    const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
    const monthAppointments = await prisma.appointment.findMany({
      where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lt: endOfMonthExclusive } },
      select: { scheduled_at: true },
    });
    const perDay = new Array(daysInMonth).fill(0);
    for (const a of monthAppointments) {
      const d = new Date(a.scheduled_at);
      const dayIdx = d.getDate() - 1;
      if (dayIdx >= 0 && dayIdx < daysInMonth) perDay[dayIdx] += 1;
    }
    const dailyTrend = perDay.map((count, i) => ({ day: i + 1, count }));

    res.json({
      totalAppointments,
      pendingCount,
      completedCount,
      revenue,
      byStatus,
      dailyTrend,
    });
  } catch (error) {
    console.error('車廠統計失敗:', error.message);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
