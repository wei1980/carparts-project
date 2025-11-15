// prisma/importVehicles.js
const fs = require('fs');
const { parse } = require('csv-parse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(csvPath) {
  if (!csvPath) {
    console.error('Usage: node prisma/importVehicles.js ./data/vehicles.csv');
    process.exit(1);
  }
  const rows = await readCsv(csvPath);
  console.log(`📦 Loaded ${rows.length} rows`);

  const makeCache = new Map();   // name -> id
  const modelCache = new Map();  // make_id|model_name -> id
  const genCache = new Map();    // model_id|name|years -> id
  const stat = { makes: 0, models: 0, gens: 0, variants: 0, dup: 0 };

  for (const r of rows) {
    const make = (r.make || r.製造商 || '').trim();
    const model = (r.model || r.車系 || '').trim(); // ★ 這裡應該已經是「完整車型名」（你已合併）
    const genName = (r.generation_name || r.世代 || '').trim() || null;
    const year_from = toInt(r.year_from || r.年份開始);
    const year_to = toInt(r.year_to || r.年份結束);
    const engine_code = (r.engine_code || r.引擎代碼 || '').trim() || null;
    const displacement_cc = toInt(r.displacement_cc || r['排氣量(cc)']);
    const power_ps = toInt(r.power_ps || r['最大馬力(PS)']);
    const fuel_type = (r.fuel_type || r.燃油類型 || '').trim();
    const intake_type = (r.intake_type || r.進氣形式 || '').trim() || null;
    const drive_type = (r.drive_type || r.駕動型式 || r.驅動型式 || '').trim() || null;
    const front_suspension = (r.front_suspension || r.前懸吊系統 || '').trim() || null;
    const rear_suspension = (r.rear_suspension || r.後懸吊系統 || '').trim() || null;

    if (!make || !model || !fuel_type || !year_from || !year_to) {
      console.warn('⚠️  skip row (required fields missing):', r);
      continue;
    }

    // make
    let makeId = makeCache.get(make);
    if (!makeId) {
      const row = await prisma.makes.upsert({ where: { name: make }, update: {}, create: { name: make } });
      makeId = row.id; makeCache.set(make, makeId); stat.makes++;
    }

    // model（已細分名稱）
    const mKey = `${makeId}|${model.toLowerCase()}`;
    let modelId = modelCache.get(mKey);
    if (!modelId) {
      const row = await prisma.models.upsert({
        where: { make_id_name: { make_id: makeId, name: model } },
        update: {},
        create: { make_id: makeId, name: model }
      });
      modelId = row.id; modelCache.set(mKey, modelId); stat.models++;
    }

    // generation（可空）
    let generation_id = null;
    const gKey = `${modelId}|${(genName || '').toLowerCase()}|${year_from}-${year_to}`;
    if (!genCache.get(gKey)) {
      const row = await prisma.generations.create({
        data: { model_id: modelId, name: genName, year_from, year_to }
      });
      generation_id = row.id; genCache.set(gKey, row.id); stat.gens++;
    } else generation_id = genCache.get(gKey);

    // variant（無 variant_name）
    try {
      await prisma.vehicle_variants.create({
        data: {
          model_id: modelId,
          generation_id,
          year_from,
          year_to,
          engine_code,
          displacement_cc,
          power_ps,
          intake_type,
          drive_type,
          front_suspension,
          rear_suspension,
          fuel_type
        }
      });
      stat.variants++;
    } catch (e) {
      if (e.code === 'P2002') stat.dup++; else console.error('❌ variant create error:', e.message, r);
    }
  }

  console.log('✅ Import vehicles done:', stat);
  await prisma.$disconnect();
}

function readCsv(p) {
  return new Promise((resolve, reject) => {
    const out = [];
    fs.createReadStream(p).pipe(parse({ columns: true, trim: true }))
      .on('data', (row) => out.push(row))
      .on('end', () => resolve(out))
      .on('error', reject);
  });
}
const toInt = (v) => (v === undefined || v === null || v === '' ? null : parseInt(v, 10));

main(process.argv[2]).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
