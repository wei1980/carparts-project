// src/routes/garageReports.js — 🆕 車廠月報表（工單數/營收/熱門工項）
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const garageAuth = require('../middleware/garageAuth');

const prisma = new PrismaClient();
router.use(garageAuth);

// GET /api/garage/reports/monthly?month=2026-08（預設當月）
router.get('/monthly', async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
      ? req.query.month
      : new Date().toISOString().slice(0, 7);

    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    // 當月完工工單（營收以完工計）
    const records = await prisma.serviceRecord.findMany({
      where: {
        garage_id: req.workshopId,
        created_at: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
      },
      include: { items: true },
    });

    const completed = records.filter(r => r.status === 'COMPLETED');
    const totalRevenue = completed.reduce((s, r) => s + (r.total_amount || 0), 0);
    const laborRevenue = completed.reduce(
      (s, r) => s + r.items.filter(it => it.kind === 'LABOR')
        .reduce((x, it) => x + it.unit_price * it.quantity, 0), 0);
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
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const ms = new Date(start);
      ms.setMonth(ms.getMonth() - i);
      const me = new Date(ms);
      me.setMonth(me.getMonth() + 1);
      const rev = await prisma.serviceRecord.aggregate({
        where: { garage_id: req.workshopId, status: 'COMPLETED', completed_at: { gte: ms, lt: me } },
        _sum: { total_amount: true },
      });
      trend.push({ month: ms.toISOString().slice(0, 7), revenue: rev._sum.total_amount || 0 });
    }

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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 本月預約
    const [totalAppointments, pendingCount, completedAppts] = await Promise.all([
      prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lte: endOfMonth }, status: 'PENDING' }
      }),
      prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lte: endOfMonth }, status: 'COMPLETED' }
      }),
    ]);

    // 狀態分布
    const statusCounts = await prisma.appointment.groupBy({
      by: ['status'],
      where: { garage_id: workshopId, scheduled_at: { gte: startOfMonth, lte: endOfMonth } },
      _count: { id: true },
    });
    const byStatus = {};
    statusCounts.forEach(s => { byStatus[s.status] = s._count.id; });

    // 完工工單營收
    const completedRecords = await prisma.serviceRecord.findMany({
      where: { garage_id: workshopId, status: 'COMPLETED', completed_at: { gte: startOfMonth, lte: endOfMonth } },
      select: { total_amount: true }
    });
    const revenue = completedRecords.reduce((s, r) => s + (r.total_amount || 0), 0);
    const completedCount = completedRecords.length;

    // 每日預約趨勢
    const daysInMonth = endOfMonth.getDate();
    const dailyTrend = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), d);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), d, 23, 59, 59);
      const count = await prisma.appointment.count({
        where: { garage_id: workshopId, scheduled_at: { gte: dayStart, lte: dayEnd } }
      });
      dailyTrend.push({ day: d, count });
    }

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
