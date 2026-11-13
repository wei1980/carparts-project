// src/routes/consumerParts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const modificationService = require('../services/modificationService');
const { consumerPartRecommendationCacheMiddleware } = require('../middleware/cacheMiddleware');

const prisma = require('../lib/prisma');
router.use(auth);

// 🔒 消費者端零件欄位白名單。
//    Part 同一列同時有 msrp_price（售價）與 wholesale_price（車廠批發成本）。
//    任何未投影的查詢（findMany 不帶 select / include: { part: true }）都會把成本價
//    回給消費者。新增欄位到消費者回應前，必須先在這裡登記。
//    ⚠️ 不要加入 wholesale_price。
const CONSUMER_PART_SELECT = {
  id: true,
  name: true,
  brand: true,
  // 🔒 料號（SKU）是車廠專屬欄位（防比價：避免會員拿料號去供應商官網比價）。
  //    匿名端點 app.js /api/parts/recommended 一律不回傳；消費者端點必須與之一致。
  msrp_price: true,
  stock_qty: true,
  distributor_stock_qty: true,
  preorder_lead_time_days: true,
  image_url: true,
  description: true,
  category: true,
  subcategory_id: true,
  is_universal: true,
  is_official: true,
  is_active: true,
  sales_count: true,
  view_count: true,
  created_at: true,
  updated_at: true,
};

router.get('/recommended', consumerPartRecommendationCacheMiddleware(300), async (req, res) => {
  try {
    const { vehicleId, variantId, category, subcategory, search } = req.query;
    // 🆕 分頁 + 排序參數
    const { page, pageSize, sort } = req.query;

    const where = { is_active: true };
    const conditions = [];
    let fallbackVehicleUsed = false;
    let limitedNoVehicle = false;

    // 🔒 強制車型範圍：客戶只能看到自己愛車相容的零件（+通用件）
    // 防止競爭對手未綁車輛就大量撈取全站資料
    let vehicle = null;
    if (vehicleId) {
      vehicle = await prisma.vehicleProfile.findFirst({
        where: { id: vehicleId, userId: req.userId },
      });
    }
    // 🆕 前端 Shop 頁傳 variantId（車型變體 ID）→ 找該用戶對應的愛車檔案
    if (!vehicle && variantId) {
      const vid = Number(variantId);
      if (Number.isInteger(vid) && vid > 0) {
        vehicle = await prisma.vehicleProfile.findFirst({
          where: { userId: req.userId, variantId: vid },
        });
      }
    }
    if (!vehicle) {
      // 未選車或車輛不屬於該用戶 → 自動退回用戶的第一台愛車
      vehicle = await prisma.vehicleProfile.findFirst({
        where: { userId: req.userId },
        orderBy: { id: 'asc' },
      });
      // 標記 fallback，讓前端可提示「已自動切換為您的愛車」
      fallbackVehicleUsed = !!vehicle;
    }
    if (!vehicle) {
      // 用戶完全沒有愛車 → 只允許關鍵字搜尋，且限制結果數，防止大量撈取
      if (!search || !String(search).trim()) {
        return res.status(400).json({ error: '請先在「我的愛車」新增車輛，才能瀏覽與搜尋零件' });
      }
      conditions.push({ is_universal: true }); // 無車時僅顯示通用件 + 關鍵字過濾
      limitedNoVehicle = true;
    }

    if (search) {
      const s = String(search).trim();
      conditions.push({
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { brand: { contains: s, mode: 'insensitive' } },
          { sku: { contains: s, mode: 'insensitive' } },
        ],
      });
    }

    if (subcategory) {
      where.subcategory_id = parseInt(subcategory);
    } else if (category) {
      conditions.push({
        OR: [
          { subcategory: { category: { name: { equals: category, mode: 'insensitive' } } } },
          { parts_on_categories: { some: { category: { name: { equals: category, mode: 'insensitive' } } } } },
        ],
      });
    }

    // 🆕 車型篩選（此時 vehicle 一定存在，除非走無車限流路徑）
    if (vehicle) {
        // 🆕 通用型零件（is_universal）在任何車型篩選下都會出現
        const universalOr = { is_universal: true };

        // 先嘗試用 variantId
        if (vehicle.variantId) {
          conditions.push({
            OR: [
              universalOr,
              { compatible_vehicles: { some: { vehicle_id: vehicle.variantId } } },
            ],
          });
        }
        // 否則用 make + model + generation 找匹配的車型
        else if (vehicle.make && vehicle.model) {
          const vWhere = {
            make: { equals: vehicle.make, mode: 'insensitive' },
            model: { equals: vehicle.model, mode: 'insensitive' },
          };
          if (vehicle.generation) {
            vWhere.generation = { equals: vehicle.generation, mode: 'insensitive' };
          }
          if (vehicle.year) {
            vWhere.year_start = { lte: vehicle.year };
            vWhere.year_end = { gte: vehicle.year };
          }

          const matched = await prisma.vehicleVariant.findMany({
            where: vWhere,
            select: { id: true },
          });
          const ids = matched.map(v => v.id);
          if (ids.length > 0) {
            conditions.push({
              OR: [
                universalOr,
                { compatible_vehicles: { some: { vehicle_id: { in: ids } } } },
              ],
            });
          } else {
            // 找不到對應車型 → 只顯示通用件（避免空白頁）
            conditions.push(universalOr);
          }
        }
    }

    if (conditions.length > 0) where.AND = conditions;

    // 🆕 分頁：有傳 page 才分頁；未傳維持舊行為（take 50，相容舊前端）
    const pageNum = page ? Math.max(1, parseInt(page) || 1) : null;
    const take = pageNum ? Math.min(Math.max(parseInt(pageSize) || 12, 1), 50) : 50;
    const skip = pageNum ? (pageNum - 1) * take : 0;

    // 🆕 排序（🔥 hot＝熱門：銷量 → 點閱 → 新品優先）
    const orderByMap = {
      hot: [{ sales_count: 'desc' }, { view_count: 'desc' }, { id: 'desc' }],
      newest: { id: 'desc' },
      oldest: { id: 'asc' },
      price_asc: { msrp_price: 'asc' },
      price_desc: { msrp_price: 'desc' },
      name: { name: 'asc' },
    };
    const orderBy = orderByMap[sort] || orderByMap.newest;

    // 🔒 取得改裝聯動推薦零件
    //    一律使用顯式 select 白名單：Part 同一列有 msrp_price 與 wholesale_price，
    //    未投影的 findMany 會把成本價一起回給消費者（先前實測回傳 wholesale_price: 7000）。
    let modificationParts = [];
    if (vehicle) {
      const vehicleProfile = await prisma.vehicleProfile.findUnique({
        where: { id: vehicle.id },
        include: { modifications_detail: true }
      });
      if (vehicleProfile && vehicleProfile.modifications_detail.length > 0) {
        const affected = await modificationService.getAffectedParts(vehicleProfile.modifications_detail);
        // 過濾出 matched = true 的，並提取 targetPart id
        const matchedTargetIds = affected
          .filter(f => f.matched !== false) // 包含 matched=true 或無 fitmentRule
          .map(f => f.targetPart.id);
        
        // 將這些零件加入查詢條件（加權顯示）
        if (matchedTargetIds.length > 0) {
          modificationParts = await prisma.part.findMany({
            where: { id: { in: matchedTargetIds }, is_active: true },
            select: CONSUMER_PART_SELECT
          });
        }
      }
    }

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        select: {
          ...CONSUMER_PART_SELECT,
          subcategory: { select: { id: true, name: true, category_id: true, category: { select: { id: true, name: true } } } },
        },
        orderBy,
        skip,
        take,
      }),
      prisma.part.count({ where }),
    ]);

    // 🆕 合併改裝專用零件到結果前端（去重）
    const modPartIds = new Set(modificationParts.map(p => p.id));
    const combinedParts = [
      ...modificationParts.map(p => ({ ...p, isModificationMatch: true })),
      ...parts.filter(p => !modPartIds.has(p.id))
    ].slice(0, take); // 保持分頁大小

    res.json({
      parts: combinedParts,
      total,
      // 🆕 有分頁時回傳 pagination 資訊
      ...(pageNum ? {
        pagination: {
          page: pageNum,
          pageSize: take,
          total,
          totalPages: Math.max(1, Math.ceil(total / take)),
        },
      } : {}),
      // 🔒 車型範圍提示（前端可顯示「已自動切換為您的愛車」）
      ...(fallbackVehicleUsed ? { fallbackVehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model } } : {}),
      ...(limitedNoVehicle ? { noVehicleLimited: true } : {}),
      // 🆕 改裝匹配資訊
      modificationMatches: modificationParts.length > 0 ? {
        count: modificationParts.length,
        message: `根據您的改裝配置，為您優先推薦 ${modificationParts.length} 項相容零件`
      } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '查詢失敗',  });
  }
});

// 🆕 取得特定車輛的改裝專用零件推薦
router.get('/modification-parts/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { targetPartType } = req.query;
    
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: vehicleId, userId: req.userId },
      include: { modifications_detail: true }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const recommendations = await modificationService.getModificationRecommendations(
      vehicleId, 
      targetPartType
    );

    res.json({ parts: recommendations });
  } catch (error) {
    console.error('取得改裝專用零件失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// 🆕 檢查零件與車輛改裝相容性
router.get('/check-compatibility/:vehicleId/:partId', async (req, res) => {
  try {
    const { vehicleId, partId } = req.params;
    
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: vehicleId, userId: req.userId }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const result = await modificationService.checkCompatibility(vehicleId, parseInt(partId));
    res.json(result);
  } catch (error) {
    console.error('檢查相容性失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;