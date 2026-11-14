const express = require('express');
const router = express.Router();
const garageAuth = require('../middleware/garageAuth');
const { notifyAppointmentUpdate } = require('../services/lineService');

const prisma = require('../lib/prisma');

// ============================================================
// ⚠️ WorkOrder / WorkOrderItem / WorkOrderLaborItem 在 schema 裡**沒有任何 relation**
//    （vehicle/user/technician/bay/items 都是純 id 欄位）。用 include 會直接
//    PrismaClientValidationError → 整個車廠工單功能 500。
//    因此一律：先查工單，再批次抓關聯資料，最後併回同一個物件。
// ============================================================
async function hydrateWorkOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return orders;

  const vehicleIds = [...new Set(orders.map((o) => o.vehicle_id).filter(Boolean))];
  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const bayIds = [...new Set(orders.map((o) => o.bay_id).filter(Boolean))];
  const orderIds = orders.map((o) => o.id);

  const [vehicles, users, , bays, items, laborItems, history] = await Promise.all([
    vehicleIds.length
      ? prisma.vehicleProfile.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, make: true, model: true, licensePlate: true, variantId: true },
        })
      : [],
    userIds.length
      ? prisma.endUser.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, phone: true, lineId: true },
        })
      : [],
    // 技師沒有獨立表：存在 Workshop.garage_slots.technicians（JSON），
    // 無法用 id 批次查 → 保持 null，前端顯示「未指派」。
    Promise.resolve([]),
    bayIds.length
      ? prisma.bay.findMany({ where: { id: { in: bayIds } }, select: { id: true, name: true } })
      : [],
    orderIds.length
      ? prisma.workOrderItem.findMany({
          where: { work_order_id: { in: orderIds } },
          orderBy: { id: 'asc' },
        })
      : [],
    orderIds.length
      ? prisma.workOrderLaborItem.findMany({
          where: { work_order_id: { in: orderIds } },
          orderBy: { id: 'asc' },
        })
      : [],
    orderIds.length
      ? prisma.workOrderStatusHistory.findMany({
          where: { work_order_id: { in: orderIds } },
          orderBy: { created_at: 'asc' },
        })
      : [],
  ]);

  const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
  const vMap = byId(vehicles);
  const uMap = byId(users);
  const bMap = byId(bays);
  const group = (rows) => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.work_order_id)) m.set(r.work_order_id, []);
      m.get(r.work_order_id).push(r);
    }
    return m;
  };
  const iMap = group(items);
  const lMap = group(laborItems);
  const hMap = group(history);

  return orders.map((o) => ({
    ...o,
    vehicle: vMap.get(o.vehicle_id) || null,
    user: uMap.get(o.user_id) || null,
    bay: bMap.get(o.bay_id) || null,
    items: iMap.get(o.id) || [],
    laborItems: lMap.get(o.id) || [],
    statusHistory: hMap.get(o.id) || [],
  }));
}

async function hydrateWorkOrder(order) {
  if (!order) return order;
  const [hydrated] = await hydrateWorkOrders([order]);
  return hydrated;
}
router.use(garageAuth);

// ==================== 工單流程 ====================
// 狀態流向: RECEIVED(接車) → QUOTING(報價中) → CUSTOMER_CONFIRMED(客戶確認) 
// → IN_PROGRESS(維修中) → QUALITY_CHECK(品檢) → COMPLETED(完工) → READY_FOR_PICKUP(待取車) → DELIVERED(出貨/交車)

// GET /api/garage/work-orders - 取得工單列表
router.get('/work-orders', async (req, res) => {
  try {
    const { status, technicianId, page = 1, limit = 20 } = req.query;
    // 防 NaN：非數字 page/limit 會讓 skip/take 變 NaN → Prisma 拋錯 → 500
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const where = { garage_id: req.workshopId };
    if (status) where.status = status.toUpperCase();
    if (technicianId) {
      const techId = parseInt(technicianId, 10);
      if (Number.isFinite(techId)) where.technician_id = techId;
    }

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.workOrder.count({ where })
    ]);

    res.json({ workOrders: await hydrateWorkOrders(workOrders), total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('取得工單列表失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/garage/work-orders - 建立工單 (從預約轉換或直接建立)
router.post('/work-orders', async (req, res) => {
  try {
    const { 
      appointmentId,
      vehicleId,
      userId,
      technicianId,
      bayId,
      serviceType,
      initialNotes,
      estimatedCompletion
    } = req.body;

    let vehicle_id = vehicleId;
    let user_id = userId;
    let appt_id = null;

    // 如果從預約轉換
    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: parseInt(appointmentId), garage_id: req.workshopId },
      });
      if (!appointment) return res.status(404).json({ error: '預約不存在' });

      vehicle_id = appointment.vehicle_id;
      user_id = appointment.user_id;
      appt_id = appointment.id;
      
      // 更新預約狀態
      await prisma.appointment.update({
        where: { id: parseInt(appointmentId) },
        data: { status: 'IN_PROGRESS' }
      });
    }

    if (!vehicle_id) return res.status(400).json({ error: '請提供車輛 ID' });

    const workOrder = await prisma.workOrder.create({
      data: {
        garage_id: req.workshopId,
        vehicle_id,
        user_id,
        technician_id: technicianId || null,
        bay_id: bayId || null,
        service_type: serviceType || 'REPAIR',
        status: 'RECEIVED',
        initial_notes: initialNotes || null,
        estimated_completion: estimatedCompletion ? new Date(estimatedCompletion) : null,
        // WorkOrder 沒有 items relation（WorkOrderItem 是獨立表），
        // 且 appointment_id 是 UNIQUE，從預約轉單時必須寫入才能追溯。
        ...(appt_id ? { appointment_id: appt_id } : {})
      },
    });

    // 發送 LINE 通知給客戶：車輛已接收
    if (user_id) {
      const customer = await prisma.endUser.findUnique({
        where: { id: user_id },
        select: { lineId: true, name: true }
      });
      if (customer?.lineId) {
        await notifyWorkOrderStatus(workOrder, customer, 'RECEIVED');
      }
    }

    res.status(201).json(workOrder);
  } catch (error) {
    console.error('建立工單失敗:', error);
    res.status(500).json({ error: '建立工單失敗' });
  }
});

// GET /api/garage/work-orders/:id - 取得工單詳情
router.get('/work-orders/:id', async (req, res) => {
  try {
    const workOrder = await prisma.workOrder.findFirst({
      where: { id: parseInt(req.params.id), garage_id: req.workshopId },
    });
    if (!workOrder) return res.status(404).json({ error: '工單不存在' });

    // ⚠️ WorkOrder 沒有 relation，明細與工資必須批次抓取後再算總計
    const [hydrated] = await hydrateWorkOrders([workOrder]);
    const partsTotal = (hydrated.items || []).reduce((s, i) => s + Number(i.unit_price || 0) * (i.quantity || 0), 0);
    const laborTotal = (hydrated.laborItems || []).reduce((s, i) => s + Number(i.amount || 0), 0);
    const subtotal = partsTotal + laborTotal;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    res.json({ ...hydrated, totals: { partsTotal, laborTotal, subtotal, tax, total } });
  } catch (error) {
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PATCH /api/garage/work-orders/:id/status - 更新工單狀態
router.patch('/work-orders/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, note } = req.body;
    
    const validStatuses = ['RECEIVED', 'QUOTING', 'CUSTOMER_CONFIRMED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '無效的狀態' });
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id, garage_id: req.workshopId },
      
    });
    if (!workOrder) return res.status(404).json({ error: '工單不存在' });

    // 記錄狀態變更歷史
    await prisma.workOrderStatusHistory.create({
      data: {
        work_order_id: id,
        from_status: workOrder.status,
        to_status: status,
        note: note || null,
        changed_by: req.userId // 假設 middleware 有設定
      }
    });

    const updated = await prisma.workOrder.update({
      where: { id },
      data: { 
        status,
        ...(status === 'COMPLETED' && { completed_at: new Date() }),
        ...(status === 'DELIVERED' && { delivered_at: new Date() })
      },
      
    });

    // 發送 LINE 通知給客戶
    if (updated.user?.lineId) {
      await notifyWorkOrderStatus(updated, updated.user, status);
    }

    // 回應形狀與先前一致（含關聯資料），否則前端畫面會缺欄位
    res.json(await hydrateWorkOrder(updated));
  } catch (error) {
    console.error('更新工單狀態失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/garage/work-orders/:id/items - 新增工單項目 (零件/工資)
router.post('/work-orders/:id/items', async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    const { type, partId, name, quantity, unitPrice, laborFeeId, description } = req.body;

    const workOrder = await prisma.workOrder.findFirst({
      where: { id: workOrderId, garage_id: req.workshopId }
    });
    if (!workOrder) return res.status(404).json({ error: '工單不存在' });
    if (['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(workOrder.status)) {
      return res.status(400).json({ error: '工單已結束，無法新增項目' });
    }

    let item;
    if (type === 'PART') {
      if (!partId) return res.status(400).json({ error: '零件 ID 為必填' });
      const part = await prisma.part.findUnique({ where: { id: parseInt(partId) } });
      if (!part) return res.status(404).json({ error: '零件不存在' });
      
      item = await prisma.workOrderItem.create({
        data: {
          work_order_id: workOrderId,
          part_id: parseInt(partId),
          name: part.name,
          quantity: quantity || 1,
          unit_price: unitPrice || part.wholesale_price || part.msrp_price || 0,
          type: 'PART'
        },
      });
    } else if (type === 'LABOR') {
      item = await prisma.workOrderLaborItem.create({
        data: {
          work_order_id: workOrderId,
          labor_fee_id: laborFeeId || null,
          name: name || '工資項目',
          amount: unitPrice || 0,
          description: description || null,
          type: 'LABOR'
        }
      });
    } else {
      return res.status(400).json({ error: '項目類型必須是 PART 或 LABOR' });
    }

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: '新增項目失敗' });
  }
});

// PATCH /api/garage/work-orders/:id/items/:itemId - 更新工單項目
router.patch('/work-orders/:id/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, unitPrice, amount, description } = req.body;

    // 嘗試更新零件項目
    let item = await prisma.workOrderItem.findFirst({
      where: { id: parseInt(itemId), work_order_id: parseInt(req.params.id) }
    });
    
    if (item) {
      if (['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(item.workOrder?.status)) {
        return res.status(400).json({ error: '工單已結束，無法修改' });
      }
      item = await prisma.workOrderItem.update({
        where: { id: parseInt(itemId) },
        data: { quantity: quantity || item.quantity, unit_price: unitPrice || item.unit_price },
      });
      return res.json(item);
    }

    // 嘗試更新工資項目
    item = await prisma.workOrderLaborItem.findFirst({
      where: { id: parseInt(itemId), work_order_id: parseInt(req.params.id) }
    });
    if (!item) return res.status(404).json({ error: '項目不存在' });

    item = await prisma.workOrderLaborItem.update({
      where: { id: parseInt(itemId) },
      data: { amount: amount !== undefined ? amount : item.amount, description: description !== undefined ? description : item.description }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: '更新項目失敗' });
  }
});

// DELETE /api/garage/work-orders/:id/items/:itemId - 刪除工單項目
router.delete('/work-orders/:id/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const workOrderId = parseInt(req.params.id);

    // 先檢查零件項目
    let item = await prisma.workOrderItem.findFirst({
      where: { id: parseInt(itemId), work_order_id: workOrderId }
    });
    if (item) {
      await prisma.workOrderItem.delete({ where: { id: parseInt(itemId) } });
      return res.json({ success: true });
    }

    // 檢查工資項目
    item = await prisma.workOrderLaborItem.findFirst({
      where: { id: parseInt(itemId), work_order_id: workOrderId }
    });
    if (!item) return res.status(404).json({ error: '項目不存在' });

    await prisma.workOrderLaborItem.delete({ where: { id: parseInt(itemId) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '刪除項目失敗' });
  }
});

// POST /api/garage/work-orders/:id/quote - 送出報價給客戶確認
router.post('/work-orders/:id/quote', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quoteNote, validUntilHours = 24 } = req.body;

    const wo = await prisma.workOrder.findFirst({
      where: { id, garage_id: req.workshopId },
    });
    if (!wo) return res.status(404).json({ error: '工單不存在' });
    if (wo.status !== 'RECEIVED' && wo.status !== 'QUOTING') {
      return res.status(400).json({ error: '目前狀態無法送出報價' });
    }
    // ⚠️ WorkOrder 無 relation：明細與工資必須批次抓取
    const workOrder = await hydrateWorkOrder(wo);

    const partsTotal = (workOrder.items || []).reduce((sum, item) => sum + Number(item.unit_price || 0) * item.quantity, 0);
    const laborTotal = (workOrder.laborItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const subtotal = partsTotal + laborTotal;
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + validUntilHours);

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'QUOTING',
        quote_amount: total,
        quote_note: quoteNote || null,
        quote_valid_until: validUntil,
        quote_sent_at: new Date()
      },
      
    });

    // 發送 LINE 通知客戶確認報價
    if (updated.user?.lineId) {
      await notifyWorkOrderQuote(updated, updated.user);
    }

    res.json(updated);
  } catch (error) {
    console.error('送出報價失敗:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/garage/work-orders/:id/photos - 上傳施工照片
router.post('/work-orders/:id/photos', async (req, res) => {
  try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');
    
    const workDir = path.join(__dirname, '../../media/work_photos');
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

    const upload = multer({
      storage: multer.diskStorage({
        destination: workDir,
        filename: (req, file, cb) => {
          cb(null, `wo_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`);
        }
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
        else cb(Object.assign(new Error('只支援 JPEG/PNG/WebP 格式'), { code: 'INVALID_FILE_TYPE' }));
      }
    });

    // 處理單檔上傳
    upload.single('photo')(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: '請上傳照片' });

      const workOrder = await prisma.workOrder.findFirst({
        where: { id: parseInt(req.params.id), garage_id: req.workshopId }
      });
      if (!workOrder) return res.status(404).json({ error: '工單不存在' });

      const photoUrl = `/media/work_photos/${req.file.filename}`;
      
      // 更新工單照片記錄
      let photos = [];
      if (workOrder.photos) {
        try { photos = JSON.parse(workOrder.photos); } catch {}
      }
      photos.push({ 
        url: photoUrl, 
        time: new Date().toISOString(),
        type: req.body.type || 'PROGRESS' // PROGRESS, BEFORE, AFTER, ISSUE
      });

      await prisma.workOrder.update({
        where: { id: parseInt(req.params.id) },
        data: { photos: JSON.stringify(photos) }
      });

      res.json({ success: true, photoUrl, photos });
    });
  } catch (error) {
    res.status(500).json({ error: '上傳失敗' });
  }
});

// ==================== LINE 通知函數 ====================

async function notifyWorkOrderStatus(workOrder, customer, status) {
  try {
    const statusLabels = {
      'RECEIVED': '🚗 已接車',
      'QUOTING': '📋 報價中',
      'CUSTOMER_CONFIRMED': '✅ 客戶確認，開始施工',
      'IN_PROGRESS': '🔧 維修進行中',
      'QUALITY_CHECK': '🔍 品質檢查中',
      'COMPLETED': '✅ 施工完工',
      'READY_FOR_PICKUP': '📦 可取車',
      'DELIVERED': '🎉 已交車完成',
      'CANCELLED': '❌ 已取消'
    };

    const lines = [
      `${statusLabels[status] || status}`,
      `━━━━━━━━━━━━━━`,
      `🚗 ${workOrder.vehicle?.make || ''} ${workOrder.vehicle?.model || ''} (${workOrder.vehicle?.licensePlate || ''})`,
      `📋 工單號：#${workOrder.id}`
    ];

    if (workOrder.technician) {
      lines.push(`👨‍🔧 負責技師：${workOrder.technician.name}`);
    }

    if (status === 'QUOTING' && workOrder.quote_amount) {
      lines.push(`💰 預估總價：NT$ ${Number(workOrder.quote_amount).toLocaleString()}`);
      lines.push(`⏰ 報價有效期至：${workOrder.quote_valid_until ? new Date(workOrder.quote_valid_until).toLocaleString('zh-TW') : '24小時'}`);
    }

    if (workOrder.estimated_completion) {
      lines.push(`⏱️ 預計完工：${new Date(workOrder.estimated_completion).toLocaleString('zh-TW')}`);
    }

    lines.push(`━━━━━━━━━━━━━━`, `請至 [我的工單] 查看詳細進度。`);
    
    const { pushMessage } = require('../services/lineService');
    await pushMessage(customer.lineId, lines.join('\n'));
  } catch (err) {
    console.error('工單狀態通知失敗:', err.message);
  }
}

async function notifyWorkOrderQuote(workOrder, customer) {
  try {
    const lines = [
      `📋 維修報價單`,
      `━━━━━━━━━━━━━━`,
      `🚗 ${workOrder.vehicle?.make || ''} ${workOrder.vehicle?.model || ''} (${workOrder.vehicle?.licensePlate || ''})`,
      `📋 工單號：#${workOrder.id}`
    ];

    if (Array.isArray(workOrder.items) && workOrder.items.length > 0) {
      lines.push(`🔧 零件費用：`);
      workOrder.items.forEach(item => {
        lines.push(`  • ${item.name} x${item.quantity} = NT$ ${(Number(item.unit_price) * item.quantity).toLocaleString()}`);
      });
    }

    if (Array.isArray(workOrder.laborItems) && workOrder.laborItems.length > 0) {
      lines.push(`👨‍🔧 工資費用：`);
      workOrder.laborItems.forEach(item => {
        lines.push(`  • ${item.name} = NT$ ${Number(item.amount).toLocaleString()}`);
      });
    }

    const subtotal = (workOrder.items || []).reduce((sum, item) => sum + Number(item.unit_price || 0) * item.quantity, 0) +
                     (workOrder.laborItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    lines.push(`━━━━━━━━━━━━━━`);
    lines.push(`💰 小計：NT$ ${subtotal.toLocaleString()}`);
    lines.push(`💰 稅金 (5%)：NT$ ${tax.toLocaleString()}`);
    lines.push(`💰 總計：NT$ ${total.toLocaleString()}`);
    lines.push(`⏰ 請於 ${workOrder.quote_valid_until ? new Date(workOrder.quote_valid_until).toLocaleString('zh-TW') : '24小時內'} 確認`);
    lines.push(`━━━━━━━━━━━━━━`, `請至 [我的工單] 確認或拒絕報價。`);

    const { pushMessage } = require('../services/lineService');
    await pushMessage(customer.lineId, lines.join('\n'));
  } catch (err) {
    console.error('報價通知失敗:', err.message);
  }
}

module.exports = router;