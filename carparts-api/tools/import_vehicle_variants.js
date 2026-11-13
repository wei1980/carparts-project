// tools/import_vehicle_variants.js
// 將 Makes_20260921(資料庫版) .csv 匯入 vehicle_variants。
// - 以 make|model|generation|engine_code|year 做去重
// - 已存在則更新 specs/drinve_type；不存在則批量建立
// - 安全：不刪除、不觸碰已有 FK 紀錄
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse/sync');
const prisma = new PrismaClient();

const COLS = {
  makes: 0, year: 1, model: 2, generation: 3, engine: 4,
  displacement: 5, horsepower: 6, drive: 7, gear: 8, door: 9,
  power: 10, cylinder: 11, compression: 12, bore: 13, stroke: 14,
  weight: 15, rim: 16, frontTire: 17, frontSusp: 18, rearTire: 19,
  rearSusp: 20, intake: 21, torque: 22, dims: 23,
};

function toInt(v) { const n = parseInt(v); return Number.isNaN(n) ? null : n; }
function clean(v) { return v ? v.trim() : ''; }

function main() {
  const DRY = process.argv.includes('--dry');
  const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!files.length) { console.error('Usage: node import_vehicle_variants.js <csv> [--dry]'); process.exit(1); }
  const file = files[0];
  const text = fs.readFileSync(file, 'utf8');
  const body = text.replace(/^\uFEFF/, '');
  const rows = parse(body, { bom: true, skip_empty_lines: true });
  if (!rows.length) { console.error('No rows'); process.exit(1); }
  const header = rows[0].map(h => clean(h).toLowerCase().replace(/[\s()]*/g, ''));
  // map header by 原始欄位順序（固定 24 欄），不依名稱
  const dataRows = rows.slice(1);

  // 去重
  const seen = new Map();
  let dupes = 0;
  for (const row of dataRows) {
    if (row.length < 24) continue;
    const make = clean(row[COLS.makes]);
    if (!make) continue;
    const year = toInt(row[COLS.year]);
    const key = [make, clean(row[COLS.model]), clean(row[COLS.generation]), clean(row[COLS.engine]), year].join('|');
    if (seen.has(key)) { dupes++; continue; }
    seen.set(key, { row, key });
  }
  console.log(`CSV rows=${dataRows.length} unique=${seen.size} dupes=${dupes} dry=${DRY}`);

  (async () => {
    if (DRY) { process.exit(0); }
    // 載入已有 variants：key -> id
    const existing = await prisma.vehicleVariant.findMany({
      select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true },
    });
    const existMap = new Map();
    for (const v of existing) existMap.set([v.make, v.model, v.generation, v.engine_code, v.year_start].join('|'), v.id);

    const toCreate = [];
    const toUpdate = [];
    for (const { row } of seen.values()) {
      const make = clean(row[COLS.makes]);
      const model = clean(row[COLS.model]);
      const generation = clean(row[COLS.generation]);
      const engine = clean(row[COLS.engine]);
      const year = toInt(row[COLS.year]) || 0;
      const key = [make, model, generation, engine, year].join('|');
      const specs = {};
      for (const [label, idx] of Object.entries(COLS)) {
        if (['makes', 'year', 'model', 'generation', 'engine'].includes(label)) continue;
        const val = clean(row[idx]);
        if (val) specs[label] = val;
      }
      const payload = {
        make, model, generation, engine_code: engine || '', variant_name: model,
        year_start: year, year_end: year, is_approved: true,
        drive_type: clean(row[COLS.drive]) || null,
        specs: Object.keys(specs).length ? specs : undefined,
      };
      if (existMap.has(key)) toUpdate.push({ id: existMap.get(key), ...payload });
      else toCreate.push(payload);
    }
    console.log(`existing=${toUpdate.length} new=${toCreate.length}`);

    const BATCH = 1000;
    let created = 0, updated = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      await prisma.vehicleVariant.createMany({ data: batch, skipDuplicates: true });
      created += batch.length;
      console.log(`  created ${created}/${toCreate.length}`);
    }
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await prisma.$transaction(batch.map(p =>
        prisma.vehicleVariant.update({ where: { id: p.id }, data: { specs: p.specs, drive_type: p.drive_type, engine_code: p.engine_code, variant_name: p.variant_name } })
      ));
      updated += batch.length;
      console.log(`  updated ${updated}/${toUpdate.length}`);
    }
    console.log(`DONE created=${created} updated=${updated}`);
    process.exit(0);
  })().catch(e => { console.error(e); process.exit(1); });
}
main();
