// src/routes/adminVehicleVariants.js
// 車型管理 API - 提供同引擎同世代車型查詢
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

const prisma = require('../lib/prisma');
router.use(adminAuth);

/**
 * GET /api/admin/variants/engine-generation-group
 * 查詢同廠牌同車系同引擎同世代的車型群組（依驅動類型分組）
 * Query: make, model, generation, engine_code, exclude_variant_id?
 */
router.get('/engine-generation-group', async (req, res) => {
  try {
    const { make, model, generation, engine_code, exclude_variant_id } = req.query;
    
    if (!make || !model || !generation || !engine_code) {
      return res.status(400).json({ 
        error: '缺少必要參數: make, model, generation, engine_code' 
      });
    }

    const where = {
      make,
      model,
      generation,
      engine_code,
      is_approved: true,
    };

    if (exclude_variant_id) {
      where.id = { not: parseInt(exclude_variant_id) };
    }

    const variants = await prisma.vehicleVariant.findMany({
      where,
      select: {
        id: true,
        make: true,
        model: true,
        generation: true,
        engine_code: true,
        variant_name: true,
        year_start: true,
        year_end: true,
        drive_type: true,
        specs: true,
      },
      orderBy: [
        { drive_type: 'asc' },
        { year_start: 'desc' },
      ],
    });

    // 依驅動類型分組
    const grouped = variants.reduce((acc, v) => {
      const driveType = v.drive_type || 'UNKNOWN';
      if (!acc[driveType]) {
        acc[driveType] = [];
      }
      acc[driveType].push(v);
      return acc;
    }, {});

    // 格式化回應
    const driveTypeLabels = {
      'FWD': '前驅 (FWD)',
      'RWD': '後驅 (RWD)', 
      'AWD': '四驅/全時四驅 (AWD)',
      '4WD': '分時四驅 (4WD)',
      'NULL': '未指定',
    };

    const result = Object.entries(grouped).map(([driveType, variants]) => ({
      drive_type: driveType,
      drive_type_label: driveTypeLabels[driveType] || driveType,
      count: variants.length,
      variants: variants.map(v => ({
        id: v.id,
        variant_name: v.variant_name,
        year_range: `${v.year_start}-${v.year_end || 'present'}`,
        drive_type: v.drive_type,
      })),
    }));

    res.json({
      make,
      model,
      generation,
      engine_code,
      groups: result,
      total_count: variants.length,
    });
  } catch (error) {
    console.error('查詢同引擎同世代車型失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

/**
 * POST /api/admin/variants/batch-compatibility
 * 批次查詢多個零件的相容車型（用於批次套用預覽）
 */
router.post('/batch-compatibility', async (req, res) => {
  try {
    const { part_ids } = req.body;
    
    if (!Array.isArray(part_ids) || part_ids.length === 0) {
      return res.status(400).json({ error: 'part_ids 為必填陣列' });
    }

    const compatibilities = await prisma.partCompatibility.findMany({
      where: {
        part_id: { in: part_ids },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            generation: true,
            engine_code: true,
            drive_type: true,
            variant_name: true,
            year_start: true,
            year_end: true,
          },
        },
        part: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    // 依零件分組
    const byPart = {};
    compatibilities.forEach(c => {
      if (!byPart[c.part_id]) byPart[c.part_id] = [];
      byPart[c.part_id].push({
        vehicle: c.vehicle,
        part: c.part,
      });
    });

    res.json({ compatibilities: byPart });
  } catch (error) {
    console.error('批次查詢相容車型失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * GET /api/admin/variants
 * List all vehicle variants — for admin "compatible vehicles" selection UI.
 * Supports: status (all|active), limit (0 = all), search
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'active', limit = 500, search = '' } = req.query;
    const where = {};

    if (status !== 'all') {
      where.is_approved = true;
    }

    if (search) {
      where.OR = [
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { generation: { contains: search, mode: 'insensitive' } },
        { variant_name: { contains: search, mode: 'insensitive' } },
        { engine_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = parseInt(limit) === 0 ? undefined : parseInt(limit);

    const variants = await prisma.vehicleVariant.findMany({
      where,
      take,
      select: {
        id: true,
        make: true,
        model: true,
        generation: true,
        engine_code: true,
        variant_name: true,
        year_start: true,
        year_end: true,
        drive_type: true,
      },
      orderBy: [{ make: 'asc' }, { model: 'asc' }, { year_start: 'desc' }],
    });

    res.json(variants);
  } catch (error) {
    console.error('載入車型失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;