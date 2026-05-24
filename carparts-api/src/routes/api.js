const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 測試用
router.get('/ping', (req, res) => {
  res.json({ message: 'API service is running' });
});

// ==========================================
// 公用資料 API (無需權限即可存取)
// ==========================================

// 0. 取得所有年份 (Years) - ✅ 這是為了解決 404 新增的
router.get('/years', async (req, res) => {
  try {
    // 撈取資料庫中所有車型的起始與結束年份
    const variants = await prisma.vehicleVariant.findMany({
      select: { year_start: true, year_end: true }
    });
    
    // 使用 Set 來過濾重複的年份
    const yearSet = new Set();
    variants.forEach(v => {
      if (v.year_start) yearSet.add(v.year_start);
      if (v.year_end) yearSet.add(v.year_end);
    });
    
    // 轉換成陣列，並從大到小排序 (新到舊)
    const years = Array.from(yearSet).sort((a, b) => b - a);
    res.json(years);
  } catch (error) {
    console.error('API /years 錯誤:', error);
    res.status(500).json({ error: '無法取得年份列表' });
  }
});

// 1. 取得所有製造商 (Makes)
// 支援 ?year=2010 篩選
router.get('/makes', async (req, res) => {
  try {
    const { year } = req.query;
    if (year) {
      const targetYear = Number(year);
      // 找出該年份有生產的車款所屬的廠牌
      const makes = await prisma.$queryRaw`
        SELECT DISTINCT m.id, m.name
        FROM "makes" m
        INNER JOIN "models" mo ON mo.make_id = m.id
        INNER JOIN "vehicle_variants" v ON v.model_id = mo.id
        WHERE ${targetYear} >= v.year_start AND ${targetYear} <= v.year_end
        ORDER BY m.name ASC
      `;
      return res.json(makes);
    }
    
    const makes = await prisma.makes.findMany({ orderBy: { name: 'asc' } });
    res.json(makes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch makes' });
  }
});

// 2. 取得車系 (Models)
router.get('/models', async (req, res) => {
  try {
    const makeId = Number(req.query.makeId);
    if (!makeId) return res.json([]);

    const models = await prisma.models.findMany({
      where: { make_id: makeId },
      orderBy: { name: 'asc' }
    });
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// 3. 取得變體/引擎 (Variants)
// 這是 "車型鎖定" 功能的核心資料來源
router.get('/variants', async (req, res) => {
  try {
    const modelId = Number(req.query.modelId);
    const year = req.query.year ? Number(req.query.year) : null;

    if (!modelId) return res.json([]);

    const where = { model_id: modelId };
    if (year) {
      where.year_start = { lte: year };
      where.year_end = { gte: year };
    }

    const variants = await prisma.vehicleVariant.findMany({
      where,
      orderBy: { id: 'asc' }
    });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

module.exports = router;