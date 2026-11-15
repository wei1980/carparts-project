// src/routes/myCar.js — 車主端「我的愛車」儀表板
// 彙總：車輛資料 + 保養歷史（工單）+ 提醒到期狀態 + 建議保養項目
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { withDueStates, DEFAULT_INTERVALS } = require('../services/maintenanceReminderService');

const prisma = require('../lib/prisma');
router.use(auth);

// GET /api/my-car/dashboard — 我的爱车总览
router.get('/dashboard', async (req, res) => {
  try {
    const user = await prisma.endUser.findUnique({
      where: { id: req.userId },
      select: { currentVehicleId: true },
    });
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: {
        userId: req.userId,
        ...(user?.currentVehicleId ? { id: user.currentVehicleId } : {}),
      },
      include: {
        variant: { select: { id: true, make: true, model: true, generation: true, engine_code: true } },
      },
    });

    if (!vehicle) {
      return res.json({ vehicle: null, history: [], reminders: [], suggestions: [] });
    }

    // 保養歷史：已完工工單（新→舊）。ServiceRecord 無 garage / items 關聯，
    // 以 garage_id → Workshop 與 serviceRecordItem.record_id 批次查詢組裝。
    const records = await prisma.serviceRecord.findMany({
      where: { vehicle_id: vehicle.id },
      orderBy: [{ completed_at: 'desc' }, { created_at: 'desc' }],
      take: 50,
    });

    const recordIds = records.map((r) => r.id);
    const garageIds = [...new Set(records.map((r) => r.garage_id))];
    const [garages, allItems] = await Promise.all([
      garageIds.length
        ? prisma.workshop.findMany({
            where: { id: { in: garageIds } },
            select: { id: true, garage_name: true, company_name: true },
          })
        : Promise.resolve([]),
      recordIds.length
        ? prisma.serviceRecordItem.findMany({ where: { record_id: { in: recordIds } } })
        : Promise.resolve([]),
    ]);
    const garageMap = new Map(garages.map((g) => [g.id, g]));
    const itemsMap = new Map();
    for (const it of allItems) {
      if (!itemsMap.has(it.record_id)) itemsMap.set(it.record_id, []);
      itemsMap.get(it.record_id).push(it);
    }

    const history = records.map((r) => ({
      id: r.id,
      status: r.status,
      mileage_km: r.mileage_km,
      summary: r.summary,
      total_amount: r.total_amount,
      completed_at: r.completed_at || r.created_at,
      garage_name: garageMap.get(r.garage_id)?.garage_name || garageMap.get(r.garage_id)?.company_name || null,
      items: (itemsMap.get(r.id) || []).map((it) => ({
        kind: it.kind,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
    }));

    // 目前里程 = 最近一次有記錄里程的工單
    // 目前里程：優先採用車輛檔紀錄，回頭取最近一筆有里程的保養紀錄
    const currentMileageKm = vehicle.current_mileage != null
      ? vehicle.current_mileage
      : (records.find((r) => r.mileage_km != null)?.mileage_km ?? null);

    // 提醒（含到期狀態）
    const remindersRaw = await prisma.maintenanceReminder.findMany({
      where: { vehicle_id: vehicle.id },
      orderBy: [{ enabled: 'desc' }, { due_date: 'asc' }],
    });
    const reminders = await withDueStates(remindersRaw, { [vehicle.id]: currentMileageKm });

    // 建議保養：預設週期表中，該車尚未建立提醒、或提醒已 DUE_NOW 的項目
    const trackedTitles = new Set(
      remindersRaw.filter((r) => r.enabled).map((r) => r.title.toLowerCase())
    );
    const doneTitles = new Set(); // 歷史工單出現過的更換項目 → 顯示「上次更換時間」
    for (const r of records) {
      for (const it of itemsMap.get(r.id) || []) {
        if (it.kind === 'PART' || /更換|替換/.test(it.name || '')) doneTitles.add(it.name.trim().toLowerCase());
      }
    }
    const suggestions = DEFAULT_INTERVALS.filter((rule) =>
      !rule.keywords.some((k) => [...trackedTitles].some((t) => t.includes(k.toLowerCase())))
    )
      .filter((rule) =>
        // 只建議這台車曾經做過的項目（歷史有記錄），或核心保養項目（機油類）
        rule.keywords.some((k) => [...doneTitles].some((t) => t.includes(k.toLowerCase()))) ||
        rule.keywords.includes('機油')
      )
      .map((rule) => ({
        title: rule.keywords[0],
        interval_km: rule.interval_km || null,
        interval_days: rule.interval_days || null,
        ever_done: rule.keywords.some((k) => [...doneTitles].some((t) => t.includes(k.toLowerCase()))),
      }));

    res.json({
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        generation: vehicle.generation,
        year: vehicle.year,
        engine: vehicle.engine,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        plate_photo_url: vehicle.regPhotoUrl,
        // ⚠️ variantId 不可漏：前端 CurrentVehicleContext 用它組 selectedVariantId，
        //    Shop 首頁沒有 variantId 就完全不載入商品（顯示「選擇你的愛車」）。
        variantId: vehicle.variantId,
        variant: vehicle.variant,
      },
      current_mileage_km: currentMileageKm,
      mileage_updated_at: vehicle.mileage_updated_at,
      mileage_source: vehicle.mileage_source,
      mileage_source_note: vehicle.mileage_source_note,
      history,
      reminders,
      suggestions,
    });
  } catch (error) {
    console.error('我的愛車總覽查詢失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/my-car/current-vehicle — 切換當前車輛
router.patch('/current-vehicle', async (req, res) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ error: '請提供 vehicleId' });

    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: String(vehicleId), userId: req.userId },
    });
    if (!vehicle) return res.status(404).json({ error: '找不到車輛' });

    // 更新用戶的當前車輛（可以存在 endUser 表或單獨的設定表）
    // 這裡假設在 endUser 上有一個 currentVehicleId 欄位
    await prisma.endUser.update({
      where: { id: req.userId },
      data: { currentVehicleId: vehicle.id },
    });

    res.json({ success: true, message: '已切換車輛' });
  } catch (error) {
    console.error('切換車輛失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

// PATCH /api/my-car/vehicles/:id/mileage — 更新里程數（手動／辨識／推算）
router.patch('/vehicles/:id/mileage', async (req, res) => {
  try {
    const { id } = req.params;
    const { mileage_km: mileageKm, source = 'manual' } = req.body;
    const mileage = parseInt(mileageKm);
    if (!Number.isFinite(mileage) || mileage < 0) {
      return res.status(400).json({ error: '請輸入有效的里程數' });
    }

    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: String(id), userId: req.userId },
      select: { id: true, current_mileage: true },
    });
    if (!vehicle) return res.status(404).json({ error: '找不到車輛' });

    if (vehicle.current_mileage != null && mileage < vehicle.current_mileage) {
      return res.status(400).json({ error: `里程數不得低於目前紀錄（${vehicle.current_mileage.toLocaleString()} km）` });
    }

    await prisma.vehicleProfile.update({
      where: { id: vehicle.id },
      data: {
        current_mileage: mileage,
        mileage_updated_at: new Date(),
        mileage_source: source,
        mileage_source_note: source === 'manual' ? '手動更新' : source === 'ocr' ? '儀表板辨識' : source === 'estimated' ? '系統推算' : null,
      },
    });

    res.json({ success: true, message: '里程已更新', current_mileage: mileage });
  } catch (error) {
    console.error('更新里程失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤，請稍後再試' });
  }
});

module.exports = router;