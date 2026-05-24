// index.js — Carparts API (Express + Prisma)
// 支援：前台搜尋、後台管理、車型過濾、訂單系統、適用車型編輯

require("dotenv").config();

const multer = require("multer");
const Papa = require("papaparse");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.text({ type: "text/csv", limit: "10mb" }));

// 靜態資源
const mediaDir = path.join(process.cwd(), "media");
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
app.use("/media", express.static(mediaDir));

app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

/* ============================== Helpers ============================== */
const toIntNonNeg = (v, d = 0) => {
  const n = Math.trunc(Number(String(v ?? "").replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? Math.max(0, n) : d;
};
const toNullableInt = (v) => {
  if (v === "" || v == null) return null;
  const n = Math.trunc(Number(String(v).replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : null;
};

function parseIdParam(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return null;
  }
  return id;
}

function parseWorkshopId(req) {
  const fromHeader = req.headers["x-workshop-id"] ?? req.headers["x-workshop"];
  const raw = fromHeader ?? req.query.workshopId ?? req.query.workshop_id;
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// 配額檢查邏輯
async function prepareWorkshopQuota(workshopId) {
  if (!workshopId) return null;
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const limit = 100; 

  const usage = await prisma.workshopQueryUsage.upsert({
    where: { workshop_id_year_month: { workshop_id: workshopId, year_month: yearMonth } },
    create: { workshop_id: workshopId, year_month: yearMonth, query_count: 0, rows_returned: 0 },
    update: {},
  });

  if (limit != null && usage.query_count >= limit) {
    return { allowed: false, limit, remaining: 0, usageKey: { workshop_id: workshopId, year_month: yearMonth }, maxRowsPerQuery: 50 };
  }
  return { allowed: true, limit, remaining: Math.max(0, limit - usage.query_count), usageKey: { workshop_id: workshopId, year_month: yearMonth }, maxRowsPerQuery: 50 };
}

async function finalizeWorkshopQuota(quotaCtx, rowsReturned) {
  if (!quotaCtx?.usageKey) return;
  const count = Math.max(0, rowsReturned != null ? Number(rowsReturned) : 0);
  await prisma.workshopQueryUsage.update({
    where: { workshop_id_year_month: quotaCtx.usageKey },
    data: { query_count: { increment: 1 }, rows_returned: { increment: count }, last_query_at: new Date() },
  });
}

// 資料裝飾器 (加入分類名、車型摘要)
async function decorateParts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const partIds = rows.map(r => r.id);

  const subcategoryIds = Array.from(new Set(rows.map(r => r.subcategory_id).filter(Boolean)));
  const subcategories = subcategoryIds.length
    ? await prisma.subcategories.findMany({ where: { id: { in: subcategoryIds } }, select: { id: true, name: true } })
    : [];
  const subMap = new Map(subcategories.map(sc => [sc.id, sc]));

  const pc = await prisma.partCompatibility.findMany({
    where: { part_id: { in: partIds } }, select: { part_id: true, vehicle_id: true }
  });
  const vIds = Array.from(new Set(pc.map(p => p.vehicle_id)));
  
  let vMap = new Map();
  if (vIds.length) {
      const variants = await prisma.vehicleVariant.findMany({
          where: { id: { in: vIds } },
          select: { id: true, variant_name: true, make: true, model: true, generation: true, year_start: true, year_end: true }
      });
      vMap = new Map(variants.map(v => [v.id, v]));
  }

  const pcsByPart = new Map();
  for (const rel of pc) {
    if (!pcsByPart.has(rel.part_id)) pcsByPart.set(rel.part_id, []);
    pcsByPart.get(rel.part_id).push(rel.vehicle_id);
  }

  for (const r of rows) {
    r.subcategory_name = r.subcategory_id ? subMap.get(r.subcategory_id)?.name || "" : "";
    const vs = pcsByPart.get(r.id) || [];
    if (!vs.length) {
      r.compatibility_summary = "";
    } else {
      const chips = [];
      for (const vid of vs.slice(0, 3)) {
        const v = vMap.get(vid); if (!v) continue;
        const y = v.year_start && v.year_end ? (v.year_start === v.year_end ? `${v.year_start}` : `${v.year_start}-${v.year_end}`) : "";
        const text = [v.make, v.model, v.generation, v.variant_name, y].filter(Boolean).join(" ");
        chips.push(text);
      }
      const more = vs.length > 3 ? ` ... (${vs.length})` : "";
      r.compatibility_summary = chips.join(", ") + more;
    }
  }
  return rows;
}

/* ============================== Admin Routes ============================== */

// GET Parts List
app.get("/admin/parts", async (req, res) => {
    try {
        const { page = 1, limit = 20, q } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {};
        if (q) {
            const s = String(q).trim();
            where.OR = [
                { sku: { contains: s, mode: "insensitive" } },
                { name: { contains: s, mode: "insensitive" } },
                { brand: { contains: s, mode: "insensitive" } },
            ];
        }
        const [items, total] = await Promise.all([
            prisma.part.findMany({ where, skip, take, orderBy: { created_at: 'desc' }, include: { subcategory: true } }),
            prisma.part.count({ where })
        ]);
        await decorateParts(items);
        res.json({ items, total });
    } catch (e) {
        console.error("GET /admin/parts error:", e);
        res.status(500).json({ error: "Failed to load admin parts", detail: e.message });
    }
});

// GET Single Part (包含詳細的適用車型清單)
app.get("/admin/parts/:id", async (req, res) => {
    try {
        const id = parseIdParam(req, res); if (id == null) return;
        const part = await prisma.part.findUnique({
            where: { id },
            include: {
                compatible_vehicles: {
                    include: { vehicle: true } 
                }
            }
        });
        if (!part) return res.status(404).json({ error: "Not found" });
        res.json(part);
    } catch (e) {
        res.status(500).json({ error: "Failed to load part details", detail: e.message });
    }
});

// Create Part
app.post("/admin/parts", async (req, res) => {
    try {
        const { sku, name, brand, stock_qty, msrp_price, wholesale_price, description, image_url, lead_time_days, is_active } = req.body;
        const part = await prisma.part.create({
            data: {
                sku, name, brand, description, image_url,
                stock_qty: toIntNonNeg(stock_qty),
                msrp_price: Number(msrp_price || 0),
                wholesale_price: Number(wholesale_price || 0),
                preorder_lead_time_days: toIntNonNeg(lead_time_days, 21),
                is_active: is_active ?? true
            }
        });
        res.json(part);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update Part
app.put("/admin/parts/:id", async (req, res) => {
    try {
        const id = parseIdParam(req, res); if (id == null) return;
        const { sku, name, brand, stock_qty, msrp_price, wholesale_price, description, image_url, lead_time_days, is_active } = req.body;
        
        await prisma.part.update({
            where: { id },
            data: {
                sku, name, brand, description, image_url,
                stock_qty: toIntNonNeg(stock_qty),
                msrp_price: Number(msrp_price || 0),
                wholesale_price: Number(wholesale_price || 0),
                preorder_lead_time_days: toIntNonNeg(lead_time_days, 21),
                is_active: is_active
            }
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete Part
app.delete("/admin/parts/:id", async (req, res) => {
    try {
        const id = parseIdParam(req, res); if (id == null) return;
        await prisma.$transaction([
            prisma.partsOnCategories.deleteMany({ where: { part_id: id } }),
            prisma.partCompatibility.deleteMany({ where: { part_id: id } }),
            prisma.part.delete({ where: { id } }),
        ]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 批次操作
app.post("/admin/parts/batch", async (req, res) => {
    try {
        const { ids, action } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No selection" });

        if (action === 'delete') {
            await prisma.$transaction(async (tx) => {
                await tx.partsOnCategories.deleteMany({ where: { part_id: { in: ids } } });
                await tx.partCompatibility.deleteMany({ where: { part_id: { in: ids } } });
                await tx.part.deleteMany({ where: { id: { in: ids } } });
            });
        } else if (action === 'publish') {
            await prisma.part.updateMany({ where: { id: { in: ids } }, data: { is_active: true } });
        } else if (action === 'unpublish') {
            await prisma.part.updateMany({ where: { id: { in: ids } }, data: { is_active: false } });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin Stats (補回：儀表板數據)
app.get("/admin/stats/users", async (req, res) => {
    try {
        const totalUsers = await prisma.workshop.count();
        res.json({ totalUsers });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

// 新增適用車型 (Add Compatibility)
app.post("/admin/parts/:id/vehicles", async (req, res) => {
    try {
        const partId = parseIdParam(req, res); if (partId == null) return;
        const { vehicleId } = req.body;
        
        if (!vehicleId) return res.status(400).json({ error: "Missing vehicleId" });

        // 使用 upsert 避免重複錯誤
        await prisma.partCompatibility.upsert({
            where: { part_id_vehicle_id: { part_id: partId, vehicle_id: Number(vehicleId) } },
            create: { part_id: partId, vehicle_id: Number(vehicleId) },
            update: {}
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Add vehicle error:", e);
        res.status(500).json({ error: "Failed to add vehicle" });
    }
});

// 移除適用車型 (Remove Compatibility)
app.delete("/admin/parts/:id/vehicles/:vehicleId", async (req, res) => {
    try {
        const partId = parseIdParam(req, res); 
        const vehicleId = Number(req.params.vehicleId);
        if (partId == null || !vehicleId) return res.status(400).json({ error: "Invalid IDs" });

        await prisma.partCompatibility.deleteMany({
            where: { part_id: partId, vehicle_id: vehicleId }
        });
        res.json({ success: true });
    } catch (e) {
        console.error("Remove vehicle error:", e);
        res.status(500).json({ error: "Failed to remove vehicle" });
    }
});

// 訂單建立 (Checkout)
app.post("/orders", async (req, res) => {
  try {
    const { items, company_name, buyer_name, phone, email, tax_id, shipping_address, note, shipping_fee, total_amount } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "購物車為空" });
    }

    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    // 暫時使用 ID 1 作為訪客 (若無則建立)
    let workshopId = 1; 
    const guest = await prisma.workshop.findUnique({ where: { id: 1 } });
    if (!guest) {
        const anyWorkshop = await prisma.workshop.findFirst();
        if (anyWorkshop) workshopId = anyWorkshop.id;
        else {
             const newGuest = await prisma.workshop.create({
                 data: {
                     email: "guest@example.com", password_hash: "guest", company_name: "Guest", line_id: "guest",
                     contact_person: "Guest", phone: "0900000000", address: "Guest Address"
                 }
             });
             workshopId = newGuest.id;
        }
    }

    await prisma.order.create({
      data: {
        order_number: orderNumber,
        workshop_id: workshopId, 
        status: "PENDING_PAYMENT",
        subtotal_amount: Number(total_amount) - Number(shipping_fee),
        shipping_fee: Number(shipping_fee),
        total_amount: Number(total_amount),
        shipping_address: shipping_address || "",
        items: {
          create: items.map(item => ({
            part_id: item.id,
            qty: item.qty,
            sku_snapshot: "TEMP",
            name_snapshot: "TEMP",
            price_snapshot: 0,
          }))
        }
      }
    });
    res.json({ success: true, order_number: orderNumber });
  } catch (e) {
    console.error("Create Order Error:", e);
    res.status(500).json({ error: "訂單建立失敗", detail: e.message });
  }
});

/* ============================== Public Routes ============================== */

// GET Parts (Public Search) - 已優化與修復 Bug
app.get("/parts", async (req, res) => {
  try {
    const { search, sku, categoryId, subcategoryId, variantId, makeId, modelId, year, brand, sort = "skuAsc", page = 1, pageSize = 24, raw } = req.query;
    
    // --- 1. 配額檢查 ---
    const workshopId = parseWorkshopId(req);
    const quotaCtx = await prepareWorkshopQuota(workshopId);
    if (quotaCtx && quotaCtx.allowed === false) {
        return res.status(429).json({ error: "limit_reached" });
    }

    // --- 2. 構建 Prisma 查詢條件 (修復 500 錯誤的關鍵) ---
    const where = { is_active: true, AND: [] };

    // 關鍵字搜尋
    if (search) {
      const s = String(search).trim();
      where.AND.push({
        OR: [
          { sku: { contains: s, mode: "insensitive" } },
          { name: { contains: s, mode: "insensitive" } },
          { brand: { contains: s, mode: "insensitive" } }
        ]
      });
    } else if (sku) {
      where.sku = String(sku);
    }

    // 車型鎖定 (使用 Prisma 原生關聯查詢，取代原本複雜的 Set 邏輯)
    if (variantId) {
      where.compatible_vehicles = { some: { vehicle_id: Number(variantId) } };
    } else if (makeId || modelId || year) {
      const vWhere = {};
      if (makeId) vWhere.make = String(makeId);
      if (modelId) vWhere.model = String(modelId);
      if (year) {
        vWhere.year_start = { lte: Number(year) };
        vWhere.year_end = { gte: Number(year) };
      }
      where.compatible_vehicles = { some: { vehicle: vWhere } };
    }

    // 分類鎖定
    if (subcategoryId) {
      where.subcategory_id = Number(subcategoryId);
    } else if (categoryId) {
      where.AND.push({
        OR: [
          { subcategory: { category_id: Number(categoryId) } },
          { parts_on_categories: { some: { category_id: Number(categoryId) } } }
        ]
      });
    }

    // 清理空的 AND 陣列
    if (where.AND.length === 0) delete where.AND;

    // --- 3. 排序與分頁 ---
    let orderBy = [{ sku: "asc" }];
    if (sort.toLowerCase() === "priceasc") orderBy = [{ msrp_price: "asc" }];
    if (sort.toLowerCase() === "pricedesc") orderBy = [{ msrp_price: "desc" }];

    const pageNum = Math.max(1, Number(page));
    const maxRows = quotaCtx ? (quotaCtx.maxRowsPerQuery || 50) : 50;
    const take = Math.min(Number(pageSize), maxRows);
    const skip = (pageNum - 1) * take;

    // --- 4. 執行查詢 ---
    const [items, total] = await Promise.all([
      prisma.part.findMany({ where, orderBy, skip, take }),
      prisma.part.count({ where })
    ]);

    if (raw !== "1") await decorateParts(items);
    if (quotaCtx) await finalizeWorkshopQuota(quotaCtx, items.length);

    // --- 5. 回傳資料 ---
    return res.json({ 
        items, 
        total, 
        quota: quotaCtx ? { limit: quotaCtx.limit, remaining: quotaCtx.remaining } : null 
    });

  } catch (err) {
    // 🔥 最重要的一行：若再出錯，終端機終於會告訴我們原因了！
    console.error("API /parts 錯誤 (崩潰詳情):", err);
    res.status(500).json({ error: "Failed to load parts", detail: err.message });
  }
});

app.get("/parts/:id", async (req, res) => { /* 保留原本結構或補上單筆查詢 */ });

// Category & Vehicle APIs
// ==========================================
// 取得所有年份 (解決前端 404 錯誤)
// ==========================================
app.get("/years", async (req, res) => {
  try {
    const variants = await prisma.vehicleVariant.findMany({
      select: { year_start: true, year_end: true }
    });
    const yearSet = new Set();
    variants.forEach(v => {
      if (v.year_start) yearSet.add(v.year_start);
      if (v.year_end) yearSet.add(v.year_end);
    });
    const years = Array.from(yearSet).sort((a, b) => b - a);
    res.json(years);
  } catch (error) {
    console.error('API /years 錯誤:', error);
    res.status(500).json({ error: '無法取得年份列表' });
  }
});

app.get("/categories/tree", async (req, res) => {
    const roots = await prisma.categories.findMany({ where: { is_active: true }, include: { subcategories: { where: { is_active: true }, orderBy: { sort_order: "asc" } } }, orderBy: { sort_order: "asc" } });
    res.json(roots);
});
app.get("/makes", async (req, res) => {
    const makes = await prisma.vehicleVariant.findMany({ distinct: ['make'], select: { make: true }, orderBy: { make: 'asc' } });
    res.json(makes.map(m => ({ id: m.make, name: m.make })));
});
// 支援 year 參數過濾
app.get("/models", async (req, res) => {
    const make = req.query.makeId; const year = toNullableInt(req.query.year);
    if(!make) return res.json([]);
    const where = { make: String(make) };
    if (year) { where.year_start = { lte: year }; where.year_end = { gte: year }; }
    const models = await prisma.vehicleVariant.findMany({ where, distinct: ['model'], select: { model: true }, orderBy: { model: 'asc' } });
    res.json(models.map(m => ({ id: m.model, name: m.model })));
});
app.get("/variants", async (req, res) => {
    const { modelId, makeId, year } = req.query; const where = {};
    if (modelId) where.model = String(modelId);
    if (makeId) where.make = String(makeId);
    if (year) { const y = Number(year); where.year_start = { lte: y }; where.year_end = { gte: y }; }
    const rows = await prisma.vehicleVariant.findMany({ where, orderBy: { id: "asc" } });
    res.json(rows.map(v => ({ ...v, name: v.variant_name, generation_name: v.generation })));
});

// CSV Import (已升級：支援完整的價格、庫存與品牌更新)
const upload = multer({ storage: multer.memoryStorage() });
app.post("/parts/bulk", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    try {
        const csv = req.file.buffer.toString("utf-8");
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        let count = 0;
        for(const row of parsed.data) {
            if(row.sku && row.name) {
                // 智慧抓取：支援你 CSV 裡可能的多種欄位命名習慣
                const msrp = Number(row.msrp || row.msrp_price || row.msrp_twd || 0);
                const wholesale = Number(row.wholesale || row.wholesale_price || row.wholesale_twd || 0);
                const stock = Number(row.stock_qty || row.stock || 0);
                const brand = row.brand || "Generic";

                await prisma.part.upsert({ 
                    where: { sku: row.sku },
                    update: { 
                        name: row.name, 
                        msrp_price: msrp,
                        wholesale_price: wholesale,
                        stock_qty: stock,
                        brand: brand
                    },
                    create: { 
                        sku: row.sku, 
                        name: row.name, 
                        msrp_price: msrp,
                        wholesale_price: wholesale,
                        stock_qty: stock,
                        brand: brand
                    }
                });
                count++;
            }
        }
        res.json({ message: "Imported", count });
    } catch(e) { res.status(500).json({error: e.message}); }
});

/* ============================== Server Start ============================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API listening at http://localhost:${PORT}`));