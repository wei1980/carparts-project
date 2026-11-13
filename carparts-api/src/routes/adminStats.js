// src/routes/adminStats.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');

router.use(adminAuth);

// GET /api/admin/stats/dashboard — 儀表板統計
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 並行查詢各項統計
    const [
      totalUsers,
      newUsersThisMonth,
      totalOrders,
      ordersThisMonth,
      totalAppointments,
      pendingAppointments,
      todayAppointments,
      totalGarages,
      recentOrders,
      monthlySales,
      topParts,
    ] = await Promise.all([
      // 總會員數
      prisma.endUser.count(),
      // 本月新會員
      prisma.endUser.count({ where: { createdAt: { gte: thisMonth } } }),
      // 總訂單數
      prisma.consumerOrder.count(),
      // 本月訂單數
      prisma.consumerOrder.count({ where: { created_at: { gte: thisMonth } } }),
      // 總預約數
      prisma.appointment.count(),
      // 待處理預約
      prisma.appointment.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      // 今日預約
      prisma.appointment.count({ where: { scheduled_at: { gte: today } } }),
      // 合作車廠數
      prisma.workshop.count({ where: { is_garage: true } }),
      // 最近 10 筆訂單
      prisma.consumerOrder.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          status: true,
          created_at: true,
        },
      }),
      // 近 6 個月銷售額（簡化版：當月訂單總額）
      prisma.consumerOrder.findMany({
        where: { created_at: { gte: new Date(today.getFullYear(), today.getMonth() - 5, 1) } },
        select: { total_amount: true, created_at: true, status: true },
      }),
      // 熱門零件 Top 5
      prisma.consumerOrderItem.groupBy({
        by: ['part_id'],
        _sum: { qty: true },
        orderBy: { _sum: { qty: 'desc' } },
        take: 5,
      }),
    ]);

    // 取得熱門零件名稱
    const partIds = topParts.map(p => p.part_id);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true, name: true, sku: true },
    });
    const partMap = {};
    parts.forEach(p => { partMap[p.id] = p.name; });

    // 計算近 6 個月銷售趨勢
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }
    monthlySales.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key] !== undefined) {
        monthlyMap[key] += Number(o.total_amount) || 0;
      }
    });

    res.json({
      overview: {
        totalUsers,
        newUsersThisMonth,
        totalOrders,
        ordersThisMonth,
        totalAppointments,
        pendingAppointments,
        todayAppointments,
        totalGarages,
      },
      recentOrders: recentOrders.map(o => ({
        ...o,
        total_amount: Number(o.total_amount),
      })),
      monthlySales: Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })),
      topParts: topParts.map(p => ({
        name: partMap[p.part_id] || '未知零件',
        qty: p._sum.qty,
      })),
    });
  } catch (error) {
    console.error('儀表板統計失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;