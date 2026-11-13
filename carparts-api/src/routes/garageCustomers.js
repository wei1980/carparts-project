// src/routes/garageCustomers.js — 車廠：客戶管理 API
const express = require('express');
const router = express.Router();
const garageAuth = require('../middleware/garageAuth');

const prisma = require('../lib/prisma');
router.use(garageAuth);

// GET /api/garage/customers — 客戶列表（支援搜尋、標籤篩選、分頁）
router.get('/', async (req, res) => {
  try {
    const { page, pageSize, search, tag } = req.query;
    const workshopId = req.workshopId;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const take = Math.min(Math.max(parseInt(pageSize) || 20, 1), 100);
    const skip = (pageNum - 1) * take;

    // 建立 where 條件
    const where = { workshop_id: workshopId };
    const conditions = [];

    if (search) {
      const s = String(search).trim();
      conditions.push({
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { phone: { contains: s, mode: 'insensitive' } },
          { line_id: { contains: s, mode: 'insensitive' } },
          { tags: { has: s } },
        ],
      });
    }

    if (tag) {
      conditions.push({ tags: { has: String(tag) } });
    }

    if (conditions.length > 0) where.AND = conditions;

    // 查詢客戶（來車記錄以獨立查詢補上，schema 沒有 visits 關聯）
    const [baseCustomers, total] = await Promise.all([
      prisma.workshopCustomer.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          line_id: true,
          tags: true,
          note: true,
          visit_count: true,
          last_visit: true,
          created_at: true,
        },
        orderBy: { updated_at: 'desc' },
        skip,
        take,
      }),
      prisma.workshopCustomer.count({ where }),
    ]);

    const customerIds = baseCustomers.map(c => c.id);
    const visits = customerIds.length
      ? await prisma.workshopCustomerVisit.findMany({
          where: { customer_id: { in: customerIds } },
          select: {
            id: true,
            customer_id: true,
            created_at: true,
            status: true,
            service_type: true,
            summary: true,
            total_amount: true,
          },
          orderBy: { created_at: 'desc' },
        })
      : [];
    const visitsByCustomer = {};
    for (const v of visits) {
      const list = visitsByCustomer[v.customer_id] || (visitsByCustomer[v.customer_id] = []);
      if (list.length < 5) list.push(v);
    }
    const customers = baseCustomers.map(c => ({ ...c, visits: visitsByCustomer[c.id] || [] }));

    // 取得所有標籤（給前端篩選用）
    const allCustomers = await prisma.workshopCustomer.findMany({
      where: { workshop_id: workshopId },
      select: { tags: true },
    });
    const allTags = [...new Set(allCustomers.flatMap(c => c.tags || []))].sort();

    res.json({
      customers,
      all_tags: allTags,
      pagination: {
        page: pageNum,
        pageSize: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    });
  } catch (error) {
    console.error('取得客戶列表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/garage/customers — 新增客戶
router.post('/', async (req, res) => {
  try {
    const { name, phone, lineId, tags, note } = req.body;
    
    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: '姓名與電話為必填' });
    }

    // 檢查電話是否重複
    const existing = await prisma.workshopCustomer.findFirst({
      where: { workshop_id: req.workshopId, phone: phone.trim() },
    });
    if (existing) {
      return res.status(400).json({ error: '此電話已被登記' });
    }

    const customer = await prisma.workshopCustomer.create({
      data: {
        workshop_id: req.workshopId,
        name: name.trim(),
        phone: phone.trim(),
        line_id: lineId?.trim() || null,
        tags: tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        note: note?.trim() || null,
        visit_count: 0,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('新增客戶失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/garage/customers/:id — 更新客戶
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, lineId, tags, note } = req.body;

    const customer = await prisma.workshopCustomer.findFirst({
      where: { id, workshop_id: req.workshopId },
    });
    if (!customer) return res.status(404).json({ error: '客戶不存在' });

    // 檢查電話是否與其他客戶重複
    if (phone && phone.trim() !== customer.phone) {
      const existing = await prisma.workshopCustomer.findFirst({
        where: { workshop_id: req.workshopId, phone: phone.trim(), id: { not: id } },
      });
      if (existing) return res.status(400).json({ error: '此電話已被其他客戶使用' });
    }

    const updated = await prisma.workshopCustomer.update({
      where: { id },
      data: {
        name: name?.trim() || customer.name,
        phone: phone?.trim() || customer.phone,
        line_id: lineId?.trim() || null,
        tags: tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        note: note?.trim() || null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('更新客戶失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/garage/customers/:id — 刪除客戶
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const customer = await prisma.workshopCustomer.findFirst({
      where: { id, workshop_id: req.workshopId },
    });
    if (!customer) return res.status(404).json({ error: '客戶不存在' });

    await prisma.workshopCustomer.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('刪除客戶失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// 當 ServiceRecord 完成時，自動更新客戶來車資料（由 garageServiceRecords 調用）
// 這裡提供一個內部函數供其他模組呼叫
async function recordVisit(workshopId, customerId, visitData) {
  const { status, service_type, summary, total_amount } = visitData;
  
  await prisma.$transaction([
    // 更新客戶統計
    prisma.workshopCustomer.update({
      where: { id: customerId, workshop_id: workshopId },
      data: {
        visit_count: { increment: 1 },
        last_visit: new Date(),
        visits: {
          create: {
            status,
            service_type,
            summary,
            total_amount: total_amount || 0,
          },
        },
      },
    }),
    // 如果有 LINE ID，可在此發送通知（略）
  ]);
}

module.exports = router;