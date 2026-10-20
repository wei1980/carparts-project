// src/routes/adminAirFilterMatch.js
// 空濾相容查詢 Admin API：/api/admin/air-filters/match

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { findCompatibleVehicles } = require('../services/airFilterMatching');
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

const prisma = new PrismaClient();

// 所有路由需登入 + admin 權限
router.use(auth);
router.use(adminAuth);

/**
 * POST /api/admin/air-filters/match
 * 查詢指定規格的相容空濾零件
 * 
 * Request body:
 * {
 *   "partId": 123,                    // 可選：直接用 partId 取 specs
 *   "specs": {                        // 可選：直接傳規格（若未傳 partId）
 *     "make": "BMW",
 *     "model": "M5",
 *     "generation": "F90",
 *     "engine_code": "S63B44T4",
 *     "displacement_cc": 4395,
 *     "horsepower_ps": 600,
 *     "year_range": "2018-2023"
 *   },
 *   "maxResults": 50,                 // 可選，預設 50
 *   "scoreThreshold": 80              // 可選，預設 80
 * }
 * 
 * Response:
 * {
 *   "count": 12,
 *   "vehicles": [
 *     {
 *       "vehicleId": 1234,
 *       "vehicle": { "make": "BMW", "model": "M5", "generation": "F90", "year": 2020, ... },
 *       "matchStrategy": "exact_engine_fuzzy_model_gen",
 *       "matchScore": 113,
 *       "details": { "modelSimilarity": 1, "genSimilarity": 0.6, "engineMatch": true, "dispMatch": true, "hpMatch": true }
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/match', async (req, res) => {
  try {
    const { partId, specs, maxResults = 50, scoreThreshold = 80 } = req.body;

    let sourceSpecs = specs;

    // 若提供 partId，從資料庫讀取 part.specs
    if (!sourceSpecs && partId) {
      const part = await prisma.part.findUnique({
        where: { id: parseInt(partId) },
        select: { specs: true, make: true, model: true, brand: true, sku: true },
      });
      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }
      sourceSpecs = part.specs;
      if (!sourceSpecs) {
        return res.status(400).json({ error: 'Part has no specs for matching' });
      }
      // 確保 make/model 存在（specs 裡可能沒有）
      if (!sourceSpecs.make) sourceSpecs.make = part.make;
      if (!sourceSpecs.model) sourceSpecs.model = part.model;
    }

    if (!sourceSpecs || !sourceSpecs.make || !sourceSpecs.model) {
      return res.status(400).json({ 
        error: '需提供 specs.make/model 或 partId（且 part 必須有 specs）' 
      });
    }

    const results = await findCompatibleVehicles(sourceSpecs, { 
      maxResults: parseInt(maxResults), 
      scoreThreshold: parseInt(scoreThreshold) 
    });

    res.json({ count: results.length, vehicles: results });
  } catch (error) {
    console.error('[air-filter-match] error:', error);
    res.status(500).json({ error: '查詢失敗', detail: error.message });
  }
});

/**
 * GET /api/admin/air-filters/match/part/:partId
 * 便利端點：直接用 partId 查詢
 */
router.get('/match/part/:partId', async (req, res) => {
  try {
    const partId = parseInt(req.params.partId);
    const { maxResults = 50, scoreThreshold = 80 } = req.query;

    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { specs: true, make: true, model: true, brand: true, sku: true },
    });
    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }
    if (!part.specs) {
      return res.status(400).json({ error: 'Part has no specs for matching' });
    }

    const sourceSpecs = { ...part.specs };
    if (!sourceSpecs.make) sourceSpecs.make = part.make;
    if (!sourceSpecs.model) sourceSpecs.model = part.model;

    const results = await findCompatibleVehicles(sourceSpecs, { 
      maxResults: parseInt(maxResults), 
      scoreThreshold: parseInt(scoreThreshold) 
    });

    res.json({ count: results.length, vehicles: results, part: { id: part.id, sku: part.sku, brand: part.brand } });
  } catch (error) {
    console.error('[air-filter-match] error:', error);
    res.status(500).json({ error: '查詢失敗', detail: error.message });
  }
});

/**
 * GET /api/admin/air-filters/match/vehicle/:vehicleId
 * 反向查詢：給 vehicleId，找出所有相容的空濾零件
 */
router.get('/match/vehicle/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const { brand, category = '濾芯' } = req.query;

    const vehicle = await prisma.vehicleVariant.findUnique({
      where: { id: vehicleId },
      select: { id: true, make: true, model: true, generation: true, engine_code: true, specs: true, year_start: true, year_end: true },
    });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // 找出該車型的所有相容零件
    const where = {
      vehicle_id: vehicleId,
      part: {
        is_active: true,
        subcategory: { category: { name: category } },
      },
    };
    if (brand) where.part.brand = { equals: brand, mode: 'insensitive' };

    const compat = await prisma.partCompatibility.findMany({
      where,
      include: {
        part: {
          select: { id: true, sku: true, name: true, brand: true, msrp_price: true, wholesale_price: true, stock_qty: true, image_url: true, specs: true },
        },
      },
      orderBy: { part: { brand: 'asc' } },
    });

    res.json({ 
      count: compat.length, 
      vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, generation: vehicle.generation },
      parts: compat.map(c => c.part) 
    });
  } catch (error) {
    console.error('[air-filter-match-vehicle] error:', error);
    res.status(500).json({ error: '查詢失敗', detail: error.message });
  }
});

module.exports = router;