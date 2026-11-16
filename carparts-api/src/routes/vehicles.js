const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/authMiddleware');

const prisma = require('../lib/prisma');
router.use(auth);

// POST /api/vehicles
router.post('/', async (req, res) => {
  try {
    // 🔒 銀卡以上才能新增第二台車 — 前端已攔截（會員等級後端化後補此處檢查）
    const { make, model, generation, year, engine, vin, licensePlate, variantId } = req.body;

    const vehicle = await prisma.vehicleProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: req.userId,
        make: make || null,
        model: model || null,
        generation: generation || null,
        year: year ? parseInt(year) : null,
        engine: engine || null,
        vin: vin || null,
        licensePlate: licensePlate || null,
        variantId: variantId ? parseInt(variantId) : null,
        updatedAt: new Date(),
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('建立車輛失敗:', error);
    res.status(500).json({ error: '建立車輛失敗' });
  }
});

// POST /api/vehicles/auto-create-variant
router.post('/auto-create-variant', async (req, res) => {
  try {
    let { make, model, year, generation, engine_code, displacement_cc, horsepower, fuel_type } = req.body;
    if (!make || !model) return res.status(400).json({ error: 'make 和 model 為必填' });

    // 品牌正規化（可選，與前端保持一致）
    const brandMap = {
      'mercedes-benz': 'Benz',
      'mercedes benz': 'Benz',
      'volkswagen': 'VW',
      'vw': 'VW',
    };
    const normalizedMake = brandMap[make.toLowerCase()] || make;

    // 檢查是否已存在
    const existing = await prisma.vehicleVariant.findFirst({
      where: { make: normalizedMake, model, generation: generation || '', engine_code: engine_code || '' }
    });
    if (existing) return res.json({ variantId: existing.id, created: false });

    const newVariant = await prisma.vehicleVariant.create({
      data: {
        make: normalizedMake,
        model,
        generation: generation || '',
        engine_code: engine_code || '',
        variant_name: `${normalizedMake} ${model} ${generation || ''}`.trim(),
        year_start: year,
        year_end: year,
        specs: {
          displacement_cc,
          horsepower,
          fuel_type,
          source: 'ai_scan'
        }
      }
    });

    res.json({ variantId: newVariant.id, created: true });
  } catch (error) {
    console.error('自動建立車型失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const vehicles = await prisma.vehicleProfile.findMany({
      where: { userId: req.userId },
      include: { variant: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: '查詢失敗' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { variant: true },
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: '查詢失敗' });
  }
});

// DELETE /api/vehicles/:id
// ⚠️ 車輛被多張表引用，且大部分「沒有」onDelete: Cascade：
//      Appointment          → 有 relation，但無 cascade
//      ServiceRecord        → 純 vehicle_id 欄位
//      MaintenanceReminder  → 純 vehicle_id 欄位
//      InsurancePolicy      → 純 vehicle_id 欄位
//      ConsumerOrder        → 純 vehicle_id 欄位
//    所以直接 delete 會被 FK 擋下 → 500「刪除失敗」，使用者不知道原因。
//    這裡先檢查是否有不可移除的歷史資料（訂單 / 工單 / 保單），
//    有就回 409 說明；沒有的話才連同預約與提醒一起清掉再刪車輛。
router.delete('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId },
      select: { id: true },
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    // 有交易/保單紀錄的車輛不可直接刪（對帳、保固、稅務需要該車輛存在）
    const [orderCount, recordCount, policyCount] = await Promise.all([
      prisma.consumerOrder.count({ where: { vehicle_id: vehicle.id } }),
      prisma.serviceRecord.count({ where: { vehicle_id: vehicle.id } }),
      prisma.insurancePolicy.count({ where: { vehicle_id: vehicle.id } }).catch(() => 0),
    ]);

    if (orderCount > 0 || recordCount > 0 || policyCount > 0) {
      return res.status(409).json({
        code: 'VEHICLE_IN_USE',
        error: `此車輛已有 ${orderCount} 筆訂單、${recordCount} 筆維修紀錄、${policyCount} 筆保單，`
          + '為保留交易與保固紀錄無法刪除。請改用「停用」或聯絡客服。',
      });
    }

    // 無交易紀錄 → 連同預約與提醒一起清掉，避免孤兒資料
    // ⚠️ 若刪的是「當前車輛」，必須把 currentVehicleId 改指向剩餘車輛（或清空）。
    //    否則 currentVehicleId 會變成指向已刪車輛的孤兒指標，
    //    之後 /api/my-car/dashboard 的 vehicle 一律回 null
    //    → 前端車輛列表整塊被隱藏（使用者以為所有車都不見了）。
    const nextVehicle = await prisma.vehicleProfile.findFirst({
      where: { userId: req.userId, NOT: { id: vehicle.id } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.appointment.deleteMany({ where: { vehicle_id: vehicle.id } });
      await tx.maintenanceReminder.deleteMany({ where: { vehicle_id: vehicle.id } });
      await tx.vehicleProfile.delete({ where: { id: vehicle.id } });

      const me = await tx.endUser.findUnique({
        where: { id: req.userId }, select: { currentVehicleId: true },
      });
      if (me?.currentVehicleId === vehicle.id) {
        await tx.endUser.update({
          where: { id: req.userId },
          data: { currentVehicleId: nextVehicle?.id ?? null },
        });
      }
    });

    res.json({ success: true, message: '車輛已刪除' });
  } catch (error) {
    console.error('刪除車輛失敗:', error);
    // P2003 = FK 約束失敗（仍被其他表引用）
    if (error.code === 'P2003') {
      return res.status(409).json({
        code: 'VEHICLE_IN_USE',
        error: '此車輛仍被其他紀錄引用，無法刪除。',
      });
    }
    res.status(500).json({ error: '刪除失敗' });
  }
});

// PATCH /api/vehicles/:id/modifications
router.patch('/:id/modifications', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const updated = await prisma.vehicleProfile.update({
      where: { id: req.params.id },
      data: { modifications: req.body.modifications || {} },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新失敗' });
  }
});

// GET /api/vehicles/brands - Get all brands
router.get('/brands', async (req, res) => {
  try {
    const brands = await prisma.vehicleVariant.findMany({
      where: { is_approved: true },
      select: { make: true },
      distinct: ['make'],
      orderBy: { make: 'asc' }
    });
    res.json(brands.map(b => b.make));
  } catch (error) {
    console.error('取得品牌列表失敗:', error);
    res.status(500).json({ error: '無法取得廠牌列表' });
  }
});

// GET /api/vehicles/years - Get years by brand
router.get('/years', async (req, res) => {
  try {
    const { brand } = req.query;
    if (!brand) return res.status(400).json({ error: '請提供品牌' });

    const years = await prisma.vehicleVariant.findMany({
      where: {
        is_approved: true,
        make: String(brand)
      },
      select: { year_start: true },
      distinct: ['year_start'],
      orderBy: { year_start: 'desc' }
    });
    res.json(years.map(y => y.year_start));
  } catch (error) {
    console.error('取得年份列表失敗:', error);
    res.status(500).json({ error: '無法取得年份列表' });
  }
});

// GET /api/vehicles/models - Get models by brand and year
router.get('/models', async (req, res) => {
  try {
    const { brand, year } = req.query;
    if (!brand) return res.status(400).json({ error: '請提供品牌' });

    const where = { is_approved: true, make: String(brand) };
    if (year) {
      where.year_start = { lte: parseInt(year) };
      where.year_end = { gte: parseInt(year) };
    }
    const models = await prisma.vehicleVariant.findMany({
      where,
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' }
    });
    res.json(models.map(m => m.model));
  } catch (error) {
    console.error('取得車系列表失敗:', error);
    res.status(500).json({ error: '無法取得車系列表' });
  }
});

// GET /api/vehicles/variants - Get variants by brand, year, model, engine
router.get('/variants', async (req, res) => {
  try {
    const { brand, year, model, engine } = req.query;
    if (!brand || !model || !engine) {
      return res.status(400).json({ error: '請提供品牌、車系、引擎代碼' });
    }

    const where = {
      is_approved: true,
      make: String(brand),
      model: String(model),
      engine_code: String(engine)
    };
    if (year) {
      where.year_start = { lte: parseInt(year) };
      where.year_end = { gte: parseInt(year) };
    }

    const variants = await prisma.vehicleVariant.findMany({
      where,
      select: {
        id: true,
        variant_name: true,
        generation: true,
        engine_code: true,
        displacement: true,
        horsepower: true,
        drive_type: true,
        transmission: true,
        fuel_type: true,
        year_start: true,
        year_end: true
      },
      orderBy: { year_start: 'desc' }
    });

    const result = variants.map(v => ({
      id: v.id,
      variant_name: v.variant_name,
      generation: v.generation,
      engine_code: v.engine_code,
      displacement: v.displacement,
      horsepower: v.horsepower,
      drive_type: v.drive_type,
      transmission: v.transmission,
      fuel_type: v.fuel_type,
      year_start: v.year_start,
      year_end: v.year_end
    }));

    res.json(result);
  } catch (error) {
    console.error('取得車型變體失敗:', error);
    res.status(500).json({ error: '無法取得車型變體' });
  }
});

module.exports = router;