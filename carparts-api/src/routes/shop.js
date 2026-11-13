const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
// 🔒 可選車廠辨識（決定是否回傳批發價/料號）
const optionalGarageAuth = require('../middleware/optionalGarageAuth');

// 如果你有用到這兩個檔案，請保留；如果測試時報錯說找不到檔案，可以先加上註解
// const inventoryService = require('../services/inventoryService');
// const checkQueryQuota = require('../middleware/quota');

// 路由測試
router.get('/ping', (req, res) => res.json({ msg: 'shop pong' }));

/**
 * GET /shop/parts 或 /parts
 * 前台搜尋零件 API
 */
// 註：這裡我先拿掉 checkQueryQuota，確保你最基本的查詢能通。若你需要配額功能，確認沒問題後可再把 checkQueryQuota 加回中間件
router.get('/parts', optionalGarageAuth, async (req, res) => {
  try {
    // 1. 接收參數（名稱必須與前端 Shop.jsx 完全一致）
    const { 
      q,              
      variantId,      // 前端傳 variantId
      categoryId,     // 前端傳 categoryId
      subcategoryId,  // 前端傳 subcategoryId
      page = 1, 
      pageSize = 24   // 前端傳 pageSize
    } = req.query;

    const pageNum = Number(page) || 1;
    // 🔒 pageSize 必須有上限：先前無上限時，單一匿名請求
    //    GET /shop/parts?pageSize=999999 會回傳 12,922 筆 / 249 MB / 耗時 10 秒，
    //    等於把整包商品資料開放給任何人一次撈走，同時讓 API 吃 CPU 與記憶體。
    const take = Math.min(Math.max(Number(pageSize) || 24, 1), 100);
    const skip = (pageNum - 1) * take;

    // 建構查詢條件
    const where = { is_active: true };

    // 2. 關鍵字搜尋 (SKU, Name, Brand)
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } }
      ];
    }

    // 3. 車型鎖定 (透過 PartCompatibility 關聯表)
    if (variantId) {
      where.compatible_vehicles = {
        some: {
          vehicle_id: Number(variantId)
        }
      };
    }

    // 4. 分類篩選 (對應 schema 的 subcategory_id)
    if (subcategoryId) {
      where.subcategory_id = Number(subcategoryId);
    } else if (categoryId) {
      // 如果只點擊了主分類，透過關聯尋找底下所有子分類的零件
      where.subcategory = {
        category_id: Number(categoryId)
      };
    }

    // 5. 執行查詢與總數計算 (平行處理提升效能)
        const [parts, total] = await Promise.all([
          prisma.part.findMany({
            where,
            skip,
            take,
            orderBy: { id: 'desc' },
            include: { 
              subcategory: true,
              compatible_vehicles: { include: { vehicle: true } }
            }
          }),
          prisma.part.count({ where })
        ]);

    // 格式化資料 (若你有保留 inventoryService 可取消下方註解使用)
    // const userRole = req.user ? req.user.role : 'TRIAL';
    // const formattedParts = parts.map(p => inventoryService.formatPartForClient(p, userRole));

    // 6. 回傳前端 Shop.jsx 期望的格式
    // 🔒 車廠專屬欄位過濾：批發價/料號不給匿名與一般車主（防比價）
    const items = req.isGarage ? parts : parts.map(({ sku, wholesale_price, ...rest }) => rest);
    res.json({
      items,
      total: total,
      page: pageNum,
      limit: take
    });

  } catch (error) {
    // 詳細印出錯誤，方便我們 Debug（不回傳給客戶端，防內部資訊外洩）
    console.error('API /shop/parts 錯誤:', error);
    res.status(500).json({ error: '搜尋零件失敗' });
  }
});

module.exports = router;