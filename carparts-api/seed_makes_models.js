/* eslint-disable */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * 種子內容：Make / Model / Generation / Vehicle Variant
 * 重點：
 *  - 查/增/改一律 select: { id: true }（避免 timestamp 連帶讀取）
 *  - 不再寫入 fuel_type（避免 Prisma schema 無此欄位造成驗證錯）
 */

// —— 判斷燃料型態（暫時只用於日後你要補資料時參考，不寫入 DB） ——
function inferFuelType(name = "", engine = "") {
  const s = `${name} ${engine}`.toLowerCase();
  if (/(ev|electric|bev|id\.|i3|e-drive|edrive)/i.test(s)) return "electric";
  if (/(hybrid|phev|e-tron|t8|e:hev|ehev|h\.e\.v)/i.test(s)) return "hybrid";
  if (/(tdi|diesel|hdi|dci|cdti|mjd|mjet|d-4d|d4d|d|d2\.0)/i.test(s)) return "diesel";
  if (/(tsi|tfsi|mpi|gdi|fsi|b\d{2}|ea888|ea211|ea113|b48|b58|n20|n55|m270|m274|2\.0t|3\.0t|1\.4t|turbo)/i.test(s)) return "gasoline";
  return "gasoline";
}

const DATA = [
  {
    make: "VW",
    models: [
      {
        name: "GTI 2.0T",
        generations: [
          {
            name: "MK7.5",
            year_from: 2018,
            year_to: 2020,
            variants: [
              { name: "GTI 2.0T", engine_code: "EA888", year_from: 2018, year_to: 2020 },
            ],
          },
        ],
      },
      {
        name: "Golf",
        generations: [
          {
            name: "MK7",
            year_from: 2013,
            year_to: 2017,
            variants: [
              { name: "Golf 1.4 TSI", engine_code: "EA211", year_from: 2013, year_to: 2017 },
            ],
          },
        ],
      },
    ],
  },
  {
    make: "Audi",
    models: [
      {
        name: "RS3",
        generations: [
          {
            name: "8V FL",
            year_from: 2017,
            year_to: 2020,
            variants: [
              { name: "RS3 2.5T", engine_code: "DAZA", year_from: 2017, year_to: 2020 },
            ],
          },
        ],
      },
    ],
  },
  {
    make: "BMW",
    models: [
      {
        name: "3-Series",
        generations: [
          {
            name: "F30 LCI",
            year_from: 2016,
            year_to: 2019,
            variants: [
              { name: "330i", engine_code: "B48", year_from: 2016, year_to: 2019 },
            ],
          },
        ],
      },
    ],
  },
  {
    make: "Toyota",
    models: [
      {
        name: "GR Supra",
        generations: [
          {
            name: "A90",
            year_from: 2019,
            year_to: 2020,
            variants: [
              { name: "3.0T", engine_code: "B58", year_from: 2019, year_to: 2020 },
            ],
          },
        ],
      },
    ],
  },
];

// ---------- helpers（全部 select 只拿 id） ----------
async function findOrCreateMake(name) {
  let row = await prisma.makes.findFirst({ where: { name }, select: { id: true } });
  if (!row) row = await prisma.makes.create({ data: { name }, select: { id: true } });
  return row; // { id }
}

async function findOrCreateModel(make_id, name) {
  let row = await prisma.models.findFirst({ where: { make_id, name }, select: { id: true } });
  if (!row) row = await prisma.models.create({ data: { make_id, name }, select: { id: true } });
  return row; // { id }
}

async function findOrCreateGeneration(model_id, name, year_from, year_to) {
  const yFrom = Number(year_from);
  const yTo = Number(year_to);
  let row = await prisma.generations.findFirst({
    where: { model_id, name },
    select: { id: true, year_from: true, year_to: true },
  });
  if (!row) {
    row = await prisma.generations.create({
      data: { model_id, name, year_from: yFrom, year_to: yTo },
      select: { id: true, year_from: true, year_to: true },
    });
  } else {
    const needUpdate = (Number(row.year_from) !== yFrom) || (Number(row.year_to) !== yTo);
    if (needUpdate) {
      row = await prisma.generations.update({
        where: { id: row.id },
        data: { year_from: yFrom, year_to: yTo },
        select: { id: true, year_from: true, year_to: true },
      });
    }
  }
  return row; // { id, year_from, year_to }
}

async function findOrCreateVariant(model_id, generation_id, v) {
  const yFrom = Number(v.year_from);
  const yTo = Number(v.year_to ?? v.year_from);

  // 1) 找是否已存在
  let row = await prisma.vehicle_variants.findFirst({
    where: { model_id, generation_id, name: v.name, year_from: yFrom, year_to: yTo },
    select: { id: true }, // 只拿 id
  });

  // 2) 沒有就建立（不帶 fuel_type）
  if (!row) {
    row = await prisma.vehicle_variants.create({
      data: {
        model_id,
        generation_id,
        name: v.name,
        engine_code: v.engine_code ?? null,
        year_from: yFrom,
        year_to: yTo,
      },
      select: { id: true },
    });
  }

  // 3) 這裡不寫 fuel_type；若你未來把 Prisma schema + DB 都加上 fuel_type，我再幫你一次填補
  return row;
}

// ---------- main ----------
(async () => {
  try {
    let makeCount = 0, modelCount = 0, genCount = 0, varCount = 0;

    for (const m of DATA) {
      const mk = await findOrCreateMake(m.make); makeCount++;

      for (const mdl of m.models) {
        const mod = await findOrCreateModel(mk.id, mdl.name); modelCount++;

        for (const g of (mdl.generations || [])) {
          const gen = await findOrCreateGeneration(mod.id, g.name, g.year_from, g.year_to); genCount++;

          for (const v of (g.variants || [])) {
            await findOrCreateVariant(mod.id, gen.id, v); varCount++;
          }
        }
      }
    }

    console.log("✅ makes/models/generations/variants seeded.", {
      makes: makeCount, models: modelCount, generations: genCount, variants: varCount
    });
  } catch (e) {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
