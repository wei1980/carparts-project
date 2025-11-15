// index.js — Carparts API (Express + Prisma)
// 統一使用 AvailabilityMode: "stock" | "preorder"
// 規則：stock → lead_time_days=0；preorder → lead_time_days>=1（預設21）

require("dotenv").config();

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
app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now(), mediaDir }));

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
const fixUrl = (p) => (p ? String(p).replace(/\\/g, "/") : null);

function parseIdParam(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return null;
  }
  return id;
}

/** 僅回傳 "stock" | "preorder"（不接受其它字串） */
function normalizeMode(val, stockQty = null) {
  if (val == null || val === "") {
    if (stockQty != null) return toIntNonNeg(stockQty, 0) > 0 ? "stock" : "preorder";
    return null;
  }
  const v = String(val).trim().toLowerCase();
  if (v === "stock") return "stock";
  if (v === "preorder") return "preorder";
  // 其它舊值（lead/mto…）一律歸類
  return stockQty != null ? (toIntNonNeg(stockQty, 0) > 0 ? "stock" : "preorder") : null;
}

/* ====== 補充資訊（不綁死 include 名稱） ====== */
async function decorateParts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const partIds = rows.map(r => r.id);

  // 分類
  const links = await prisma.parts_on_categories.findMany({
    where: { part_id: { in: partIds } }, select: { part_id: true, category_id: true }
  });
  const catIds = Array.from(new Set(links.map(l => l.category_id)));
  const cats = catIds.length
    ? await prisma.categories.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
    : [];
  const catMap = new Map(cats.map(c => [c.id, c.name]));
  const catsByPart = new Map();
  for (const l of links) {
    if (!catsByPart.has(l.part_id)) catsByPart.set(l.part_id, []);
    const name = catMap.get(l.category_id);
    if (name) catsByPart.get(l.part_id).push(name);
  }

  // 相容車型摘要
  const pc = await prisma.part_compatibilities.findMany({
    where: { part_id: { in: partIds } }, select: { part_id: true, vehicle_variant_id: true }
  });
  const vIds = Array.from(new Set(pc.map(p => p.vehicle_variant_id)));
  const variants = vIds.length ? await prisma.vehicle_variants.findMany({
    where: { id: { in: vIds } },
    select: { id: true, name: true, engine_code: true, year_from: true, year_to: true, generation_id: true, model_id: true }
  }) : [];
  const gens = variants.length ? await prisma.generations.findMany({
    where: { id: { in: Array.from(new Set(variants.map(v => v.generation_id))) } },
    select: { id: true, name: true, model_id: true }
  }) : [];
  const models = (variants.length || gens.length) ? await prisma.models.findMany({
    where: { id: { in: Array.from(new Set([...variants.map(v => v.model_id), ...gens.map(g => g.model_id)])) } },
    select: { id: true, name: true, make_id: true }
  }) : [];
  const makes = models.length ? await prisma.makes.findMany({
    where: { id: { in: Array.from(new Set(models.map(m => m.make_id))) } },
    select: { id: true, name: true }
  }) : [];

  const vMap = new Map(variants.map(v => [v.id, v]));
  const gMap = new Map(gens.map(g => [g.id, g]));
  const mMap = new Map(models.map(m => [m.id, m]));
  const mkMap = new Map(makes.map(mk => [mk.id, mk]));

  const pcsByPart = new Map();
  for (const rel of pc) {
    if (!pcsByPart.has(rel.part_id)) pcsByPart.set(rel.part_id, []);
    pcsByPart.get(rel.part_id).push(rel.vehicle_variant_id);
  }

  for (const r of rows) {
    r.categories = catsByPart.get(r.id) || [];
    const vs = pcsByPart.get(r.id) || [];
    if (!vs.length) {
      r.compatibility_summary = "";
    } else {
      const chips = [];
      for (const vid of vs.slice(0, 3)) {
        const v = vMap.get(vid); if (!v) continue;
        const mdl = mMap.get(v.model_id);
        const make = mdl ? mkMap.get(mdl.make_id) : null;
        const gen = gMap.get(v.generation_id);
        const y = v.year_from && v.year_to
          ? (v.year_from === v.year_to ? `${v.year_from}` : `${v.year_from}-${v.year_to}`)
          : "";
        const text = [make?.name, mdl?.name, gen?.name, v.name, y].filter(Boolean).join(" ");
        chips.push(text);
      }
      const more = vs.length > 3 ? ` 等${vs.length}款` : "";
      r.compatibility_summary = chips.join("、") + more;
    }
  }
  return rows;
}

/* ============================== 類別 ============================== */
function buildCategoryTree(rows, { onlyActive = false } = {}) {
  const list = onlyActive ? rows.filter(r => r.is_active) : rows.slice();
  const byParent = new Map();
  for (const r of list) {
    const k = r.parent_id || 0;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(r);
  }
  const attach = (node) => {
    node.children = (byParent.get(node.id) || []).map(child => attach({ ...child })); return node;
  };
  return (byParent.get(0) || []).map(r => attach({ ...r }));
}

app.get("/categories/tree", async (req, res) => {
  try {
    const rows = await prisma.categories.findMany({ orderBy: [{ sort_order: "asc" }, { id: "asc" }] });
    const onlyActive = !(String(req.query.all || "") === "1");
    const tree = buildCategoryTree(rows, { onlyActive });
    res.json(tree);
  } catch (e) { res.status(500).json({ error: "Failed to load category tree", detail: String(e.message || e) }); }
});

/* ============================== 車型下拉 ============================== */
app.get("/makes", async (req, res) => {
  try { res.json(await prisma.makes.findMany({ orderBy: [{ name: "asc" }] })); }
  catch (e) { res.status(500).json({ error: "Failed to load makes", detail: String(e.message || e) }); }
});

app.get("/models", async (req, res) => {
  try {
    const makeId = Number(req.query.makeId);
    res.json(await prisma.models.findMany({ where: makeId ? { make_id: makeId } : {}, orderBy: [{ name: "asc" }] }));
  } catch (e) { res.status(500).json({ error: "Failed to load models", detail: String(e.message || e) }); }
});

// /variants 或 /vehicle_variants 都支援
app.get(["/variants", "/vehicle_variants"], async (req, res) => {
  try {
    const generationId = req.query.generationId ? Number(req.query.generationId) : null;
    const modelId = req.query.modelId ? Number(req.query.modelId) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const where = {};
    if (generationId) where.generation_id = generationId;
    if (modelId) where.model_id = modelId;
    if (year) where.AND = [{ year_from: { lte: year } }, { year_to: { gte: year } }];
    if (!generationId && !modelId && !year) return res.json([]);
    const rows = await prisma.vehicle_variants.findMany({ where, orderBy: [{ id: "asc" }] });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: "Failed to load variants", detail: String(e.message || e) }); }
});

/* ============================== Parts 匯出/匯入 ============================== */
function toCSV(rows, headers) {
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.join(",");
  const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  return head + "\n" + body;
}

app.get("/parts/export", async (req, res) => {
  try {
    const rows = await prisma.parts.findMany({ orderBy: [{ sku: "asc" }] });
    const headers = [
      "sku","name","brand","category","msrp_twd","wholesale_twd","image_url","description",
      "stock_qty","availability_mode","lead_time_days"
    ];
    const format = String(req.query.format || "csv").toLowerCase();

    if (format === "json") {
      res.setHeader("content-disposition", `attachment; filename="parts.json"`);
      return res.json(rows.map(r => {
        const o = {}; headers.forEach(h => o[h] = r[h] ?? null); return o;
      }));
    } else {
      const data = rows.map(r => {
        const o = {}; headers.forEach(h => o[h] = r[h] ?? ""); return o;
      });
      const csv = toCSV(data, headers);
      res.setHeader("content-type", "text/csv; charset=utf-8");
      res.setHeader("content-disposition", `attachment; filename="parts.csv"`);
      return res.send(csv);
    }
  } catch (e) {
    res.status(500).json({ error: "Failed to export parts", detail: String(e.message || e) });
  }
});

app.post("/parts/import", async (req, res) => {
  try {
    let items = [];

    if ((req.headers["content-type"] || "").includes("text/csv")) {
      const csv = String(req.body || "");
      const lines = csv.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return res.json({ ok: true, created: 0, updated: 0 });

      const headers = lines[0].split(",").map(s => s.trim());
      for (let i = 1; i < lines.length; i++) {
        const raw = lines[i];
        // 簡易 CSV parser
        const cols = [];
        let cur = "", inQ = false;
        for (let j = 0; j < raw.length; j++) {
          const ch = raw[j];
          if (inQ) {
            if (ch === '"' && raw[j + 1] === '"') { cur += '"'; j++; }
            else if (ch === '"') { inQ = false; }
            else { cur += ch; }
          } else {
            if (ch === '"') { inQ = true; }
            else if (ch === ",") { cols.push(cur); cur = ""; }
            else { cur += ch; }
          }
        }
        cols.push(cur);

        const obj = {};
        headers.forEach((h, idx) => (obj[h] = cols[idx] ?? ""));
        items.push(obj);
      }
    } else {
      const body = req.body || {};
      items = Array.isArray(body.items) ? body.items : [];
    }

    if (!items.length) return res.json({ ok: true, created: 0, updated: 0 });

    let created = 0, updated = 0;
    for (const it of items) {
      const stock_qty = toIntNonNeg(it.stock_qty, 0);
      const availability_mode = normalizeMode(it.availability_mode, stock_qty) || normalizeMode(null, stock_qty);
      const lead_time_days = availability_mode === "stock" ? 0 : (toIntNonNeg(it.lead_time_days, 21) || 21);

      const data = {
        name: it.name ? String(it.name).trim() : "",
        brand: it.brand ? String(it.brand).trim() : null,
        category: it.category ? String(it.category).trim() : null,
        msrp_twd: toNullableInt(it.msrp_twd),
        wholesale_twd: toNullableInt(it.wholesale_twd),
        image_url: it.image_url ?? null,
        description: it.description ?? null,
        stock_qty,
        availability_mode,
        lead_time_days,
      };
      const sku = String(it.sku || "").trim();
      if (!sku || !data.name) continue;

      const exists = await prisma.parts.findUnique({ where: { sku } });
      if (exists) {
        await prisma.parts.update({ where: { sku }, data });
        updated++;
      } else {
        await prisma.parts.create({ data: { ...data, sku } });
        created++;
      }
    }

    res.json({ ok: true, created, updated });
  } catch (e) {
    res.status(500).json({ error: "Failed to import parts", detail: String(e.message || e) });
  }
});

/* ============================== Parts 查詢/CRUD ============================== */
app.get("/parts", async (req, res) => {
  try {
    const {
      search, sku, categoryId, variantId, makeId, modelId, generationId, year,
      sort = "skuAsc", page, pageSize, raw
    } = req.query;

    // 車型過濾：先找符合的 variant ids
    let variantIdsForFilter = null;
    if (variantId || makeId || modelId || generationId || year) {
      const vWhere = {};
      if (variantId) vWhere.id = Number(variantId);
      if (modelId) vWhere.model_id = Number(modelId);
      if (generationId) vWhere.generation_id = Number(generationId);
      if (makeId) {
        const models = await prisma.models.findMany({ where: { make_id: Number(makeId) }, select: { id: true } });
        const mids = models.map(m => m.id);
        if (!mids.length) return res.json({ items: [], total: 0 });
        vWhere.model_id = { in: mids };
      }
      if (year) {
        const y = Number(year);
        vWhere.AND = [{ year_from: { lte: y } }, { year_to: { gte: y } }];
      }
      const vars = await prisma.vehicle_variants.findMany({ where: vWhere, select: { id: true } });
      variantIdsForFilter = vars.map(v => v.id);
      if (!variantIdsForFilter.length) return res.json({ items: [], total: 0 });
    }

    // 分類過濾（含子孫）
    let restrictIds = null;
    if (categoryId) {
      const all = await prisma.categories.findMany({ select: { id: true, parent_id: true, name: true, is_active: true } });
      const byParent = new Map();
      for (const c of all) { const k = c.parent_id ?? 0; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(c); }
      const ids = new Set([Number(categoryId)]), names = new Set(); const q = [Number(categoryId)];
      while (q.length) {
        const pid = q.shift(); const node = all.find(x => x.id === pid); if (node) names.add(node.name);
        const kids = byParent.get(pid) || []; for (const ch of kids) { if (!ids.has(ch.id)) { ids.add(ch.id); names.add(ch.name); q.push(ch.id); } }
      }
      const catLinks = await prisma.parts_on_categories.findMany({
        where: { category_id: { in: Array.from(ids) } }, select: { part_id: true }
      });
      restrictIds = new Set(catLinks.map(c => c.part_id));
      if (names.size) {
        const nameRows = await prisma.parts.findMany({
          where: { category: { in: Array.from(names) } }, select: { id: true }
        });
        nameRows.forEach(r => restrictIds.add(r.id));
      }
    }

    // 車型過濾：交集
    if (variantIdsForFilter) {
      const varLinks = await prisma.part_compatibilities.findMany({
        where: { vehicle_variant_id: { in: variantIdsForFilter } }, select: { part_id: true }
      });
      const ids = new Set(varLinks.map(v => v.part_id));
      if (restrictIds) restrictIds = new Set([...restrictIds].filter(id => ids.has(id)));
      else restrictIds = ids;
      if (restrictIds.size === 0) return res.json({ items: [], total: 0 });
    }

    const where = {};
    if (sku) where.sku = String(sku);
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

    // 排序
    let orderBy = [{ sku: "asc" }];
    switch (String(sort).toLowerCase()) {
      case "skudesc": orderBy = [{ sku: "desc" }]; break;
      case "priceasc": orderBy = [{ msrp_twd: "asc" }, { sku: "asc" }]; break;
      case "pricedesc": orderBy = [{ msrp_twd: "desc" }, { sku: "asc" }]; break;
    }

    const include = { parts_on_categories: true, part_compatibilities: true };
    const skipDecorate = String(raw || "") === "1";

    if (page && pageSize) {
      const take = Math.max(1, Math.min(100, Number(pageSize)));
      const skip = Math.max(0, (Number(page) - 1) * take);
      const [items, total] = await Promise.all([
        prisma.parts.findMany({ where, orderBy, skip, take, include }),
        prisma.parts.count({ where })
      ]);
      if (!skipDecorate) await decorateParts(items);
      return res.json({ items, total });
    } else {
      const rows = await prisma.parts.findMany({ where, orderBy, include });
      if (!skipDecorate) await decorateParts(rows);
      return res.json({ items: rows, total: rows.length });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to load parts", detail: String(err.message || err) });
  }
});

app.get("/parts/by-sku/:sku", async (req, res) => {
  try {
    const sku = String(req.params.sku);
    let row = await prisma.parts.findUnique({
      where: { sku },
      include: { parts_on_categories: true, part_compatibilities: true }
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    await decorateParts([row]);
    row.stock_qty = toIntNonNeg(row.stock_qty, 0);
    row.availability_mode = normalizeMode(row.availability_mode, row.stock_qty) || "";
    row.lead_time_days = row.availability_mode === "stock" ? 0 : (toIntNonNeg(row.lead_time_days, 21) || 21);
    res.json(row);
  } catch (e) { res.status(500).json({ error: "Failed to load part by sku", detail: String(e.message || e) }); }
});

app.get("/parts/:id", async (req, res) => {
  try {
    const id = parseIdParam(req, res); if (id == null) return;
    let row = await prisma.parts.findUnique({
      where: { id },
      include: { parts_on_categories: true, part_compatibilities: true }
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    await decorateParts([row]);
    row.stock_qty = toIntNonNeg(row.stock_qty, 0);
    row.availability_mode = normalizeMode(row.availability_mode, row.stock_qty) || "";
    row.lead_time_days = row.availability_mode === "stock" ? 0 : (toIntNonNeg(row.lead_time_days, 21) || 21);
    res.json(row);
  } catch (e) { res.status(500).json({ error: "Failed to load part", detail: String(e.message || e) }); }
});

// 建立：支援 compatibility_variant_ids
app.post("/parts", async (req, res) => {
  try {
    const {
      sku, name, brand, category, msrp_twd, wholesale_twd,
      image_url, description, stock_qty, availability_mode, lead_time_days,
      compatibility_variant_ids
    } = req.body || {};
    if (!sku || !name) return res.status(400).json({ error: "sku & name required" });

    const stockQty = toIntNonNeg(stock_qty, 0);
    const mode = normalizeMode(availability_mode, stockQty) || normalizeMode(null, stockQty);
    const leadDays = mode === "stock" ? 0 : (toIntNonNeg(lead_time_days, 21) || 21);

    const created = await prisma.parts.create({
      data: {
        sku: String(sku).trim(),
        name: String(name).trim(),
        brand: brand ? String(brand).trim() : null,
        category: category ? String(category).trim() : null,
        msrp_twd: toNullableInt(msrp_twd),
        wholesale_twd: toNullableInt(wholesale_twd),
        image_url: fixUrl(image_url),
        description: description ? String(description).trim() : null,
        stock_qty: stockQty,
        availability_mode: mode,
        lead_time_days: leadDays,
      },
      select: { id: true }
    });

    const vids = Array.isArray(compatibility_variant_ids)
      ? Array.from(new Set(compatibility_variant_ids.map(Number))).filter(Boolean)
      : [];
    if (vids.length) {
      await prisma.part_compatibilities.createMany({
        data: vids.map(vid => ({ part_id: created.id, vehicle_variant_id: vid })),
        skipDuplicates: true,
      });
    }

    res.json(created);
  } catch (e) { res.status(500).json({ error: "Failed to create part", detail: String(e.message || e) }); }
});

// 更新：支援 compatibility_variant_ids 覆蓋
app.put("/parts/:id", async (req, res) => {
  try {
    const id = parseIdParam(req, res); if (id == null) return;

    const {
      name, brand, category, msrp_twd, wholesale_twd, stock_qty,
      availability_mode, lead_time_days, image_url, description,
      compatibility_variant_ids
    } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ error: "name required" });

    const stockQty = toIntNonNeg(stock_qty, 0);
    const mode = normalizeMode(availability_mode, stockQty) || normalizeMode(null, stockQty);
    let leadDays = mode === "stock" ? 0 : toIntNonNeg(lead_time_days, 21);
    if (mode === "preorder" && (leadDays == null || leadDays <= 0)) leadDays = 21;

    const payload = {
      name: String(name).trim(),
      brand: brand ? String(brand).trim() : null,
      category: category ? String(category).trim() : null,
      msrp_twd: toNullableInt(msrp_twd),
      wholesale_twd: toNullableInt(wholesale_twd),
      stock_qty: stockQty,
      availability_mode: mode,
      lead_time_days: leadDays,
      image_url: fixUrl(image_url),
      description: description ? String(description).trim() : null,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.parts.update({ where: { id }, data: payload });

      if (Array.isArray(compatibility_variant_ids)) {
        const want = Array.from(new Set(compatibility_variant_ids.map(Number))).filter(Boolean);
        await tx.part_compatibilities.deleteMany({ where: { part_id: id } });
        if (want.length) {
          await tx.part_compatibilities.createMany({
            data: want.map(vid => ({ part_id: id, vehicle_variant_id: vid })), skipDuplicates: true,
          });
        }
      }
      return row;
    });

    const [decorated] = await decorateParts([updated]);
    res.json(decorated || updated);
  } catch (e) {
    console.error("PUT /parts/:id error", e);
    res.status(400).json({ error: "Failed to update part", detail: String(e.message || e) });
  }
});

app.delete("/parts/:id", async (req, res) => {
  try {
    const id = parseIdParam(req, res); if (id == null) return;
    await prisma.$transaction([
      prisma.parts_on_categories.deleteMany({ where: { part_id: id } }),
      prisma.part_compatibilities.deleteMany({ where: { part_id: id } }),
      prisma.parts.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Failed to delete part", detail: String(e.message || e) }); }
});

/* ============================== Orders ============================== */
async function ensureOrderTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGSERIAL PRIMARY KEY,
        order_no TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        company_name TEXT,
        buyer_name TEXT,
        phone TEXT,
        email TEXT,
        tax_id TEXT,
        shipping_address TEXT,
        note TEXT,
        subtotal_twd INTEGER NOT NULL DEFAULT 0,
        shipping_twd INTEGER NOT NULL DEFAULT 0,
        total_twd INTEGER NOT NULL DEFAULT 0
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGSERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        part_id INTEGER,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL,
        unit_price_twd INTEGER NOT NULL,
        msrp_twd INTEGER,
        wholesale_twd INTEGER,
        image_url TEXT
      );
    `);
    console.log("✅ orders / order_items tables ready");
  } catch (e) {
    console.error("ensureOrderTables error:", e);
  }
}
ensureOrderTables();

function genOrderNo() {
  const d = new Date();
  const ymd = d.toISOString().slice(0,10).replace(/-/g,"");
  const rnd = Math.floor(Math.random()*90000) + 10000;
  return `${ymd}-${rnd}`;
}

app.post("/orders", async (req, res) => {
  try {
    const { buyer = {}, items = [], shipping_twd = 0 } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "EMPTY_CART" });
    if (!buyer?.buyer_name || !buyer?.phone) return res.status(400).json({ error: "MISSING_CONTACT" });

    const cleanItems = items.map((it) => ({
      part_id: it.part_id ?? null,
      sku: String(it.sku || ""),
      name: String(it.name || ""),
      qty: Number(it.qty || 0),
      unit_price_twd: Number(it.unit_price_twd || 0),
      msrp_twd: it.msrp_twd == null ? null : Number(it.msrp_twd),
      wholesale_twd: it.wholesale_twd == null ? null : Number(it.wholesale_twd),
      image_url: it.image_url || null,
    })).filter(x => x.sku && x.name && x.qty > 0);

    const subtotal = cleanItems.reduce((s, it) => s + it.qty * it.unit_price_twd, 0);
    const shipping = Number(shipping_twd || 0);
    const total = subtotal + shipping;

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.$queryRawUnsafe(
        `INSERT INTO orders
         (order_no,status,company_name,buyer_name,phone,email,tax_id,shipping_address,note,subtotal_twd,shipping_twd,total_twd)
         VALUES ($1,'new',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, order_no, created_at`,
        genOrderNo(),
        buyer.company_name ?? null,
        buyer.buyer_name ?? null,
        buyer.phone ?? null,
        buyer.email ?? null,
        buyer.tax_id ?? null,
        buyer.shipping_address ?? null,
        buyer.note ?? null,
        subtotal, shipping, total
      );
      const orderRow = Array.isArray(order) ? order[0] : order;

      for (const it of cleanItems) {
        await tx.$executeRawUnsafe(
          `INSERT INTO order_items 
           (order_id, part_id, sku, name, qty, unit_price_twd, msrp_twd, wholesale_twd, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          orderRow.id, it.part_id, it.sku, it.name, it.qty,
          it.unit_price_twd, it.msrp_twd, it.wholesale_twd, it.image_url
        );
      }
      return orderRow;
    });

    res.json({ order_id: created.id, order_no: created.order_no });
  } catch (e) {
    console.error("POST /orders failed:", e);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const id = parseIdParam(req, res); if (id == null) return;
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM orders WHERE id=$1`, id);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const items = await prisma.$queryRawUnsafe(`SELECT * FROM order_items WHERE order_id=$1 ORDER BY id ASC`, id);
    res.json({ ...rows[0], items });
  } catch (e) {
    console.error("GET /orders/:id failed:", e);
    res.status(500).json({ error: "Failed to load order" });
  }
});

/* ============================== Start ============================== */
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`🚀 API listening at http://localhost:${PORT}`));
