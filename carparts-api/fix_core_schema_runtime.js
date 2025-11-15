/* eslint-disable */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function dbKind() {
  const url = (process.env.DATABASE_URL || "").toLowerCase();
  if (url.startsWith("postgres")) return "pg";
  if (url.startsWith("mysql")) return "mysql";
  if (url.startsWith("sqlserver")) return "mssql";
  if (url.startsWith("file:") || url.includes("sqlite")) return "sqlite";
  return "unknown";
}

async function addCols(table, specs) {
  const kind = dbKind();

  if (kind === "pg") {
    // Postgres：可以一次跑 IF NOT EXISTS
    const lines = specs.map(s => `ADD COLUMN IF NOT EXISTS ${s}`).join(",\n  ");
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table}\n  ${lines}`);
  } else if (kind === "mysql") {
    // MySQL 8：支援 IF NOT EXISTS；較舊版可多跑幾次也沒關係
    for (const s of specs) {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${s}`);
    }
  } else if (kind === "mssql") {
    // SQL Server：用 COL_LENGTH 判斷
    for (const s of specs) {
      const col = s.split(/\s+/)[0];
      const def = s.replace(col, "").trim();
      await prisma.$executeRawUnsafe(`
        IF COL_LENGTH('${table}', '${col}') IS NULL
          EXEC('ALTER TABLE ${table} ADD ${col} ${def}')
      `);
    }
  } else if (kind === "sqlite") {
    // SQLite：不支援 IF NOT EXISTS；用 PRAGMA 判斷
    const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info('${table}');`);
    const has = name => cols.some(c => String(c.name).toLowerCase() === name.toLowerCase());
    for (const s of specs) {
      const col = s.split(/\s+/)[0];
      if (!has(col)) {
        // 簡化型別對應
        let def = s.replace(col, "").trim();
        def = def
          .replace(/INTEGER\(\d+\)/ig, "INTEGER")
          .replace(/VARCHAR\(\d+\)/ig, "TEXT")
          .replace(/TIMESTAMP\(\d+\)/ig, "TEXT")
          .replace(/DATETIME\(\d+\)/ig, "TEXT");
        // SQLite 對 NOT NULL + DEFAULT 的限制較寬，這裡直接加
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      }
    }
  } else {
    throw new Error("Unknown DB type; please check DATABASE_URL in .env");
  }
}

async function ensureCore() {
  // makes / models / generations / vehicle_variants 核心欄位
  await addCols("makes", [
    "name VARCHAR(191) NOT NULL",
    "created_at TIMESTAMP(3) NOT NULL DEFAULT now()",
    "updated_at TIMESTAMP(3) NOT NULL DEFAULT now()",
  ]);

  await addCols("models", [
    "make_id INTEGER NOT NULL",
    "name VARCHAR(191) NOT NULL",
    "created_at TIMESTAMP(3) NOT NULL DEFAULT now()",
    "updated_at TIMESTAMP(3) NOT NULL DEFAULT now()",
  ]);

  await addCols("generations", [
    "model_id INTEGER NOT NULL",
    "name VARCHAR(191) NOT NULL",
    "year_from INTEGER NOT NULL",
    "year_to INTEGER NOT NULL",
    "created_at TIMESTAMP(3) NOT NULL DEFAULT now()",
    "updated_at TIMESTAMP(3) NOT NULL DEFAULT now()",
  ]);

  await addCols("vehicle_variants", [
    "model_id INTEGER NOT NULL",
    "generation_id INTEGER NOT NULL",
    "name VARCHAR(191) NOT NULL",
    "engine_code VARCHAR(191)",
    "year_from INTEGER NOT NULL",
    "year_to INTEGER NOT NULL",
    "created_at TIMESTAMP(3) NOT NULL DEFAULT now()",
    "updated_at TIMESTAMP(3) NOT NULL DEFAULT now()",
  ]);

  console.log("✅ ensured core columns on makes/models/generations/vehicle_variants");
}

async function printMakesCols() {
  try {
    const kind = dbKind();
    if (["pg", "mysql", "mssql"].includes(kind)) {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'vehicle_variants'
        ORDER BY column_name
      `);
      console.log("vehicle_variants columns:", rows.map(r => r.column_name || r.COLUMN_NAME));
    } else if (kind === "sqlite") {
      const rows = await prisma.$queryRawUnsafe("PRAGMA table_info('vehicle_variants');");
      console.log("vehicle_variants pragma:", rows);
    }
  } catch (e) {
    console.log("列欄位失敗（可忽略）:", e.message);
  }
}

(async () => {
  try {
    console.log("DB =", dbKind(), process.env.DATABASE_URL);
    await ensureCore();
    await printMakesCols();
    console.log("✅ core schema ok");
  } catch (e) {
    console.error("❌ fix_core_schema_runtime failed:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
