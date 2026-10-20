const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/authMiddleware');
const { uploadFields, handleUploadError, processUploadedFiles } = require('../middleware/fileUploadValidation');

const prisma = new PrismaClient();
router.use(auth);

/**
 * 取得車輛的結構化改裝明細
 * GET /api/vehicles/:id/modifications
 */
router.get('/:id/modifications', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        modifications_detail: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });
    res.json(vehicle.modifications_detail);
  } catch (error) {
    console.error('取得改裝明細失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * 新增/更新單一改裝項目
 * POST /api/vehicles/:id/modifications
 * body: { category, partType, brand, model, specJson, installedAt?, installedMileageKm?, laborCost?, warrantyUntil?, garageId?, beforePhotoUrls?, afterPhotoUrls?, note? }
 */
router.post('/:id/modifications', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const { category, partType, brand, model, specJson, installedAt, installedMileageKm, laborCost, warrantyUntil, garageId, beforePhotoUrls, afterPhotoUrls, note } = req.body;
    
    if (!category || !partType || !brand || !model) {
      return res.status(400).json({ error: 'category, partType, brand, model 為必填' });
    }

    // 檢查是否已存在同 category+partType（單一車輛同類別同類型只能有一筆）
    const existing = await prisma.vehicleModification.findFirst({
      where: { vehicleId: vehicle.id, category, partType }
    });

    let modification;
    if (existing) {
      modification = await prisma.vehicleModification.update({
        where: { id: existing.id },
        data: {
          brand, model, specJson,
          // Omitted history fields are not edits; Prisma skips undefined.
          installedAt: installedAt === undefined ? undefined : installedAt ? new Date(installedAt) : null,
          installedMileageKm: installedMileageKm === undefined ? undefined : installedMileageKm === null || installedMileageKm === '' ? null : Number(installedMileageKm),
          laborCost: laborCost === undefined ? undefined : laborCost === null || laborCost === '' ? null : Number(laborCost),
          warrantyUntil: warrantyUntil === undefined ? undefined : warrantyUntil ? new Date(warrantyUntil) : null,
          garageId: garageId === undefined ? undefined : garageId ? Number(garageId) : null,
          beforePhotoUrls,
          afterPhotoUrls,
          note
        }
      });
    } else {
      modification = await prisma.vehicleModification.create({
        data: {
          vehicleId: vehicle.id,
          category,
          partType,
          brand,
          model,
          specJson,
          installedAt: installedAt ? new Date(installedAt) : null,
          installedMileageKm: installedMileageKm ? Number(installedMileageKm) : null,
          laborCost: laborCost ? Number(laborCost) : null,
          warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
          garageId: garageId ? Number(garageId) : null,
          beforePhotoUrls,
          afterPhotoUrls,
          note
        }
      });
    }

    // 同步更新 VehicleProfile.modifications JSON（供舊版相容）
    await syncModificationsJson(vehicle.id);

    res.json(modification);
  } catch (error) {
    console.error('新增/更新改裝失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * 刪除單一改裝項目
 * DELETE /api/vehicles/:id/modifications/:modId
 */
router.delete('/:id/modifications/:modId', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const mod = await prisma.vehicleModification.findFirst({
      where: { id: req.params.modId, vehicleId: vehicle.id }
    });
    if (!mod) return res.status(404).json({ error: '改裝項目不存在' });

    await prisma.vehicleModification.delete({ where: { id: mod.id } });
    await syncModificationsJson(vehicle.id);

    res.json({ success: true });
  } catch (error) {
    console.error('刪除改裝失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * 批次同步 JSON 欄位（內部使用）
 */
async function syncModificationsJson(vehicleId) {
  const mods = await prisma.vehicleModification.findMany({
    where: { vehicleId },
    orderBy: { createdAt: 'asc' }
  });
  
  const json = {};
  for (const m of mods) {
    if (!json[m.category]) json[m.category] = {};
    json[m.category][m.partType] = {
      brand: m.brand,
      model: m.model,
      specJson: m.specJson,
      installedAt: m.installedAt,
      note: m.note
    };
  }
  
  await prisma.vehicleProfile.update({
    where: { id: vehicleId },
    data: { modifications: json }
  });
}

/**
 * 取得改裝聯動建議零件
 * GET /api/vehicles/:id/modification-parts?category=&partType=
 */
router.get('/:id/modification-parts', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        modifications_detail: true,
        variant: true
      }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const { category, partType } = req.query;
    const mods = vehicle.modifications_detail || [];

    // 找出對應的改裝項目
    const targetMods = mods.filter(m => 
      (!category || m.category === category) && 
      (!partType || m.partType === partType)
    );

    if (targetMods.length === 0) {
      return res.json({ parts: [], message: '無對應改裝項目' });
    }

    // 查詢 PartModificationFitment 找出受影響零件
    const modPartIds = targetMods.map(m => {
      // 先找出對應的 Part (modPart)
      return prisma.part.findFirst({
        where: { 
          name: { contains: m.model, mode: 'insensitive' },
          brand: { equals: m.brand, mode: 'insensitive' },
          is_active: true
        }
      });
    });

    const modParts = await Promise.all(modPartIds);
    const validModPartIds = modParts.filter(p => p).map(p => p.id);

    if (validModPartIds.length === 0) {
      return res.json({ parts: [], message: '找不到對應的改裝零件' });
    }

    const fitments = await prisma.partModificationFitment.findMany({
      where: {
        modPartId: { in: validModPartIds },
        ...(category ? { modificationType: category } : {})
      },
      include: {
        targetPart: {
          where: { is_active: true }
        }
      }
    });

    // 過濾掉 targetPart 為 null 的
    const validFitments = fitments.filter(f => f.targetPart);

    res.json({
      parts: validFitments.map(f => ({
        fitmentId: f.id,
        modificationType: f.modificationType,
        modPart: { id: f.modPart.id, name: f.modPart.name, brand: f.modPart.brand, sku: f.modPart.sku },
        targetPart: { 
          id: f.targetPart.id, 
          name: f.targetPart.name, 
          brand: f.targetPart.brand, 
          sku: f.targetPart.sku,
          msrp_price: f.targetPart.msrp_price,
          wholesale_price: f.targetPart.wholesale_price,
          image_url: f.targetPart.image_url
        },
        fitmentRule: f.fitmentRule,
        notes: f.notes
      }))
    });
  } catch (error) {
    console.error('取得改裝聯動零件失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * 車廠工單同步至車主車況檔案（需用戶同意）
 * POST /api/vehicles/:id/sync-from-garage
 * body: { workOrderId, items: [{ category, partType, brand, model, specJson, installedAt, installedMileageKm, laborCost, warrantyUntil, garageId, beforePhotoUrls, afterPhotoUrls, note }] }
 * 
 * 將車廠完工工單的內容寫入車主的改裝/保養記錄
 */
router.post('/:id/sync-from-garage', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const { workOrderId, items } = req.body;
    if (!workOrderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'workOrderId 和 items 為必填' });
    }

    // 驗證工單存在且屬於此車輛且已完工
    const workOrder = await prisma.workOrder.findFirst({
      where: { 
        id: Number(workOrderId), 
        vehicle_id: vehicle.id,
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      include: { items: true, laborItems: true }
    });
    if (!workOrder) return res.status(404).json({ error: '找不到對應的完工工單' });

    const results = [];
    for (const item of items) {
      const { category, partType, brand, model, specJson, installedAt, installedMileageKm, laborCost, warrantyUntil, garageId, beforePhotoUrls, afterPhotoUrls, note } = item;
      
      if (!category || !partType || !brand || !model) {
        results.push({ category, partType, success: false, error: '缺少必填欄位' });
        continue;
      }

      const existing = await prisma.vehicleModification.findFirst({
        where: { vehicleId: vehicle.id, category, partType }
      });

      let modification;
      if (existing) {
        modification = await prisma.vehicleModification.update({
          where: { id: existing.id },
          data: { 
            brand, model, specJson, 
            installedAt: installedAt ? new Date(installedAt) : workOrder.completed_at || new Date(), 
            installedMileageKm: installedMileageKm ? Number(installedMileageKm) : workOrder.mileage_km || null,
            laborCost: laborCost ? Number(laborCost) : null,
            warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
            garageId: garageId ? Number(garageId) : workOrder.garage_id,
            beforePhotoUrls,
            afterPhotoUrls,
            note: note || `同步自工單 #${workOrderId}：${workOrder.summary || ''}`
          }
        });
      } else {
        modification = await prisma.vehicleModification.create({
          data: {
            vehicleId: vehicle.id,
            category,
            partType,
            brand,
            model,
            specJson,
            installedAt: installedAt ? new Date(installedAt) : workOrder.completed_at || new Date(),
            installedMileageKm: installedMileageKm ? Number(installedMileageKm) : workOrder.mileage_km || null,
            laborCost: laborCost ? Number(laborCost) : null,
            warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
            garageId: garageId ? Number(garageId) : workOrder.garage_id,
            beforePhotoUrls,
            afterPhotoUrls,
            note: note || `同步自工單 #${workOrderId}：${workOrder.summary || ''}`
          }
        });
      }
      results.push({ category, partType, success: true, id: modification.id });
    }

    await syncModificationsJson(vehicle.id);

    res.json({ success: true, synced: results.filter(r => r.success).length, results });
  } catch (error) {
    console.error('車廠工單同步失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * 取得車輛的完工工單（供車主同步用）
 * GET /api/vehicles/:id/completed-work-orders
 */
router.get('/:id/completed-work-orders', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    const orders = await prisma.workOrder.findMany({
      where: {
        vehicle_id: vehicle.id,
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      include: {
        garage: { select: { id: true, garage_name: true, company_name: true } },
        technician_user: { select: { id: true, name: true } },
        items: { include: { part: { select: { id: true, name: true, brand: true, sku: true } } } },
        laborItems: { include: { laborFee: { select: { id: true, name: true, price: true } } } }
      },
      orderBy: { completed_at: 'desc' },
      take: 20
    });

    const result = orders.map(o => ({
      id: o.id,
      garage_id: o.garage_id,
      garage_name: o.garage?.garage_name,
      garage_company_name: o.garage?.company_name,
      technician: o.technician_user?.name,
      completed_at: o.completed_at,
      mileage_km: o.mileage_km,
      summary: o.summary,
      items: [
        ...o.items.map(i => ({
          id: `part-${i.id}`,
          kind: 'PART',
          name: i.part?.name || i.name,
          brand: i.part?.brand,
          quantity: i.quantity,
          unit_price: Number(i.unit_price)
        })),
        ...o.laborItems.map(i => ({
          id: `labor-${i.id}`,
          kind: 'LABOR',
          name: i.laborFee?.name || i.name,
          brand: null,
          quantity: 1,
          unit_price: Number(i.amount)
        }))
      ],
      before_photos: Array.isArray(o.photos) ? o.photos.filter(p => p.type === 'before').map(p => p.url) : [],
      after_photos: Array.isArray(o.photos) ? o.photos.filter(p => p.type === 'after').map(p => p.url) : []
    }));

    res.json(result);
  } catch (error) {
    console.error('取得完工工單失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * 上傳改裝照片（前/後照片）
 * POST /api/vehicles/:id/modification-photos
 * body: multipart/form-data
 * fields: beforePhotos[], afterPhotos[]
 */
router.post('/:id/modification-photos', uploadFields([
  { name: 'beforePhotos', maxCount: 5 },
  { name: 'afterPhotos', maxCount: 5 }
]), handleUploadError, processUploadedFiles, async (req, res) => {
  try {
    const vehicle = await prisma.vehicleProfile.findFirst({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!vehicle) return res.status(404).json({ error: '車輛不存在' });

    // 這裡應將檔案上傳至 S3/雲端，回傳 URL
    // 暫時回傳 base64 data URL 供前端預覽
    const beforePhotos = (req.files?.beforePhotos || []).map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`);
    const afterPhotos = (req.files?.afterPhotos || []).map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`);

    res.json({ beforePhotos, afterPhotos });
  } catch (error) {
    console.error('上傳改裝照片失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;