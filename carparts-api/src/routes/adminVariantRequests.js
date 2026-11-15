// src/routes/adminVariantRequests.js — 管理端：註冊被擋的車型清單
//
// 方案 A 的後勤配套：客戶註冊時若車型庫找不到車型，會被擋下並寫入
// vehicle_variant_requests。這個端點讓管理者：
//   - 看到「待補車型」清單（依重複次數排序，最熱門的排前面）
//   - 補完車型後標記 RESOLVED，作為追蹤依據
//   - 誤報或不需要的標 DISMISSED
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');

router.use(adminAuth);

// GET /api/admin/variant-requests — 待補車型清單
// query: status=PENDING|RESOLVED|DISMISSED|ALL, q=關鍵字, page, pageSize
router.get('/', async (req, res) => {
  try {
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const where = {};
    if (status !== 'ALL') where.status = status;
    if (q) {
      where.OR = [
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.vehicleVariantRequest.findMany({
        where,
        orderBy: [{ request_count: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vehicleVariantRequest.count({ where }),
    ]);

    // 依車型聚合（不同客戶報同一台車時合併顯示，比較看得出熱門缺口）
    const grouped = new Map();
    for (const r of rows) {
      const key = `${r.make}|${r.model}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          make: r.make,
          model: r.model,
          years: new Set(),
          engines: new Set(),
          total_requests: 0,
          requesters: 0,
        });
      }
      const g = grouped.get(key);
      g.total_requests += r.request_count;
      g.requesters += 1;
      if (r.year) g.years.add(r.year);
      if (r.engine_code) g.engines.add(r.engine_code);
    }

    res.json({
      rows,
      grouped: [...grouped.values()].map((g) => ({
        make: g.make,
        model: g.model,
        years: [...g.years].sort(),
        engines: [...g.engines].slice(0, 8),
        total_requests: g.total_requests,
        requesters: g.requesters,
      })),
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('取得待補車型失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/variant-requests/:id — 標記狀態
// body: { status: 'RESOLVED' | 'DISMISSED' | 'PENDING', note? }
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID 不正確' });

    const { status, note } = req.body || {};
    const allowed = ['PENDING', 'RESOLVED', 'DISMISSED'];
    if (!allowed.includes(String(status || '').toUpperCase())) {
      return res.status(400).json({ error: '狀態僅接受 PENDING / RESOLVED / DISMISSED' });
    }
    const st = String(status).toUpperCase();

    const existing = await prisma.vehicleVariantRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: '紀錄不存在' });

    const updated = await prisma.vehicleVariantRequest.update({
      where: { id },
      data: {
        status: st,
        resolved_at: st === 'RESOLVED' ? new Date() : null,
        ...(note ? { note: String(note).slice(0, 500) } : {}),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('更新待補車型失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;