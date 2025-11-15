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

async function run() {
  const kind = dbKind();
  console.log("DB =", kind, process.env.DATABASE_URL);

  const tables = ["makes", "models", "generations", "vehicle_variants"];

  if (kind === "pg") {
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ${t}
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT now(),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT now()
      `);
    }
  } else if (kind === "mysql") {
    for (const t of tables) {
      // MySQL 8 支援 IF NOT EXISTS；若你的版本較舊可跑兩次也不會有影響
      await prisma.$executeRawUnsafe(`
        ALTER TABLE ${t}
          ADD COLUMN IF NOT EXISTS created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
            ON UPDATE CURRENT_TIMESTAMP(3)
      `);
    }
  } else if (kind === "sqlite") {
    // SQLite 不支援 ADD COLUMN IF NOT EXISTS；先查 pragma 再決定是否新增
    for (const t of tables) {
      const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info('${t}');`);
      const has = (name) => cols.some(c => String(c.name).toLowerCase() === name);
      if (!has("created_at")) {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${t} ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`);
      }
      if (!has("updated_at")) {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${t} ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`);
      }
    }
  } else if (kind === "mssql") {
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`
        IF COL_LENGTH('${t}', 'created_at') IS NULL
          ALTER TABLE ${t} ADD created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
      `);
      await prisma.$executeRawUnsafe(`
        IF COL_LENGTH('${t}', 'updated_at') IS NULL
          ALTER TABLE ${t} ADD updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
      `);
    }
  } else {
    throw new Error("Unknown DB, 無法自動修復。請檢查 .env 的 DATABASE_URL");
  }

  console.log("✅ timestamps ensured on makes/models/generations/vehicle_variants");

  // 額外印出 makes 的欄位，幫你確認真的存在
  try {
    const kind2 = dbKind();
    if (kind2 === "pg" || kind2 === "mysql" || kind2 === "mssql") {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'makes'
        ORDER BY column_name
      `);
      console.log("makes columns:", rows.map(r => r.column_name || r.COLUMN_NAME));
    } else if (kind2 === "sqlite") {
      const rows = await prisma.$queryRawUnsafe("PRAGMA table_info('makes');");
      console.log("makes pragma:", rows);
    }
  } catch (e) {
    console.log("列欄位失敗（可忽略）:", e.message);
  }
}

run()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
