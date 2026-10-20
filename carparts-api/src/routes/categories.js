// src/routes/categories.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/categories/tree - 获取分类树形结构
router.get('/tree', async (req, res) => {
  try {
    console.debug('📂 正在获取分类树...');
    
    // 从数据库获取所有分类
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
        sortOrder: true,
        icon: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.debug(`✅ 找到 ${categories.length} 个分类`);

    // 如果数据库没有分类，返回空数组
    if (categories.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        message: '暂无分类数据'
      });
    }

    // 构建树形结构
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }));
    };

    const tree = buildTree(null);
    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('❌ 获取分类树失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '伺服器內部錯誤，請稍後再試',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/categories - 获取所有分类（扁平列表）
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ success: false, error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/categories/:id - 获取单个分类
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: Number(id) }
    });
    
    if (!category) {
      return res.status(404).json({ success: false, error: '分类不存在' });
    }
    
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({ success: false, error: '伺服器內部錯誤，請稍後再試' });
  }
});

// POST /api/categories - 创建分类
router.post('/', async (req, res) => {
  try {
    const { name, parentId, sortOrder, icon } = req.body;
    
    const category = await prisma.category.create({
      data: { 
        name, 
        parentId: parentId || null, 
        sortOrder: sortOrder || 0, 
        icon 
      }
    });
    
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ success: false, error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PUT /api/categories/:id - 更新分类
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, sortOrder, icon } = req.body;
    
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, parentId, sortOrder, icon }
    });
    
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({ success: false, error: '伺服器內部錯誤，請稍後再試' });
  }
});

// DELETE /api/categories/:id - 删除分类
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有子分类
    const children = await prisma.category.count({
      where: { parentId: Number(id) }
    });
    
    if (children > 0) {
      return res.status(400).json({ 
        success: false, 
        error: '该分类下有子分类，无法删除' 
      });
    }
    
    await prisma.category.delete({
      where: { id: Number(id) }
    });
    
    res.json({ success: true, message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ success: false, error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;