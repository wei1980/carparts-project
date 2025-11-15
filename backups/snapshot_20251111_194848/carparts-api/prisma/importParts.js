// prisma/importParts.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function n(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/[, ]/g, '');
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

async function upsertPart(row) {
  // 允許新舊欄位
  const msrp = row.msrp_twd ?? row.price_twd;
  const wh   = row.wholesale_twd ?? row.cost_twd;

  if (!row.sku || !row.name || !row.category || msrp == null) {
    throw new Error(`Missing required fields for SKU=${row.sku}`);
  }

  const data = {
    sku: row.sku,
    name: row.name,
    category: row.category,
    brand: row.brand || null,
    msrp_twd: n(msrp),
    wholesale_twd: n(wh),
    currency: row.currency || 'TWD',
    weight_kg: n(row.weight_kg),
    vat_included: row.vat_included === '' ? true : (String(row.vat_included).toLowerCase() !== 'false'),
    stock_qty: row.stock_qty === '' || row.stock_qty == null ? 0 : parseInt(row.stock_qty, 10),
    description: row.description || null,
    image_url: row.image_url || null,
    updated_at: new Date(),
  };

  const exist = await prisma.parts.findUnique({ where: { sku: row.sku } });
  if (exist) {
    return prisma.parts.update({ where: { sku: row.sku }, data });
  } else {
    data.created_at = new Date();
    return prisma.parts.create({ data });
  }
}

async function linkCompatibility(row) {
  const makeName = row.make?.trim();
  const modelName = row.model?.trim();
  const gen = (row.generation_name || '').trim();
  const yf = n(row.year_from);
  const yt = n(row.year_to);
  const eng = (row.engine_code || '').trim();

  if (!makeName || !modelName || !yf || !yt) return;

  const make = await prisma.makes.findFirst({ where: { name: { equals: makeName, mode: 'insensitive' } } });
  if (!make) return;

  const model = await prisma.models.findFirst({
    where: { make_id: make.id, name: { equals: modelName, mode: 'insensitive' } }
  });
  if (!model) return;

  const genRow = gen
    ? await prisma.generations.findFirst({ where: { model_id: model.id, name: { equals: gen, mode: 'insensitive' } } })
    : null;

  const variant = await prisma.vehicle_variants.findFirst({
    where: {
      model_id: model.id,
      ...(genRow ? { generation_id: genRow.id } : {}),
      year_from: { lte: yf },
      year_to: { gte: yt },
      ...(eng ? { engine_code: { equals: eng, mode: 'insensitive' } } : {})
    }
  });
  if (!variant) return;

  const part = await prisma.parts.findUnique({ where: { sku: row.sku } });
  if (!part) return;

  await prisma.part_compatibilities.upsert({
    where: { part_id_vehicle_variant_id: { part_id: part.id, vehicle_variant_id: variant.id } },
    update: {},
    create: { part_id: part.id, vehicle_variant_id: variant.id, note: row.note || null }
  });
}

async function main() {
  const partsCsv = process.argv[2] || './data/parts.csv';
  const compatCsv = process.argv[3] || './data/compatibilities.csv';

  const partsRaw = fs.readFileSync(path.resolve(partsCsv), 'utf8');
  const partsRows = parse(partsRaw, { columns: true, skip_empty_lines: true });
  console.log('📦 Loaded parts rows:', partsRows.length);

  let ok = 0; let fail = 0;
  for (const r of partsRows) {
    try { await upsertPart(r); ok++; }
    catch (e) { console.error('Part upsert fail', r.sku, e.message); fail++; }
  }
  console.log(`✅ Parts upsert done. ok=${ok}, fail=${fail}`);

  if (fs.existsSync(compatCsv)) {
    const compatRaw = fs.readFileSync(path.resolve(compatCsv), 'utf8');
    const compatRows = parse(compatRaw, { columns: true, skip_empty_lines: true });
    console.log('🔗 Loaded compat rows:', compatRows.length);
    let linked = 0;
    for (const r of compatRows) {
      try { await linkCompatibility(r); linked++; } catch {}
    }
    console.log(`✅ Compatibility linking done. linked=${linked}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
