// index.js — Carparts API (Express + Prisma)
// 支援：前台搜尋 (含配額)、後台管理 (含批次操作)、車型過濾、訂單系統

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

// ---- 靜態檔 (圖片)
const mediaDir = path.join(process.cwd(), "media");
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
app.use("/media", express.static(mediaDir));

// ---- 健康檢查
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

// ---- 配額相關 Helper
function parseWorkshopId(req) {
  const fromHeader = req.headers["x-workshop-id"] ?? req.headers["x-workshop"];
  const raw = fromHeader ?? req.query.workshopId ?? req.query.workshop_id;
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function prepareWorkshopQuota(workshopId) {
  if (!workshopId) return null;
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // 注意：schema 中沒有 workshop_plans 表，這裡暫時略過方案檢查，預設給額度
  const limit = 100; // 預設每月 100 次

  // 使用 prisma.workshopQueryUsage (對應 model WorkshopQueryUsage)
  const usage = await prisma.workshopQueryUsage.upsert({
    where: { workshop_id_year_month: { workshop_id: workshopId, year_month: yearMonth } },
    create: {
      workshop_id: workshopId,
      year_month: yearMonth,
      query_count: 0,
      rows_returned: 0,
    },
    update: {},
  });

  if (limit != null && usage.query_count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      usageKey: { workshop_id: workshopId, year_month: yearMonth },
      maxRowsPerQuery: 50,
    };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - usage.query_count),
    usageKey: { workshop_id: workshopId, year_month: yearMonth },
    maxRowsPerQuery: 50,
  };
}

async function finalizeWorkshopQuota(quotaCtx, rowsReturned) {
  if (!quotaCtx?.usageKey) return;
  const count = Math.max(0, rowsReturned != null ? Number(rowsReturned) : 0);
  await prisma.workshopQueryUsage.update({
    where: { workshop_id_year_month: quotaCtx.usageKey },
    data: {
      query_count: { increment: 1 },
      rows_returned: { increment: count },
      last_query_at: new Date(),
    },
  });
}

// ---- 裝飾 Parts (Category & Vehicle Summary)
async function decorateParts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const partIds = rows.map(r => r.id);

  // 1. 取得分類名稱 (prisma.subcategories)
  const subcategoryIds = Array.from(new Set(rows.map(r => r.subcategory_id).filter(Boolean)));
  const subcategories = subcategoryIds.length
    ? await prisma.subcategories.findMany({
        where: { id: { in: subcategoryIds } },
        select: { id: true, name: true, category_id: true },
      })
    : [];
  const subMap = new Map(subcategories.map(sc => [sc.id, sc]));

  // 2. 取得車型相容性摘要 (prisma.partCompatibility)
  const pc = await prisma.partCompatibility.findMany({
    where: { part_id: { in: partIds } }, select: { part_id: true, vehicle_id: true } // 注意 schema 是 vehicle_id
  });
  const vIds = Array.from(new Set(pc.map(p => p.vehicle_id)));
  
  let vMap = new Map();
  if (vIds.length) {
      // prisma.vehicleVariant
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
    // 處理分類顯示
    r.category_name = "";
    r.subcategory_name = "";
    if (r.subcategory_id) {
        const s = subMap.get(r.subcategory_id);
        if (s) {
            r.subcategory_name = s.name;
        }
    }

    // 處理車型摘要
    const vs = pcsByPart.get(r.id) || [];
    if (!vs.length) {
      r.compatibility_summary = "";
    } else {
      const chips = [];
      for (const vid of vs.slice(0, 3)) {
        const v = vMap.get(vid); if (!v) continue;
        const makeName = v.make || "";
        const modelName = v.model || "";
        const genName = v.generation || "";
        
        const y = v.year_start && v.year_end
          ? (v.year_start === v.year_end ? `${v.year_start}` : `${v.year_start}-${v.year_end}`)
          : "";
        const text = [makeName, modelName, genName, v.variant_name, y].filter(Boolean).join(" ");
        chips.push(text);
      }
      const more = vs.length > 3 ? ` ... (${vs.length})` : "";
      r.compatibility_summary = chips.join(", ") + more;
    }
  }
  return rows;
}


/* ============================== Admin Routes (後台專用) ============================== */

// 1. Admin GET Parts (prisma.part)
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
            prisma.part.findMany({ // ✅ 修正：prisma.part
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' },
                include: { subcategory: true }
            }),
            prisma.part.count({ where })
        ]);

        await decorateParts(items);

        res.json({ items, total });
    } catch (e) {
        console.error("GET /admin/parts error:", e);
        res.status(500).json({ error: "Failed to load admin parts", detail: e.message });
    }
});

// 2. Admin DELETE Part
app.delete("/admin/parts/:id", async (req, res) => {
    try {
        const id = parseIdParam(req, res); 
        if (id == null) return;
        
        await prisma.$transaction([
            prisma.partsOnCategories.deleteMany({ where: { part_id: id } }), // ✅ 修正：prisma.partsOnCategories
            prisma.partCompatibility.deleteMany({ where: { part_id: id } }), // ✅ 修正：prisma.partCompatibility
            prisma.part.delete({ where: { id } }), // ✅ 修正：prisma.part
        ]);
        
        res.json({ success: true });
    } catch (e) {
        console.error("DELETE /admin/parts/:id error:", e);
        res.status(500).json({ error: "刪除失敗", detail: e.message });
    }
});

// 3. Admin Batch Operations
app.post("/admin/parts/batch", async (req, res) => {
    try {
        const { ids, action } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "未選取任何項目" });
        }

        if (action === 'delete') {
            await prisma.$transaction(async (tx) => {
                await tx.partsOnCategories.deleteMany({ where: { part_id: { in: ids } } });
                await tx.partCompatibility.deleteMany({ where: { part_id: { in: ids } } });
                await tx.part.deleteMany({ where: { id: { in: ids } } });
            });
        } else if (action === 'publish') {
            await prisma.part.updateMany({
                where: { id: { in: ids } },
                data: { is_active: true }
            });
        } else if (action === 'unpublish') {
            await prisma.part.updateMany({
                where: { id: { in: ids } },
                data: { is_active: false }
            });
        } else {
            return res.status(400).json({ error: "未知操作" });
        }

        res.json({ success: true });
    } catch (e) {
        console.error("POST /admin/parts/batch error:", e);
        res.status(500).json({ error: "批次操作失敗", detail: e.message });
    }
});

// Admin Stats
app.get("/admin/stats/users", async (req, res) => {
    try {
        const totalUsers = await prisma.workshop.count(); // ✅ 修正：使用 workshop 替代 users
        res.json({ totalUsers });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

/* ============================== Public Routes (前台商店) ============================== */

// 1. Public GET Parts
app.get("/parts", async (req, res) => {
  try {
    const {
      search, sku, categoryId, subcategoryId, variantId, makeId, modelId, generationId, year, brand,
      sort = "skuAsc", page, pageSize, raw
    } = req.query;

    const workshopId = parseWorkshopId(req);
    const quotaCtx = await prepareWorkshopQuota(workshopId);
    if (quotaCtx && quotaCtx.allowed === false) {
      return res.status(429).json({
        error: "workshop_query_limit_reached",
        message: "查詢次數已用完",
        limit: quotaCtx.limit,
        remaining: quotaCtx.remaining,
      });
    }

    // 2. 車型過濾
    let variantIdsForFilter = null;
    if (variantId || makeId || modelId || generationId || year) {
      const vWhere = {};
      if (variantId) vWhere.id = Number(variantId);
      // 因為 schema 中 VehicleVariant 是 flat 結構 (make, model string)，這裡做簡單對應
      // 若需要更精確的 ID 查詢，可能需要調整 schema，這裡假設前端傳來的是 string 或我們無法用 ID 查 string 欄位
      // 暫時略過 ID 轉 String 的複雜邏輯，僅處理 variantId
      
      const vars = await prisma.vehicleVariant.findMany({ where: vWhere, select: { id: true } });
      variantIdsForFilter = vars.map(v => v.id);
      if (!variantIdsForFilter.length && (variantId)) return res.json({ items: [], total: 0 });
    }

    // 3. 分類過濾
    let restrictIds = null;
    if (categoryId || subcategoryId) {
        const partIdSet = new Set();
        const toInt = (val) => (Number.isInteger(Number(val)) && Number(val) > 0 ? Number(val) : null);

        if (subcategoryId) {
            const subIdNum = toInt(subcategoryId);
            if (subIdNum) {
                const partsBySub = await prisma.part.findMany({ // ✅ 修正：prisma.part
                    where: { subcategory_id: subIdNum },
                    select: { id: true }
                });
                partsBySub.forEach(r => partIdSet.add(r.id));
            }
        } 
        else if (categoryId) {
            const catIdNum = toInt(categoryId);
            if (catIdNum) {
                const subs = await prisma.subcategories.findMany({ where: { category_id: catIdNum }, select: { id: true } });
                const subIds = subs.map(s => s.id);
                if (subIds.length) {
                    const p = await prisma.part.findMany({ where: { subcategory_id: { in: subIds } }, select: { id: true } });
                    p.forEach(r => partIdSet.add(r.id));
                }
                const links = await prisma.partsOnCategories.findMany({ where: { category_id: catIdNum }, select: { part_id: true } });
                links.forEach(l => partIdSet.add(l.part_id));
            }
        }
        restrictIds = partIdSet;
        if (restrictIds.size === 0) return res.json({ items: [], total: 0 });
    }

    // 4. 車型與分類交集
    if (variantIdsForFilter) {
      const varLinks = await prisma.partCompatibility.findMany({ // ✅ 修正
        where: { vehicle_id: { in: variantIdsForFilter } }, select: { part_id: true }
      });
      const ids = new Set(varLinks.map(v => v.part_id));
      if (restrictIds) restrictIds = new Set([...restrictIds].filter(id => ids.has(id)));
      else restrictIds = ids;
      if (restrictIds.size === 0) return res.json({ items: [], total: 0 });
    }

    // 5. 構建 Prisma Where
    const where = { is_active: true };
    if (sku) where.sku = String(sku);
    if (brand) where.brand = { contains: String(brand), mode: "insensitive" };
    
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { sku: { contains: s, mode: "insensitive" } },
        { name: { contains: s, mode: "insensitive" } },
        { brand: { contains: s, mode: "insensitive" } },
        { category: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
      ];
    }
    if (restrictIds && restrictIds.size) where.id = { in: Array.from(restrictIds) };

    // 6. 排序
    let orderBy = [{ sku: "asc" }];
    switch (String(sort).toLowerCase()) {
      case "skudesc": orderBy = [{ sku: "desc" }]; break;
      case "priceasc": orderBy = [{ msrp_price: "asc" }, { sku: "asc" }]; break; // schema 是 msrp_price
      case "pricedesc": orderBy = [{ msrp_price: "desc" }, { sku: "asc" }]; break;
    }

    // 7. 分頁
    const maxRowsPerQuery = quotaCtx ? (quotaCtx.maxRowsPerQuery || 50) : 50;

    if (page && pageSize) {
      const requestedTake = Math.max(1, Math.min(100, Number(pageSize)));
      const take = Math.min(requestedTake, maxRowsPerQuery);
      const skip = Math.max(0, (Number(page) - 1) * take);
      
      const [items, total] = await Promise.all([
        prisma.part.findMany({ where, orderBy, skip, take }), // ✅ 修正：prisma.part
        prisma.part.count({ where })
      ]);
      
      if (raw !== "1") await decorateParts(items);
      if (quotaCtx) await finalizeWorkshopQuota(quotaCtx, items.length);
      
      const response = { items, total };
      if (quotaCtx) {
        response.quota = {
            limit: quotaCtx.limit,
            remaining: quotaCtx.limit != null ? Math.max(0, (quotaCtx.remaining ?? 0) - 1) : null
        };
      }
      return res.json(response);
    } else {
        const rows = await prisma.part.findMany({ where, orderBy, take: maxRowsPerQuery }); // ✅ 修正
        if (raw !== "1") await decorateParts(rows);
        if (quotaCtx) await finalizeWorkshopQuota(quotaCtx, rows.length);
        return res.json({ items: rows, total: rows.length });
    }
  } catch (err) {
    console.error("GET /parts error:", err);
    res.status(500).json({ error: "Failed to load parts", detail: String(err.message || err) });
  }
});

// GET Single Part
app.get("/parts/:id", async (req, res) => {
  try {
    const id = parseIdParam(req, res); if (id == null) return;
    let row = await prisma.part.findUnique({ // ✅ 修正
      where: { id },
      include: { parts_on_categories: true, compatible_vehicles: true } // 使用 schema 定義的關聯名稱
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    await decorateParts([row]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: "Failed to load part" }); }
});


/* ============================== Other Routes ============================== */

// Categories Tree
app.get("/categories/tree", async (req, res) => {
    try {
        const showAll = req.query.all === "1";
        const where = showAll ? {} : { is_active: true };

        const roots = await prisma.categories.findMany({
            where,
            include: {
                subcategories: {
                    where: showAll ? {} : { is_active: true },
                    orderBy: { sort_order: "asc" }
                }
            },
            orderBy: { sort_order: "asc" }
        });
        res.json(roots);
    } catch (e) { res.status(500).json({ error: "Failed to load categories" }); }
});

// Vehicle Selectors (使用 VehicleVariant 聚合查詢，因為 schema 沒有 Make/Model 表)
app.get("/makes", async (req, res) => {
    try {
        // 從 vehicle_variants 找出所有不重複的 make
        const makes = await prisma.vehicleVariant.findMany({
            distinct: ['make'],
            select: { make: true },
            orderBy: { make: 'asc' }
        });
        // 為了相容前端 <option value={id}>，這裡只好把 name 當 id 回傳，或者前端需要改
        // 這裡回傳 { id: "BMW", name: "BMW" } 格式
        res.json(makes.map((m, i) => ({ id: m.make, name: m.make })));
    } catch(e) { res.status(500).json([]); }
});

app.get("/models", async (req, res) => {
    try {
        const make = req.query.makeId; // 前端傳來的 makeId 其實是 name
        if(!make) return res.json([]);
        const models = await prisma.vehicleVariant.findMany({
            where: { make: String(make) },
            distinct: ['model'],
            select: { model: true },
            orderBy: { model: 'asc' }
        });
        res.json(models.map((m, i) => ({ id: m.model, name: m.model })));
    } catch(e) { res.status(500).json([]); }
});

app.get("/variants", async (req, res) => {
    try {
        const { modelId, makeId, year } = req.query; // modelId 其實是 name
        const where = {};
        if (modelId) where.model = String(modelId);
        if (makeId) where.make = String(makeId);
        if (year) {
             const y = Number(year);
             where.year_start = { lte: y };
             where.year_end = { gte: y };
        }
        
        const rows = await prisma.vehicleVariant.findMany({
            where,
            orderBy: { id: "asc" }
        });
        res.json(rows.map(v => ({
            ...v,
            name: v.variant_name, // 前端預期 name 欄位
            generation_name: v.generation
        })));
    } catch(e) { console.error(e); res.status(500).json([]); }
});


/* ============================== Create/Update Part ============================== */

app.post("/parts", async (req, res) => {
    try {
        const data = req.body;
        const part = await prisma.part.create({ data: { // ✅ 修正
            sku: data.sku, name: data.name, 
            subcategory_id: toNullableInt(data.subcategory_id),
            stock_qty: toIntNonNeg(data.stock_qty),
            is_active: true
        }});
        res.json(part);
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.put("/parts/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma.part.update({ where: { id }, data: req.body }); // ✅ 修正
        res.json({success:true});
    } catch(e) { res.status(500).json({error: e.message}); }
});

/* ============================== CSV Import ============================== */
const upload = multer({ storage: multer.memoryStorage() });

app.post("/parts/bulk", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    try {
        const csv = req.file.buffer.toString("utf-8");
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        let count = 0;
        for(const row of parsed.data) {
            if(row.sku && row.name) {
                await prisma.part.upsert({ // ✅ 修正
                    where: { sku: row.sku },
                    update: { name: row.name, stock_qty: Number(row.stock_qty||0) },
                    create: { sku: row.sku, name: row.name, stock_qty: Number(row.stock_qty||0) }
                });
                count++;
            }
        }
        res.json({ message: "Imported", count });
    } catch(e) { res.status(500).json({error: e.message}); }
});

/* ============================== Server Start ============================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API listening at http://localhost:${PORT}`);
});