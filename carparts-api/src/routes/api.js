// src/routes/api.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');

// 測試用
router.get('/ping', (req, res) => {
  res.json({ message: 'API service is running' });
});

// ==========================================
// 公用資料 API (無需權限即可存取)
// ==========================================

// 0. 取得所有年份
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

// 1. 取得所有廠牌 (Makes)
router.get('/makes', async (req, res) => {
  try {
    const { year } = req.query;
    let whereClause = {};

    // 如果有傳年份，根據年份區間過濾
    if (year) {
      const targetYear = Number(year);
      whereClause = {
        year_start: { lte: targetYear },
        year_end: { gte: targetYear }
      };
    }

    // 🟢 從 vehicleVariant 抓取唯一廠牌
    const makes = await prisma.vehicleVariant.findMany({
      where: whereClause,
      select: { make: true },    // 只抓廠牌欄位
      distinct: ['make'],        // 去除重複廠牌
      orderBy: { make: 'asc' },
    });
    
    // 回傳純字串陣列 (與車大師其他 API 格式統一)
    res.json(makes.map(m => m.make));
  } catch (error) {
    console.error('API /makes 錯誤:', error);
    res.status(500).json({ error: '無法取得廠牌列表' });
  }
});

// 2. 取得車系 (Models)
router.get('/models', async (req, res) => {
  try {
    const { make, year } = req.query;
    if (!make) return res.status(400).json({ error: '請提供 make 參數' });

    let whereClause = { make: String(make) };

    if (year) {
      const targetYear = Number(year);
      whereClause.year_start = { lte: targetYear };
      whereClause.year_end = { gte: targetYear };
    }

    // 🟢 從 vehicleVariant 抓取唯一的車系
    const models = await prisma.vehicleVariant.findMany({
      where: whereClause,
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    });

    res.json(models.map(m => m.model));
  } catch (error) {
    console.error('API /models 錯誤:', error);
    res.status(500).json({ error: '無法取得車系列表' });
  }
});

// 3. 取得引擎/世代變體 (Variants)
router.get('/variants', async (req, res) => {
  try {
    const { make, model, year } = req.query;
    if (!make || !model) return res.status(400).json({ error: '請提供 make 和 model 參數' });

    let whereClause = { 
      make: String(make), 
      model: String(model) 
    };

    if (year) {
      const targetYear = Number(year);
      whereClause.year_start = { lte: targetYear };
      whereClause.year_end = { gte: targetYear };
    }

    // 🟢 回傳該車系下的所有變體 (包含 id, generation, engine_code, 年份)
    const variants = await prisma.vehicleVariant.findMany({
      where: whereClause,
      orderBy: { year_start: 'asc' },
    });

    res.json(variants);
  } catch (error) {
    console.error('API /variants 錯誤:', error);
    res.status(500).json({ error: '無法取得變體列表' });
  }
});

// ==========================================
// 🟢 車輛管理 API (放在 module.exports = router; 之前)
// ==========================================

// 🟢 更新特定車輛的車牌與車身號碼（需登入且限本人車輛）
router.put('/vehicles/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;         // 從網址取得車輛 ID (字串格式)
    const { vin, licensePlate } = req.body; // 從請求主體取得新資料

    // 驗證是否有傳入資料
    if (vin === undefined && licensePlate === undefined) {
      return res.status(400).json({ error: '缺少更新的欄位資料' });
    }

    // 🔐 先確認車輛存在且屬於當前登入用戶（防水平越權）
    const owned = await prisma.vehicleProfile.findFirst({
      where: { id: String(id), userId: req.userId },
      select: { id: true },
    });
    if (!owned) {
      return res.status(404).json({ error: '找不到該筆車輛資料' });
    }

    // ✅ 使用正確的 Prisma 模型名稱：VehicleProfile
    const updatedVehicle = await prisma.vehicleProfile.update({
      where: { id: String(id) }, // 確保 ID 是字串 (因為您的 schema 是 String @id @default(uuid()))
      data: {
        vin: vin || null,              // 如果前端傳空字串，存為 null
        licensePlate: licensePlate || null,
      },
    });

    console.debug('✅ 車輛資料更新成功:', updatedVehicle.id);
    res.json(updatedVehicle);
  } catch (error) {
    console.error('API PUT /vehicles/:id 錯誤:', error);
    
    // Prisma 找不到該 ID 的錯誤代碼 (P2025 代表 Record not found)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '找不到該筆車輛資料，可能已被刪除' });
    }
    
    // 其他伺服器內部錯誤
    res.status(500).json({ error: '更新車輛失敗，請稍後再試' });
  }
});

module.exports = router;