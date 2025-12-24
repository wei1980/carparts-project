const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 引入 Service 和 Middleware
const inventoryService = require('../services/inventoryService');
const checkQueryQuota = require('../middleware/quota');

// 路由測試
router.get('/ping', (req, res) => res.json({ msg: 'shop pong' }));

/**
 * GET /shop/parts
 * 前台搜尋零件 API (取代舊的 GET /parts)
 * 支援：關鍵字搜尋、車型鎖定、分類篩選、配額限制
 */
router.get('/parts', checkQueryQuota, async (req, res) => {
  try {
    const { 
      q,              // 關鍵字
      variant_id,     // 車型鎖定 (重要!)
      category_id,    // 分類
      page = 1, 
      limit = 20 
    } = req.query;

    const pageNum = Number(page) || 1;
    const pageSize = Number(limit) || 20;
    const skip = (pageNum - 1) * pageSize;

    // 建構查詢條件
    const where = { is_active: true };

    // 1. 關鍵字搜尋 (SKU, Name, Brand)
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } }
      ];
    }

    // 2. 車型鎖定 (透過關聯表)
    if (variant_id) {
      where.compatible_vehicles = {
        some: {
          vehicle_id: Number(variant_id)
        }
      };
    }

    // 3. 分類篩選
    if (category_id) {
        // 這裡假設 category_main 存的是 ID 或名稱，需視您 schema 而定
        // 若 schema 關聯尚未建立，暫時先略過
    }

    // 執行查詢
    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
        // 預先載入關聯 (如果需要)
        // include: { compatible_vehicles: true } 
      }),
      prisma.part.count({ where })
    ]);

    // 格式化資料 (注入商業邏輯)
    // 假設 req.user 來自 auth middleware
    const userRole = req.user ? req.user.role : 'TRIAL';
    const formattedParts = parts.map(p => inventoryService.formatPartForClient(p, userRole));

    res.json({
      data: formattedParts,
      meta: {
        total,
        page: pageNum,
        limit: pageSize,
        quota_remaining: res.locals.quotaRemaining // 回傳剩餘配額
      }
    });

  } catch (error) {
    console.error('Search Parts Error:', error);
    res.status(500).json({ error: '搜尋失敗' });
  }
});

module.exports = router;