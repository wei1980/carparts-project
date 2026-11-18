/**
 * bilstein_report.js — BILSTEIN 目前狀態摘要（給 sync 腳本與人工快速判斷用）
 *
 * 用法：node scripts/bilstein_report.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const a = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int n,
            COUNT(*) FILTER (WHERE image_url IS NULL)::int noimg,
            COUNT(*) FILTER (WHERE msrp_price > 0)::int priced
     FROM parts WHERE brand='BILSTEIN'`
  );
  const b = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int n, COUNT(DISTINCT vehicle_id)::int veh
     FROM part_vehicle_compatibility c
     JOIN parts pp ON pp.id=c.part_id WHERE pp.brand='BILSTEIN'`
  );
  const key = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int n FROM parts WHERE brand='BILSTEIN' AND sku='48-330862'`
  );

  // 每 SKU 連結數分布
  const dist = await p.$queryRawUnsafe(
    `WITH x AS (SELECT part_id, COUNT(*)::int n FROM part_vehicle_compatibility
       WHERE part_id IN (SELECT id FROM parts WHERE brand='BILSTEIN') GROUP BY part_id)
     SELECT COUNT(*)::int parts,
       COUNT(*) FILTER (WHERE n=0)::int zero,
       COUNT(*) FILTER (WHERE n BETWEEN 1 AND 5)::int a,
       COUNT(*) FILTER (WHERE n BETWEEN 6 AND 30)::int b,
       COUNT(*) FILTER (WHERE n BETWEEN 31 AND 100)::int c,
       COUNT(*) FILTER (WHERE n > 100)::int d
     FROM x`
  );

  const perMake = await p.$queryRawUnsafe(
    `SELECT v.make, COUNT(DISTINCT c.vehicle_id)::int veh
     FROM part_vehicle_compatibility c
     JOIN parts pp ON pp.id=c.part_id AND pp.brand='BILSTEIN'
     JOIN vehicle_variants v ON v.id=c.vehicle_id
     GROUP BY v.make ORDER BY veh DESC LIMIT 10`
  );

  console.log('=== BILSTEIN 狀態 ===');
  console.log(`  parts    : ${a[0].n}（有价 ${a[0].priced}，缺图 ${a[0].noimg}）`);
  console.log(`  links    : ${b[0].n}（触及车款 ${b[0].veh}）`);
  console.log(`  48-330862: ${key[0].n}`);
  if (dist[0]) {
    const d = dist[0];
    console.log(`  连结分布 : 0笔=${d.zero} 1-5=${d.a} 6-30=${d.b} 31-100=${d.c} >100=${d.d}`);
  }
  console.log('\n各车厂触及车款（前 10）:');
  perMake.forEach(x => console.log(`  ${x.make.padEnd(15)} ${String(x.veh).padStart(5)}`));

  await p.$disconnect();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });