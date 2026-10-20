// src/routes/adminParts.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { invalidateCache } = require('../middleware/cacheMiddleware');

const prisma = new PrismaClient();

router.use(adminAuth);

// ========== GET / （列表） ==========
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, subcategory, brand } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (subcategory) where.subcategory_id = parseInt(subcategory);
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        skip,
        take,
        include: {
          subcategory: { include: { category: true } },
          parts_on_categories: { include: { category: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.part.count({ where }),
    ]);
    res.json({ data: parts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('取得商品列表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ========== POST / （新增商品） ==========
router.post('/', async (req, res) => {
  try {
    const {
      sku,
      name,
      brand,
      description,
      msrp_price,
      wholesale_price,
      image_url,
      stock_qty,
      distributor_stock_qty,
      is_active,
      is_universal,
      subcategory_id,
      category_ids,
      compatible_vehicle_ids,
    } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: 'SKU 和名稱是必填欄位' });
    }

    // 檢查 SKU 唯一性
    const existing = await prisma.part.findUnique({ where: { sku } });
    if (existing) {
      return res.status(409).json({ error: 'SKU 已存在' });
    }

    const createData = {
      sku,
      name,
      brand: brand || '',
      description: description || '',
      msrp_price: msrp_price !== undefined ? parseFloat(msrp_price) : 0,
      wholesale_price: wholesale_price !== undefined ? parseFloat(wholesale_price) : 0,
      image_url: image_url || null,
      stock_qty: stock_qty !== undefined ? parseInt(stock_qty) : 0,
      distributor_stock_qty: distributor_stock_qty !== undefined ? parseInt(distributor_stock_qty) : 0,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      is_universal: Boolean(is_universal), // 🆕 通用型零件
    };

    // 子分類
    if (subcategory_id) {
      const subId = parseInt(subcategory_id);
      const sub = await prisma.subcategories.findUnique({
        where: { id: subId },
        include: { category: true },
      });
      if (!sub) return res.status(400).json({ error: '子分類不存在' });
      createData.subcategory_id = subId;
      createData.category = sub.category?.name || null;
    }

    // 建立零件
    const newPart = await prisma.part.create({ data: createData });

    // 主分類（多對多）
    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      const ids = category_ids.map(Number);
      for (const cid of ids) {
        const cat = await prisma.categories.findUnique({ where: { id: cid } });
        if (cat) {
          await prisma.partsOnCategories.create({
            data: { part_id: newPart.id, category_id: cid },
          });
        }
      }
    }

    // 相容車型
    if (compatible_vehicle_ids && Array.isArray(compatible_vehicle_ids) && compatible_vehicle_ids.length > 0) {
      const vids = compatible_vehicle_ids.map(Number);
      for (const vid of vids) {
        const vehicle = await prisma.vehicleVariant.findUnique({ where: { id: vid } });
        if (vehicle) {
          await prisma.partCompatibility.create({
            data: { part_id: newPart.id, vehicle_id: vid },
          });
        }
      }
    }

    // 回傳完整資料
    const fullPart = await prisma.part.findUnique({
      where: { id: newPart.id },
      include: {
        subcategory: { include: { category: true } },
        parts_on_categories: { include: { category: true } },
        compatible_vehicles: { include: { vehicle: true } },
      },
    });

    // 🆕 清除相關快取
    await invalidateCache(['part_data', 'compatibility', 'inventory', 'garage_list']);

    res.status(201).json(fullPart);
  } catch (error) {
    console.error('❌ 新增商品失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ========== GET /:id （詳情） ==========
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '無效的商品 ID' });

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        subcategory: { include: { category: true } },
        parts_on_categories: { include: { category: true } },
        compatible_vehicles: { include: { vehicle: true } },
      },
    });
    if (!part) return res.status(404).json({ error: '商品不存在' });
    res.json(part);
  } catch (error) {
    console.error('取得商品詳情失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ========== PATCH /:id （更新） ==========
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '無效的商品 ID' });

    const {
      sku,
      name,
      brand,
      description,
      msrp_price,
      wholesale_price,
      image_url,
      stock_qty,
      distributor_stock_qty,
      is_active,
      is_universal,
      subcategory_id,
      category_ids,
      compatible_vehicle_ids,
    } = req.body;

    console.debug('🔄 收到更新請求，零件 ID:', id);
    console.debug('📦 compatible_vehicle_ids:', compatible_vehicle_ids);

    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: '商品不存在' });

    if (sku && sku !== existing.sku) {
      const conflict = await prisma.part.findUnique({ where: { sku } });
      if (conflict) return res.status(409).json({ error: 'SKU 已存在' });
    }

    const updateData = {
      sku,
      name,
      brand,
      description,
      msrp_price: msrp_price !== undefined ? parseFloat(msrp_price) : undefined,
      wholesale_price: wholesale_price !== undefined ? parseFloat(wholesale_price) : undefined,
      image_url,
      stock_qty: stock_qty !== undefined ? parseInt(stock_qty) : undefined,
      distributor_stock_qty: distributor_stock_qty !== undefined ? parseInt(distributor_stock_qty) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      is_universal: is_universal !== undefined ? Boolean(is_universal) : undefined, // 🆕 通用型零件
    };

    if (subcategory_id !== undefined) {
      const subId = subcategory_id ? parseInt(subcategory_id) : null;
      if (subId !== null) {
        const sub = await prisma.subcategories.findUnique({ where: { id: subId }, include: { category: true } });
        if (!sub) return res.status(400).json({ error: '子分類不存在' });
        updateData.subcategory_id = subId;
        updateData.category = sub.category?.name || null;
      } else {
        updateData.subcategory_id = null;
        updateData.category = null;
      }
    }

    await prisma.part.update({ where: { id }, data: updateData });

    // ---------- 主分類（多對多） ----------
    if (category_ids !== undefined) {
      const newCategoryIds = Array.isArray(category_ids) ? category_ids.map(Number) : [];
      const existingRelations = await prisma.partsOnCategories.findMany({
        where: { part_id: id },
        select: { category_id: true },
      });
      const existingIds = existingRelations.map(r => r.category_id);
      const toAdd = newCategoryIds.filter(cid => !existingIds.includes(cid));
      const toRemove = existingIds.filter(cid => !newCategoryIds.includes(cid));
      if (toRemove.length) {
        await prisma.partsOnCategories.deleteMany({ where: { part_id: id, category_id: { in: toRemove } } });
      }
      for (const cid of toAdd) {
        const cat = await prisma.categories.findUnique({ where: { id: cid } });
        if (cat) {
          await prisma.partsOnCategories.create({ data: { part_id: id, category_id: cid } });
        }
      }
    }

    // ---------- 相容車型（PartCompatibility） ----------
    if (compatible_vehicle_ids !== undefined) {
      const newVehicleIds = Array.isArray(compatible_vehicle_ids)
        ? compatible_vehicle_ids.map(Number).filter(v => !isNaN(v))
        : [];

      console.debug('🔄 新車型 ID 清單:', newVehicleIds);

      const existingVehicles = await prisma.partCompatibility.findMany({
        where: { part_id: id },
        select: { vehicle_id: true },
      });
      const existingIds = existingVehicles.map(v => v.vehicle_id);
      console.debug('📌 現有關聯車型 ID:', existingIds);

      const toAdd = newVehicleIds.filter(vid => !existingIds.includes(vid));
      const toRemove = existingIds.filter(vid => !newVehicleIds.includes(vid));
      console.debug('➕ 需新增:', toAdd);
      console.debug('➖ 需刪除:', toRemove);

      if (toRemove.length) {
        await prisma.partCompatibility.deleteMany({
          where: { part_id: id, vehicle_id: { in: toRemove } },
        });
      }

      for (const vid of toAdd) {
        const vehicle = await prisma.vehicleVariant.findUnique({ where: { id: vid } });
        if (vehicle) {
          await prisma.partCompatibility.create({
            data: { part_id: id, vehicle_id: vid },
          });
          console.debug(`✅ 已新增關聯: 零件 ${id} ↔ 車型 ${vid}`);
        } else {
          console.warn(`⚠️ 車型 ID ${vid} 不存在，跳過`);
        }
      }
    } else {
      console.debug('ℹ️ 未收到 compatible_vehicle_ids，保持原樣');
    }

    const finalPart = await prisma.part.findUnique({
      where: { id },
      include: {
        subcategory: { include: { category: true } },
        parts_on_categories: { include: { category: true } },
        compatible_vehicles: { include: { vehicle: true } },
      },
    });
    console.debug('✅ 更新完成，回傳資料 compatible_vehicles 數量:', finalPart.compatible_vehicles.length);

    // 🆕 降價通知：價格有變動時檢查願望清單（失敗不擋流程）
    if (msrp_price !== undefined && parseFloat(msrp_price) < Number(existing.msrp_price)) {
      try {
        const { checkPriceDrops } = require('../services/wishPriceService');
        const notified = await checkPriceDrops(id);
        if (notified > 0) console.debug(`🔔 降價通知已推播 ${notified} 位用戶`);
      } catch (notifyErr) {
        console.error('降價通知檢查失敗:', notifyErr.message);
      }
    }

    res.json(finalPart);
  } catch (error) {
    console.error('❌ 更新商品失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// ========== DELETE /:id ==========
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '無效的商品 ID' });
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: '商品不存在' });
    const usedInOrders = await prisma.orderItem.count({ where: { part_id: id } });
    if (usedInOrders > 0) {
      return res.status(400).json({ error: '該商品已被訂單使用，無法刪除' });
    }
    await prisma.partsOnCategories.deleteMany({ where: { part_id: id } });
    await prisma.partCompatibility.deleteMany({ where: { part_id: id } });
    await prisma.part.delete({ where: { id } });

    // 🆕 清除相關快取
    await invalidateCache(['part_data', 'compatibility', 'inventory', 'garage_list']);

    res.json({ success: true, message: '商品已刪除' });
  } catch (error) {
    console.error('刪除商品失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;