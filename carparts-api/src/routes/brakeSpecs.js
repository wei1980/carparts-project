// src/routes/brakeSpecs.js
// 煞車件規格 API —— 跨廠牌對應的共同鍵
//
// 用途：讓來令片 / 碟盤的不同廠牌能因為「規格相同」互相對應。
// 規格群組（brake_spec）由「位置 + 碟徑 + 碟厚 + 碟型 + 卡鉗」定義，
// 同一組物理規格在所有廠牌共用同一筆，因此可由任一零件反查其他廠牌的對應件。
//
// 端點：
//   GET /api/brake-specs/specs            規格群組列表（可依直徑/位置/卡鉗篩選）
//   GET /api/brake-specs/by-diameter      依碟徑反查規格群組
//   GET /api/brake-specs/part/:sku        依料號查零件的規格群組 + 同規格的其他零件
//   GET /api/brake-specs/cross-reference  依料號查跨廠牌對應件（含 FMSI/WVA/OE 對照）
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 規格群組 → 其對應的零件（含跨品牌）
async function partsOfSpec(specIds, { limit = 200 } = {}) {
  if (!specIds.length) return [];
  const groups = await prisma.brakePartSpecGroup.findMany({
    where: { brake_spec_id: { in: specIds } },
    include: {
      brakePart: {
        select: {
          id: true, brand: true, sku: true, name: true, name_zh: true,
          part_type: true, product_line: true, position: true,
          fmsi: true, wva_number: true, ean: true, brand_class: true,
          image_url: true, is_active: true, price_msrp: true,
        },
      },
    },
    take: limit * 3,
  });
  return groups.map(g => g.brakePart);
}

/**
 * GET /api/brake-specs/specs
 * 規格群組列表（分頁）
 */
router.get('/specs', async (req, res) => {
  try {
    const {
      position, diameter, thickness, style, caliper, brand, partType,
      page = '1', pageSize = '50',
    } = req.query;
    const where = {};
    if (position) where.position = position;
    if (diameter) where.disc_diameter_mm = Number(diameter);
    if (thickness) where.disc_thickness_mm = Number(thickness);
    if (style) where.disc_style = { contains: style, mode: 'insensitive' };
    if (caliper) where.caliper_make = { contains: caliper, mode: 'insensitive' };

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Math.min(Number(pageSize), 200));
    const take = Math.max(1, Math.min(Number(pageSize), 200));

    const [total, specs] = await Promise.all([
      prisma.brakeSpec.count({ where }),
      prisma.brakeSpec.findMany({
        where,
        orderBy: [{ position: 'asc' }, { disc_diameter_mm: 'asc' }, { disc_thickness_mm: 'asc' }],
        skip, take,
        include: {
          parts: {
            select: {
              brake_part_id: true,
              brakePart: { select: { brand: true, sku: true, name: true, part_type: true } },
            },
          },
        },
      }),
    ]);

    // 可依品牌/類型過濾零件（先取出再過濾，數量可控）
    const filtered = specs.map(s => {
      let parts = s.parts.map(g => g.brakePart);
      if (brand) parts = parts.filter(p => p.brand === brand);
      if (partType) parts = parts.filter(p => p.part_type === partType);
      return {
        id: s.id,
        spec_key: s.spec_key,
        display_name: s.display_name,
        position: s.position,
        disc_diameter_mm: s.disc_diameter_mm,
        disc_thickness_mm: s.disc_thickness_mm,
        disc_style: s.disc_style,
        caliper_make: s.caliper_make,
        part_count: parts.length,
        brands: [...new Set(parts.map(p => p.brand))],
        parts: parts.slice(0, 30),
      };
    });

    res.json({
      success: true,
      data: filtered,
      pagination: { total, page: Math.max(1, Number(page)), pageSize: take, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error('GET /api/brake-specs/specs error:', err.message);
    res.status(500).json({ success: false, error: '規格查詢失敗' });
  }
});

/**
 * GET /api/brake-specs/by-diameter?diameter=330
 * 依碟徑反查規格群組（改裝/換碟情境）
 */
router.get('/by-diameter', async (req, res) => {
  try {
    const { diameter, position, tolerance } = req.query;
    if (!diameter) return res.status(400).json({ success: false, error: '請提供 diameter' });
    const d = Number(diameter);
    const tol = Number(tolerance || 0);
    const where = {
      disc_diameter_mm: tol > 0 ? { gte: d - tol, lte: d + tol } : d,
    };
    if (position) where.position = position;

    const specs = await prisma.brakeSpec.findMany({
      where,
      orderBy: [{ position: 'asc' }, { disc_thickness_mm: 'asc' }],
      include: {
        parts: {
          select: {
            brakePart: {
              select: { brand: true, sku: true, name: true, part_type: true, product_line: true, position: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: specs.map(s => ({
        id: s.id,
        spec_key: s.spec_key,
        display_name: s.display_name,
        position: s.position,
        disc_diameter_mm: s.disc_diameter_mm,
        disc_thickness_mm: s.disc_thickness_mm,
        disc_style: s.disc_style,
        caliper_make: s.caliper_make,
        part_count: s.parts.length,
        brands: [...new Set(s.parts.map(g => g.brakePart.brand))],
        parts: s.parts.map(g => g.brakePart),
      })),
    });
  } catch (err) {
    console.error('GET /api/brake-specs/by-diameter error:', err.message);
    res.status(500).json({ success: false, error: '規格查詢失敗' });
  }
});

/**
 * GET /api/brake-specs/part/:sku
 * 依料號查：零件 → 規格群組 → 同規格的其他零件
 */
router.get('/part/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const part = await prisma.brakePart.findFirst({
      where: { sku },
      include: {
        specGroups: { include: { brakeSpec: true } },
        specs: { orderBy: { spec_key: 'asc' } },
        oeNumbers: true,
      },
    });
    if (!part) return res.status(404).json({ success: false, error: '查無此煞車零件' });

    const specIds = part.specGroups.map(g => g.brake_spec_id);
    const peers = await partsOfSpec(specIds, { limit: 300 });
    // 排除自己
    const others = peers.filter(p => !(p.brand === part.brand && p.sku === part.sku));

    // 依「品牌」分組 → 跨品牌對應
    const byBrand = {};
    for (const p of others) {
      (byBrand[p.brand] = byBrand[p.brand] || []).push(p);
    }

    res.json({
      success: true,
      data: {
        part: {
          id: part.id, brand: part.brand, sku: part.sku, name: part.name,
          name_zh: part.name_zh, part_type: part.part_type,
          product_line: part.product_line, position: part.position,
          fmsi: part.fmsi, wva_number: part.wva_number, ean: part.ean,
          brand_class: part.brand_class, image_url: part.image_url,
          price_msrp: part.price_msrp, is_active: part.is_active,
        },
        specs: part.specGroups.map(g => ({
          id: g.brake_spec_id,
          spec_key: g.brakeSpec.spec_key,
          display_name: g.brakeSpec.display_name,
          position: g.brakeSpec.position,
          disc_diameter_mm: g.brakeSpec.disc_diameter_mm,
          disc_thickness_mm: g.brakeSpec.disc_thickness_mm,
          disc_style: g.brakeSpec.disc_style,
          caliper_make: g.brakeSpec.caliper_make,
        })),
        part_specs: part.specs.map(s => ({
          spec_key: s.spec_key, spec_value: s.spec_value,
          num_value: s.num_value ? Number(s.num_value) : null, unit: s.unit,
        })),
        oe_numbers: part.oeNumbers.map(o => ({
          oe_brand: o.oe_brand, oe_number: o.oe_number, oe_kind: o.oe_kind,
        })),
        // 同規格的對應零件（跨品牌對應的核心結果）
        cross_reference: {
          total: others.length,
          brands: Object.keys(byBrand),
          by_brand: byBrand,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/brake-specs/part/:sku error:', err.message);
    res.status(500).json({ success: false, error: '零件規格查詢失敗' });
  }
});

/**
 * GET /api/brake-specs/cross-reference?sku=DP2420/2
 * 跨廠牌對應（精簡版：只回傳對應件清單）
 */
router.get('/cross-reference', async (req, res) => {
  try {
    const { sku } = req.query;
    if (!sku) return res.status(400).json({ success: false, error: '請提供 sku' });
    const part = await prisma.brakePart.findFirst({
      where: { sku },
      include: { specGroups: { include: { brakeSpec: true } } },
    });
    if (!part) return res.status(404).json({ success: false, error: '查無此煞車零件' });

    const specIds = part.specGroups.map(g => g.brake_spec_id);
    const peers = await partsOfSpec(specIds, { limit: 300 });
    const others = peers.filter(p => !(p.brand === part.brand && p.sku === part.sku));
    const byBrand = {};
    for (const p of others) (byBrand[p.brand] = byBrand[p.brand] || []).push(p);

    res.json({
      success: true,
      data: {
        sku: part.sku,
        brand: part.brand,
        specs: part.specGroups.map(g => g.brakeSpec.display_name),
        cross_reference: { total: others.length, by_brand: byBrand },
      },
    });
  } catch (err) {
    console.error('GET /api/brake-specs/cross-reference error:', err.message);
    res.status(500).json({ success: false, error: '跨廠牌對應查詢失敗' });
  }
});

module.exports = router;
