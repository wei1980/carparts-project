// src/routes/adminCategories.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const adminAuth = require('../middleware/adminAuth');
const prisma = new PrismaClient();
router.use(adminAuth);

// GET /api/admin/categories/tree — 取得主分類樹（含子分類）
router.get('/tree', async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      where: { is_active: true },
      include: {
        subcategories: {
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { sort_order: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/categories — 新增主分類
router.post('/', async (req, res) => {
  try {
    const { name, slug, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請輸入主分類名稱' });
    }

    const category = await prisma.categories.create({
      data: {
        name: name.trim(),
        slug: slug || null,
        sort_order: sort_order || 0,
        is_active: true,
        is_nav: true,
      },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PUT /api/admin/categories/:id — 修改主分類名稱
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請輸入主分類名稱' });
    }

    const data = { name: name.trim() };
    if (slug !== undefined) data.slug = slug;
    if (sort_order !== undefined) data.sort_order = sort_order;

    const category = await prisma.categories.update({
      where: { id },
      data,
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/admin/categories/:id — 刪除主分類（含子分類與關聯）
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // 取得子分類 ID
    const subcategories = await prisma.subcategories.findMany({
      where: { category_id: id },
      select: { id: true },
    });
    const subIds = subcategories.map(s => s.id);

    // 解除零件的子分類關聯
    if (subIds.length > 0) {
      await prisma.part.updateMany({
        where: { subcategory_id: { in: subIds } },
        data: { subcategory_id: null },
      });
    }

    // 刪除與主分類相關的多對多關聯
    await prisma.partsOnCategories.deleteMany({
      where: { category_id: id },
    });

    // 刪除子分類
    await prisma.subcategories.deleteMany({
      where: { category_id: id },
    });

    // 刪除主分類
    await prisma.categories.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('刪除主分類失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/admin/categories/:id/subcategories — 新增子分類
router.post('/:id/subcategories', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請輸入子分類名稱' });
    }

    const subcategory = await prisma.subcategories.create({
      data: {
        category_id: categoryId,
        name: name.trim(),
        sort_order: sort_order || 0,
        is_active: true,
      },
    });
    res.json(subcategory);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PUT /api/admin/subcategories/:id — 修改子分類名稱
router.put('/subcategories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請輸入子分類名稱' });
    }

    const data = { name: name.trim() };
    if (sort_order !== undefined) data.sort_order = sort_order;

    const subcategory = await prisma.subcategories.update({
      where: { id },
      data,
    });
    res.json(subcategory);
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/admin/subcategories/:id — 刪除子分類
router.delete('/subcategories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.part.updateMany({
      where: { subcategory_id: id },
      data: { subcategory_id: null },
    });

    await prisma.subcategories.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('刪除子分類失敗:', error);
    // 檢查是否為外鍵約束錯誤
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(400).json({ error: '無法刪除：仍有關聯資料，請先處理相關零件' });
    }
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;
