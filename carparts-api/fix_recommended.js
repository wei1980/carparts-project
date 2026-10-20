const fs = require('fs');
const content = fs.readFileSync('src/app.js', 'utf8');

const oldCode = `// ========================================
// 推薦/搜尋零件 API（放在 /api/parts/:id 之前）
// ========================================
app.get('/api/parts/recommended', optionalGarageAuth, async (req, res) => {
  try {
    const { variantId, search, category, subcategory } = req.query;
    let whereClause = { is_active: true };

    if (variantId) {
      whereClause.compatible_vehicles = {
        some: { vehicle_id: parseInt(variantId) }
      };
    }

    if (category) whereClause.category = category;
    if (subcategory) whereClause.subcategory_id = parseInt(subcategory);
    if (search && search.trim() !== '') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 🔒 料號/批發價為車廠專屬欄位：匿名與一般車主一律不回傳（防比價爬蟲）
    const baseSelect = {
      id: true, name: true, brand: true,
      msrp_price: true,
      stock_qty: true, image_url: true, description: true,
      category: true, subcategory_id: true, created_at: true,
    };
    const select = req.isGarage ? { ...baseSelect, sku: true, wholesale_price: true } : baseSelect;

    const parts = await prisma.part.findMany({
      where: whereClause,
      select,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.json({ parts });
  } catch (error) {
    console.error('推薦零件搜尋失敗:', error);
    res.status(500).json({ error: '搜尋失敗' });
  }
});`;

const newCode = `// ========================================
// 推薦/搜尋零件 API（放在 /api/parts/:id 之前）
// ========================================
app.get('/api/parts/recommended', optionalGarageAuth, async (req, res) => {
  try {
    const { variantId, search, category, subcategory, page = 1, pageSize = 12, sort = 'hot' } = req.query;
    let whereClause = { is_active: true };

    if (variantId) {
      whereClause.compatible_vehicles = {
        some: { vehicle_id: parseInt(variantId) }
      };
    }

    if (category) whereClause.category = category;
    if (subcategory) whereClause.subcategory_id = parseInt(subcategory);
    if (search && search.trim() !== '') {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 🔒 料號/批發價為車廠專屬欄位：匿名與一般車主一律不回傳（防比價爬蟲）
    const baseSelect = {
      id: true, name: true, brand: true,
      msrp_price: true,
      stock_qty: true, image_url: true, description: true,
      category: true, subcategory_id: true, created_at: true,
    };
    const select = req.isGarage ? { ...baseSelect, sku: true, wholesale_price: true } : baseSelect;

    const page = Math.max(1, parseInt(page));
    const limit = Math.min(100, Math.max(1, parseInt(pageSize)));
    const skip = (page - 1) * limit;

    let orderBy = { created_at: 'desc' };
    if (sort === 'hot') orderBy = { view_count: 'desc' };
    else if (sort === 'price_asc') orderBy = { msrp_price: 'asc' };
    else if (sort === 'price_desc') orderBy = { msrp_price: 'desc' };
    else if (sort === 'newest') orderBy = { created_at: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where: whereClause,
        select,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.part.count({ where: whereClause }),
    ]);

    res.json({
      parts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('推薦零件搜尋失敗:', error);
    res.status(500).json({ error: '搜尋失敗' });
  }
});`;

const newContent = content.replace(oldCode, newCode);
if (newContent === content) {
  console.log('ERROR: Replacement did not change anything!');
  process.exit(1);
}
fs.writeFileSync('src/app.js', newContent);
console.log('SUCCESS: File updated');
