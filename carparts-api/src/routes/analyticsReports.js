const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');
const garageAuth = require('../middleware/garageAuth');

const prisma = new PrismaClient();

// ==================== 公開/管理端銷售儀表板 ====================

// GET /api/admin/analytics/sales-overview - 銷售總覽
router.get('/sales-overview', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // 車廠訂單
    const orders = await prisma.order.findMany({
      where: {
        created_at: { gte: start, lte: end },
        status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] }
      },
      select: {
        id: true,
        total_amount: true,
        created_at: true,
        workshop_id: true,
        items: { select: { qty: true, price_snapshot: true, part_id: true } }
      }
    });

    // 消費者訂單
    const consumerOrders = await prisma.consumerOrder.findMany({
      where: {
        created_at: { gte: start, lte: end },
        status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] }
      },
      select: {
        id: true,
        total_amount: true,
        created_at: true,
        items: { select: { qty: true, price_snapshot: true, part_id: true } }
      }
    });

    const allOrders = [...orders, ...consumerOrders];

    // 總營收
    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = allOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItemsSold = allOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);

    // 按日期分組
    const revenueByDate = {};
    allOrders.forEach(o => {
      const date = new Date(o.created_at);
      let key;
      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0];
      }
      if (!revenueByDate[key]) {
        revenueByDate[key] = { revenue: 0, orders: 0, items: 0 };
      }
      revenueByDate[key].revenue += Number(o.total_amount);
      revenueByDate[key].orders += 1;
      revenueByDate[key].items += o.items.reduce((s, i) => s + i.qty, 0);
    });

    // 熱銷零件
    const partSales = {};
    allOrders.forEach(o => {
      o.items.forEach(item => {
        const key = item.part_id;
        if (!partSales[key]) {
          partSales[key] = { partId: key, name: item.name_snapshot, qty: 0, revenue: 0 };
        }
        partSales[key].qty += item.qty;
        partSales[key].revenue += Number(item.price_snapshot) * item.qty;
      });
    });

    const topParts = Object.values(partSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map(p => ({ ...p, revenue: Math.round(p.revenue) }));

    res.json({
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue),
        totalItemsSold,
        period: { start, end, groupBy }
      },
      revenueByDate: Object.entries(revenueByDate)
        .map(([date, data]) => ({ date, ...data, revenue: Math.round(data.revenue) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topParts
    });
  } catch (error) {
    console.error('銷售總覽失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/admin/analytics/top-parts - 熱銷零件排行
router.get('/top-parts', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await prisma.order.findMany({
      where: { created_at: { gte: start, lte: end }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: { items: { select: { part_id: true, name_snapshot: true, sku_snapshot: true, qty: true, price_snapshot: true, brand: true } } }
    });

    const consumerOrders = await prisma.consumerOrder.findMany({
      where: { created_at: { gte: start, lte: end }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: { items: { select: { part_id: true, name_snapshot: true, sku_snapshot: true, qty: true, price_snapshot: true, brand: true } } }
    });

    const partStats = {};
    [...orders, ...consumerOrders].forEach(o => {
      o.items.forEach(item => {
        if (!partStats[item.part_id]) {
          partStats[item.part_id] = { 
            partId: item.part_id, 
            name: item.name_snapshot, 
            sku: item.sku_snapshot, 
            qty: 0, 
            revenue: 0,
            orders: new Set()
          };
        }
        partStats[item.part_id].qty += item.qty;
        partStats[item.part_id].revenue += Number(item.price_snapshot) * item.qty;
      });
    });

    // 取得零件詳細資訊
    const partIds = Object.keys(partStats).map(Number);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true, brand: true, category: true, subcategory_id: true, image_url: true, wholesale_price: true, msrp_price: true }
    });

    const partMap = new Map(parts.map(p => [p.id, p]));

    const result = Object.values(partStats)
      .map(p => {
        const part = partMap.get(p.partId);
        return {
          ...p,
          revenue: Math.round(p.revenue),
          brand: part?.brand || '',
          category: part?.category || '',
          image_url: part?.image_url || '',
          wholesale_price: part?.wholesale_price ? Number(part.wholesale_price) : 0,
          msrp_price: part?.msrp_price ? Number(part.msrp_price) : 0,
          margin: part?.wholesale_price && part?.msrp_price 
            ? Math.round(((Number(part.msrp_price) - Number(part.wholesale_price)) / Number(part.msrp_price)) * 100) 
            : 0
        };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, parseInt(limit));

    res.json(result);
  } catch (error) {
    console.error('熱銷零件失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/admin/analytics/revenue-trend - 營收趨勢
router.get('/revenue-trend', adminAuth, async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const monthsNum = parseInt(months);
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { created_at: { gte: startDate }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: { total_amount: true, created_at: true }
    });

    const consumerOrders = await prisma.consumerOrder.findMany({
      where: { created_at: { gte: startDate }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
      select: { total_amount: true, created_at: true }
    });

    const trend = {};
    for (let i = 0; i < monthsNum; i++) {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trend[key] = { revenue: 0, orders: 0 };
    }

    [...orders, ...consumerOrders].forEach(o => {
      const date = new Date(o.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (trend[key]) {
        trend[key].revenue += Number(o.total_amount);
        trend[key].orders += 1;
      }
    });

    const result = Object.entries(trend).map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue),
      orders: data.orders
    }));

    res.json(result);
  } catch (error) {
    console.error('營收趨勢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// ==================== 車廠營運報表 ====================

// GET /api/garage/reports/operation - 車廠營運總覽
router.get('/operation', garageAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workshopId = req.workshopId;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // 工單統計
    const workOrders = await prisma.workOrder.findMany({
      where: {
        garage_id: workshopId,
        created_at: { gte: start, lte: end }
      },
      include: {
        technician: { select: { id: true, name: true } },
        statusHistory: { orderBy: { created_at: 'asc' } }
      }
    });

    const totalWorkOrders = workOrders.length;
    const completedOrders = workOrders.filter(w => ['COMPLETED', 'DELIVERED'].includes(w.status)).length;
    const inProgressOrders = workOrders.filter(w => ['IN_PROGRESS', 'QUALITY_CHECK'].includes(w.status)).length;
    const cancelledOrders = workOrders.filter(w => w.status === 'CANCELLED').length;
    const completionRate = totalWorkOrders > 0 ? (completedOrders / totalWorkOrders) * 100 : 0;

    // 平均維修時長 (從 RECEIVED 到 COMPLETED)
    let totalDuration = 0;
    let completedCount = 0;
    workOrders.forEach(wo => {
      if (['COMPLETED', 'DELIVERED'].includes(wo.status) && wo.completed_at) {
        const created = new Date(wo.created_at).getTime();
        const completed = new Date(wo.completed_at).getTime();
        totalDuration += (completed - created) / (1000 * 60 * 60); // hours
        completedCount++;
      }
    });
    const avgRepairHours = completedCount > 0 ? totalDuration / completedCount : 0;

    // 技師產能
    const technicianStats = {};
    workOrders.forEach(wo => {
      if (wo.technician) {
        if (!technicianStats[wo.technician.id]) {
          technicianStats[wo.technician.id] = { 
            id: wo.technician.id, 
            name: wo.technician.name, 
            total: 0, 
            completed: 0, 
            totalHours: 0 
          };
        }
        technicianStats[wo.technician.id].total++;
        if (['COMPLETED', 'DELIVERED'].includes(wo.status)) {
          technicianStats[wo.technician.id].completed++;
          if (wo.completed_at) {
            technicianStats[wo.technician.id].totalHours += 
              (new Date(wo.completed_at).getTime() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60);
          }
        }
      }
    });

    // 營收統計
    const orders = await prisma.order.findMany({
      where: {
        workshop_id: workshopId,
        created_at: { gte: start, lte: end },
        status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] }
      },
      select: { total_amount: true, created_at: true }
    });
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    res.json({
      summary: {
        totalWorkOrders,
        completedOrders,
        inProgressOrders,
        cancelledOrders,
        completionRate: Math.round(completionRate * 100) / 100,
        avgRepairHours: Math.round(avgRepairHours * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
        period: { start, end }
      },
      technicianPerformance: Object.values(technicianStats).map(t => ({
        ...t,
        completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 10000) / 100 : 0,
        avgHoursPerOrder: t.completed > 0 ? Math.round((t.totalHours / t.completed) * 100) / 100 : 0
      })),
      workOrderStatusBreakdown: {
        RECEIVED: workOrders.filter(w => w.status === 'RECEIVED').length,
        QUOTING: workOrders.filter(w => w.status === 'QUOTING').length,
        CUSTOMER_CONFIRMED: workOrders.filter(w => w.status === 'CUSTOMER_CONFIRMED').length,
        IN_PROGRESS: workOrders.filter(w => w.status === 'IN_PROGRESS').length,
        QUALITY_CHECK: workOrders.filter(w => w.status === 'QUALITY_CHECK').length,
        COMPLETED: workOrders.filter(w => w.status === 'COMPLETED').length,
        READY_FOR_PICKUP: workOrders.filter(w => w.status === 'READY_FOR_PICKUP').length,
        DELIVERED: workOrders.filter(w => w.status === 'DELIVERED').length,
        CANCELLED: workOrders.filter(w => w.status === 'CANCELLED').length
      }
    });
  } catch (error) {
    console.error('車廠營運報表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/garage/reports/technician - 技師詳細產能報表
router.get('/technician', garageAuth, async (req, res) => {
  try {
    const { startDate, endDate, technicianId } = req.query;
    const workshopId = req.workshopId;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const where = { garage_id: workshopId, created_at: { gte: start, lte: end } };
    if (technicianId) where.technician_id = parseInt(technicianId);

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        technician: { select: { id: true, name: true } },
        statusHistory: { orderBy: { created_at: 'asc' } },
        items: { select: { unit_price: true, qty: true } },
        laborItems: { select: { amount: true } }
      }
    });

    const techStats = {};
    workOrders.forEach(wo => {
      if (!wo.technician) return;
      const tid = wo.technician.id;
      if (!techStats[tid]) {
        techStats[tid] = {
          id: tid,
          name: wo.technician.name,
          orders: [],
          totalPartsRevenue: 0,
          totalLaborRevenue: 0
        };
      }
      techStats[tid].orders.push(wo);
      techStats[tid].totalPartsRevenue += wo.items.reduce((s, i) => s + Number(i.unit_price) * i.qty, 0);
      techStats[tid].totalLaborRevenue += wo.laborItems.reduce((s, i) => s + Number(i.amount), 0);
    });

    const result = Object.values(techStats).map(t => {
      const completed = t.orders.filter(o => ['COMPLETED', 'DELIVERED'].includes(o.status));
      const totalHours = completed.reduce((sum, o) => {
        if (o.completed_at) return sum + (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
        return sum;
      }, 0);

      // 計算各狀態耗時
      const stageDurations = {};
      t.orders.forEach(o => {
        o.statusHistory.forEach((h, i) => {
          if (i < o.statusHistory.length - 1) {
            const next = o.statusHistory[i + 1];
            const hours = (new Date(next.created_at).getTime() - new Date(h.created_at).getTime()) / (1000 * 60 * 60);
            if (!stageDurations[h.to_status]) stageDurations[h.to_status] = [];
            stageDurations[h.to_status].push(hours);
          }
        });
        if (o.completed_at && o.statusHistory.length > 0) {
          const last = o.statusHistory[o.statusHistory.length - 1];
          const hours = (new Date(o.completed_at).getTime() - new Date(last.created_at).getTime()) / (1000 * 60 * 60);
          if (!stageDurations[o.status]) stageDurations[o.status] = [];
          stageDurations[o.status].push(hours);
        }
      });

      const avgStageDurations = {};
      Object.entries(stageDurations).forEach(([stage, hours]) => {
        avgStageDurations[stage] = Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 100) / 100;
      });

      return {
        id: t.id,
        name: t.name,
        totalOrders: t.orders.length,
        completedOrders: completed.length,
        completionRate: t.orders.length > 0 ? Math.round((completed.length / t.orders.length) * 10000) / 100 : 0,
        avgRepairHours: completed.length > 0 ? Math.round((totalHours / completed.length) * 100) / 100 : 0,
        totalPartsRevenue: Math.round(t.totalPartsRevenue),
        totalLaborRevenue: Math.round(t.totalLaborRevenue),
        totalRevenue: Math.round(t.totalPartsRevenue + t.totalLaborRevenue),
        avgStageDurations
      };
    });

    res.json({ technicians: result, period: { start, end } });
  } catch (error) {
    console.error('技師產能報表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/garage/reports/parts-usage - 零件用量報表
router.get('/parts-usage', garageAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workshopId = req.workshopId;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const workOrders = await prisma.workOrder.findMany({
      where: { garage_id: workshopId, created_at: { gte: start, lte: end } },
      include: { items: { include: { part: { select: { id: true, name: true, brand: true, sku: true, category: true } } } } }
    });

    const partUsage = {};
    workOrders.forEach(wo => {
      wo.items.forEach(item => {
        const pid = item.part_id;
        if (!partUsage[pid]) {
          partUsage[pid] = { 
            partId: pid, 
            name: item.part?.name, 
            brand: item.part?.brand, 
            sku: item.part?.sku,
            category: item.part?.category,
            totalQty: 0,
            totalRevenue: 0,
            workOrderCount: 0
          };
        }
        partUsage[pid].totalQty += item.qty;
        partUsage[pid].totalRevenue += Number(item.unit_price) * item.qty;
        partUsage[pid].workOrderCount += 1;
      });
    });

    const result = Object.values(partUsage)
      .map(p => ({ ...p, totalRevenue: Math.round(p.totalRevenue) }))
      .sort((a, b) => b.totalQty - a.totalQty);

    res.json({ parts: result, period: { start, end } });
  } catch (error) {
    console.error('零件用量報表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/garage/reports/daily - 每日營運摘要
router.get('/daily', garageAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const workshopId = req.workshopId;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [workOrders, orders, appointments] = await Promise.all([
      prisma.workOrder.findMany({
        where: { garage_id: workshopId, created_at: { gte: targetDate, lt: nextDay } },
        include: { technician: { select: { name: true } }, items: true, laborItems: true }
      }),
      prisma.order.findMany({
        where: { workshop_id: workshopId, created_at: { gte: targetDate, lt: nextDay }, status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } }
      }),
      prisma.appointment.findMany({
        where: { garage_id: workshopId, scheduled_at: { gte: targetDate, lt: nextDay } }
      })
    ]);

    const completedWO = workOrders.filter(w => ['COMPLETED', 'DELIVERED'].includes(w.status));
    const totalPartsRevenue = workOrders.reduce((s, w) => s + w.items.reduce((sum, i) => sum + Number(i.unit_price) * i.qty, 0), 0);
    const totalLaborRevenue = workOrders.reduce((s, w) => s + w.laborItems.reduce((sum, i) => sum + Number(i.amount), 0), 0);
    const orderRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      summary: {
        newWorkOrders: workOrders.length,
        completedWorkOrders: completedWO.length,
        newAppointments: appointments.length,
        totalRevenue: Math.round(totalPartsRevenue + totalLaborRevenue + orderRevenue),
        partsRevenue: Math.round(totalPartsRevenue),
        laborRevenue: Math.round(totalLaborRevenue),
        orderRevenue: Math.round(orderRevenue)
      },
      workOrdersByStatus: {
        RECEIVED: workOrders.filter(w => w.status === 'RECEIVED').length,
        QUOTING: workOrders.filter(w => w.status === 'QUOTING').length,
        IN_PROGRESS: workOrders.filter(w => w.status === 'IN_PROGRESS').length,
        COMPLETED: workOrders.filter(w => w.status === 'COMPLETED').length,
        DELIVERED: workOrders.filter(w => w.status === 'DELIVERED').length
      },
      technicianWorkload: workOrders
        .filter(w => w.technician)
        .reduce((acc, w) => {
          if (!acc[w.technician.id]) acc[w.technician.id] = { name: w.technician.name, count: 0 };
          acc[w.technician.id].count++;
          return acc;
        }, {})
    });
  } catch (error) {
    console.error('每日營運摘要失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;