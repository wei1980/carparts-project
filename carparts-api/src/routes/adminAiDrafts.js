// src/routes/adminAiDrafts.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const prisma = require('../lib/prisma');
router.use(adminAuth);

// GET /api/admin/ai-drafts?status=ready|pending|approved|rejected|failed
router.get('/', async (req, res) => {
  const { status = 'ready' } = req.query;
  try {
    const drafts = await prisma.aiPartDraft.findMany({
      where: { status },
      include: {
        customerVehicle: { select: { make: true, model: true, generation: true, variantId: true } },
        user: { select: { name: true, phone: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(drafts);
  } catch (error) {
    console.error('取得草稿列表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/admin/ai-drafts/:id — 取得單一草稿
router.get('/:id', async (req, res) => {
  try {
    const draft = await prisma.aiPartDraft.findUnique({
      where: { id: req.params.id },
      include: {
        customerVehicle: { select: { make: true, model: true, generation: true, variantId: true } },
        user: { select: { name: true, phone: true } },
      },
    });
    if (!draft) return res.status(404).json({ error: '草稿不存在' });
    res.json(draft);
  } catch (error) {
    console.error('取得單一草稿失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/admin/ai-drafts/:id — 更新草稿（手動編輯）
router.patch('/:id', async (req, res) => {
  try {
    const { result_json, status } = req.body;
    const data = {};
    if (result_json !== undefined) data.result_json = result_json;
    if (status !== undefined) data.status = status;

    const draft = await prisma.aiPartDraft.update({
      where: { id: req.params.id },
      data,
    });
    res.json(draft);
  } catch (error) {
    console.error('更新草稿失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/ai-drafts/:id/approve — 通過並正式上架
router.post('/:id/approve', async (req, res) => {
  try {
    const draft = await prisma.aiPartDraft.findUnique({
      where: { id: req.params.id },
      include: { customerVehicle: true }, // 包含 VehicleProfile 資料
    });
    if (!draft) return res.status(404).json({ error: '草稿不存在' });

    if (!Array.isArray(draft.result_json) || draft.result_json.length === 0) {
      return res.status(400).json({ error: '草稿沒有可上架的零件資料，請先編輯或拒絕' });
    }

    // 若有關聯的 VehicleProfile，取得其 variantId（可能為 null）
    const vehicleProfile = draft.customerVehicle;
    const variantId = vehicleProfile?.variantId ? parseInt(vehicleProfile.variantId) : null;

    for (const item of draft.result_json) {
      const sku = item.sku || `AI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const subcategoryId = item.subcategory_id ? parseInt(item.subcategory_id) : null;
      const categoryId = item.category_id ? parseInt(item.category_id) : null;

      // 查詢子分類詳細資訊，以取得主分類名稱
      let categoryName = null;
      if (subcategoryId) {
        const subcategory = await prisma.subcategories.findUnique({
          where: { id: subcategoryId },
          include: { category: true },
        });
        if (subcategory) {
          categoryName = subcategory.category.name; // 主分類名稱
        }
      }

      // 準備零件基本資料
      const partData = {
        sku,
        name: item.name,
        brand: item.brand,
        description: item.description,
        msrp_price: item.msrp_price || 0,
        wholesale_price: item.wholesale_price || 0,
        image_url: item.image_url,
        stock_qty: 1, // 至少 1，確保前端可顯示
        is_active: true,
        subcategory_id: subcategoryId, // 直接賦值外鍵
        category: categoryName || item.category || null, // 優先使用主分類名稱
      };

      // 尋找或建立零件
      let part = await prisma.part.findUnique({ where: { sku } });
      if (!part) {
        part = await prisma.part.create({ data: partData });
      } else {
        // 更新現有零件
        const updateData = {
          name: item.name,
          brand: item.brand,
          description: item.description,
          msrp_price: item.msrp_price || 0,
          wholesale_price: item.wholesale_price || 0,
          image_url: item.image_url,
          stock_qty: 1,
          is_active: true,
          subcategory_id: subcategoryId,
          category: categoryName || item.category || null,
        };
        part = await prisma.part.update({
          where: { id: part.id },
          data: updateData,
        });
      }

      // 建立 PartsOnCategories 關聯（若有提供主分類 ID）
      if (categoryId) {
        await prisma.partsOnCategories.upsert({
          where: {
            part_id_category_id: {
              part_id: part.id,
              category_id: categoryId,
            },
          },
          create: {
            part_id: part.id,
            category_id: categoryId,
          },
          update: {},
        });
      } else if (subcategoryId) {
        // 若僅有子分類，也可從子分類推導主分類並建立關聯（選擇性）
        // 此處省略，因為通常前端會提供 categoryId
      }

      // 建立與車型的相容性（若存在 variantId）
      if (variantId) {
        try {
          await prisma.partCompatibility.upsert({
            where: {
              part_id_vehicle_id: {
                part_id: part.id,
                vehicle_id: variantId, // 使用 VehicleVariant 的 ID
              },
            },
            create: {
              part_id: part.id,
              vehicle_id: variantId,
            },
            update: {},
          });
        } catch (compatError) {
          console.warn(`建立相容性失敗（零件 ${part.id}，車型 ${variantId}）:`, compatError.message);
        }
      }
    }

    // 更新草稿狀態
    await prisma.aiPartDraft.update({
      where: { id: draft.id },
      data: { status: 'approved' },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('審核通過失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/ai-drafts/:id/reject — 拒絕
router.post('/:id/reject', async (req, res) => {
  try {
    await prisma.aiPartDraft.update({
      where: { id: req.params.id },
      data: { status: 'rejected' },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('拒絕草稿失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;