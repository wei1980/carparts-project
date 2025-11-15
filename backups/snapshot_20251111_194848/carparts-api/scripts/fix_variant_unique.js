// scripts/fix_variant_unique.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // 1) 先檢查會衝突的重複資料（相同 model_id/engine_code/year_from/year_to）
    const dups = await prisma.$queryRawUnsafe(`
      SELECT model_id,
             COALESCE(engine_code, '') AS engine_code,
             year_from, year_to,
             COUNT(*) AS cnt,
             ARRAY_AGG(id ORDER BY id) AS ids
      FROM vehicle_variants
      GROUP BY model_id, COALESCE(engine_code,''), year_from, year_to
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC;
    `);

    if (dups.length) {
      console.log('⚠️ 偵測到重複資料（請先處理，否則之後加 unique 會失敗）:');
      for (const r of dups) {
        console.log(`  model_id=${r.model_id}, engine_code="${r.engine_code}", years=${r.year_from}-${r.year_to}, rows=${r.cnt}, ids=${r.ids}`);
      }
      console.log('\n請刪除或合併上面重複的 rows（保留其中一筆），再重試。');
      process.exit(2);
    }

    // 2) 刪除舊的唯一約束（名稱來自 Postgres 的錯誤訊息）
    const constraintName = 'vehicle_variants_model_id_engine_code_year_from_year_to_var_key';
    console.log(`🔧 Dropping old unique constraint if exists: ${constraintName}`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."vehicle_variants"
      DROP CONSTRAINT IF EXISTS "${constraintName}";
    `);

    console.log('✅ Done. 現在可以重新執行 prisma db push / migrate 了。');
  } catch (e) {
    console.error('❌ 修復失敗：', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
