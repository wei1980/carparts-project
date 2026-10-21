// 收斂煞車件適配：每個 (車型變體, 軸位, 化合物等級) 只保留一種零件
//
// 問題：EBC 目錄對同一車型會列多種煞車套件（例：BMW 430i G26 有
//   ATE/Plain/348、Brembo/Vented/374、TRW/Vented/307、Brembo/Vented/348 四種前碟規格），
//   而 vehicle_variants 沒有煞車套件欄位 → 同一台車會同時出現 4 種 Yellowstuff 前來令片，
//   顧客無從判斷該買哪一個。
//
// 處理：每個 (vehicle_id, position, product_line) 只保留一筆，其餘的 vehicle_id 設為 NULL
//       （該筆在 EBC 目錄中仍是有效資料，只是不再宣稱適用於這個車型變體）。
//
// 勝出規則（依序）：
//   1. 世代碼與車型變體一致者優先（DB generation 或車型名括號碼）
//   2. 引擎碼一致者優先
//   3. 該車型的「主流碟規格」優先（在 EBC 目錄中出現次數最多的碟規格組合）
//   4. 覆蓋年份較寬者優先
//   5. SKU 升冪（確保結果可重現）
//
// 用法：node scripts/collapse_brake_fitment.cjs [--apply]
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const PROD_DB = 'carparts';
const EFFECTIVE_URL = process.env.DATABASE_URL || require('dotenv').config().parsed.DATABASE_URL;
const dbName = (u => { const m = String(u).match(/\/([^/?]+)(\?|$)/); return m ? m[1] : null; })(EFFECTIVE_URL);
if (!dbName) { console.error('FATAL: 無法解析 DATABASE_URL'); process.exit(2); }
if (dbName === PROD_DB && process.env.ALLOW_PROD_DB !== '1') {
  console.error(`FATAL: 拒絕對正式庫 ${PROD_DB} 執行（設 ALLOW_PROD_DB=1 才可覆寫）`);
  process.exit(3);
}
const APPLY = process.argv.includes('--apply');
console.log(`[安全閘] 目標資料庫：${dbName}｜模式：${APPLY ? 'APPLY' : 'DRY-RUN'}`);

const prisma = new PrismaClient({ datasources: { db: { url: EFFECTIVE_URL } } });

const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function chassisOf(s) {
  const out = new Set();
  for (const m of String(s || '').toUpperCase().matchAll(/[A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3}|\d{2,3}/g)) {
    const c = m[0];
    if (c.length < 2 || /^\d{4}$/.test(c)) continue;
    out.add(c);
  }
  return out;
}

(async () => {
  // 1. 取所有已連結的適配列 + 零件等級
  const rows = await prisma.$queryRawUnsafe(`
    SELECT f.id, f.vehicle_id, f.position, f.make, f.model, f.generation, f.engine,
           f.year_start, f.year_end, f.disc_diameter_mm, f.disc_thickness_mm,
           f.disc_style, f.caliper_make, f.source,
           b.sku, b.product_line,
           v.generation AS db_generation, v.model AS db_model
    FROM brake_part_fitment f
    JOIN brake_parts b ON b.id = f.brake_part_id
    LEFT JOIN vehicle_variants v ON v.id = f.vehicle_id
    WHERE f.vehicle_id IS NOT NULL
    ORDER BY f.id
  `);
  console.log(`已連結適配列：${rows.length}`);

  // 2. 計算「主流碟規格」：同一 (make, model) 下，出現最多的碟規格組合
  const specFreq = new Map();   // make|model -> Map(specKey -> count)
  for (const r of rows) {
    const mk = `${r.make}|${r.model}`;
    if (!specFreq.has(mk)) specFreq.set(mk, new Map());
    const m = specFreq.get(mk);
    const k = [r.disc_diameter_mm, r.disc_thickness_mm, r.disc_style, r.caliper_make].join('|');
    m.set(k, (m.get(k) || 0) + 1);
  }
  const topSpec = new Map();
  for (const [mk, m] of specFreq) {
    let best = null, bestN = -1;
    for (const [k, n] of m) if (n > bestN) { best = k; bestN = n; }
    topSpec.set(mk, best);
  }

  // 3. 分組 (vehicle_id, position, product_line)
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.vehicle_id}|${r.position || '-'}|${r.product_line || '-'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  console.log(`(車型, 軸位, 等級) 組合：${groups.size}`);

  // 4a. 先定案「這個車型這個軸位用哪一種碟規格」
  //     碟盤是硬體，不會因來令片等級（Greenstuff/Redstuff/Yellowstuff/Bluestuff）而改變，
  //     所以同一 (車型, 軸位) 只能用一種碟規格。否則會出現
  //     「Greenstuff 288/25、Yellowstuff 288/25、Redstuff 312/25」這種矛盾結果。
  const specOf = r => [r.disc_diameter_mm, r.disc_thickness_mm, r.disc_style, r.caliper_make].join('|');
  const axleGroups = new Map();   // vehicle_id|position -> rows
  for (const r of rows) {
    const k = `${r.vehicle_id}|${r.position || '-'}`;
    if (!axleGroups.has(k)) axleGroups.set(k, []);
    axleGroups.get(k).push(r);
  }
  const axleSpec = new Map();     // vehicle_id|position -> specKey
  for (const [k, list] of axleGroups) {
    const dbGen = norm(list[0].db_generation || '');
    const dbModelChassis = chassisOf(list[0].db_model || '');
    const bySpec = new Map();
    for (const r of list) {
      const sk = specOf(r);
      if (!bySpec.has(sk)) bySpec.set(sk, []);
      bySpec.get(sk).push(r);
    }
    let bestSpec = null, bestScore = -1, bestTie = -1;
    for (const [sk, list2] of bySpec) {
      let sc = 0, genHit = 0, engHit = 0;
      for (const r of list2) {
        const ch = chassisOf(r.generation || '');
        if (dbGen && ch.has(dbGen)) genHit++;
        else if ([...ch].some(c => dbModelChassis.has(c))) genHit += 0.8;
        if (r.engine && list[0].engine && norm(r.engine) === norm(list[0].engine)) engHit++;
      }
      sc = genHit * 100 + engHit * 20 + list2.length;
      if (sc > bestScore || (sc === bestScore && list2.length > bestTie)) {
        bestSpec = sk; bestScore = sc; bestTie = list2.length;
      }
    }
    axleSpec.set(k, bestSpec);
  }

  // 4b. 每個 (車型, 軸位, 等級) 在選定碟規格下挑一個勝出者
  const toNull = [];
  const winners = [];
  const multiGroups = [];
  for (const [key, list] of groups) {
    if (list.length === 1) { winners.push(list[0]); continue; }
    const [vid, pos] = key.split('|');
    const wantSpec = axleSpec.get(`${vid}|${pos}`);
    const inSpec = list.filter(r => specOf(r) === wantSpec);
    // 該等級在選定碟規格下沒有對應 SKU → 寧可不安裝，也不要錯配
    // （碟規格不符的來令片實際上裝不上去，放進車型頁只會誤導顧客）
    if (!inSpec.length) {
      for (const r of list) toNull.push(r);
      multiGroups.push({ key, n: list.length, win: '(無對應規格，略過)', all: list.map(x => x.sku) });
      continue;
    }
    const pool = inSpec;
    const mk = `${list[0].make}|${list[0].model}`;
    const top = topSpec.get(mk);
    const dbGen = norm(list[0].db_generation || '');
    const dbModelChassis = chassisOf(list[0].db_model || '');
    const scored = pool.map(r => {
      const ch = chassisOf(r.generation || '');
      let s = 0;
      // 1. 世代碼一致
      if (dbGen && ch.has(dbGen)) s += 100;
      else if ([...ch].some(c => dbModelChassis.has(c))) s += 80;
      else if ([...ch].some(c => dbGen.startsWith(c))) s += 60;
      // 2. 引擎一致
      if (r.engine && list[0].engine && norm(r.engine) === norm(list[0].engine)) s += 20;
      // 3. 主流碟規格
      if (specOf(r) === top) s += 10;
      // 4. 年份覆蓋較寬
      const span = (r.year_end || 9999) - (r.year_start || 0);
      s += Math.min(9, Math.floor(span / 10));
      return { r, s };
    }).sort((a, b) => (b.s - a.s) || (a.r.sku < b.r.sku ? -1 : 1));
    const win = scored[0].r;
    winners.push(win);
    // 落選者：同組的其餘全部（含不同碟規格者）
    const winId = win.id;
    for (const r of list) if (r.id !== winId) toNull.push(r);
    if (list.length > 1) multiGroups.push({ key, n: list.length, win: win.sku, all: list.map(x => x.sku) });
  }

  console.log(`需收斂的列：${toNull.length}｜保留：${winners.length}`);
  console.log(`有多個候選的組合：${multiGroups.length}`);
  console.log('\n=== 範例（BMW 430i 前輪 Yellowstuff 類）===');
  for (const g of multiGroups.filter(g => g.key.includes('前') && g.key.includes('Yellowstuff')).slice(0, 6)) {
    console.log(`  ${g.key}`);
    console.log(`     勝出 ${g.win}｜原候选 ${g.all.length} 個: ${g.all.join(', ')}`);
  }

  if (!APPLY) {
    console.log('\n--- DRY-RUN（未寫入）---');
    await prisma.$disconnect();
    return;
  }

  // 5. 寫入：把落選者的 vehicle_id 清為 NULL
  const CHUNK = 500;
  for (let i = 0; i < toNull.length; i += CHUNK) {
    const ids = toNull.slice(i, i + CHUNK).map(r => r.id);
    await prisma.brakePartFitment.updateMany({
      where: { id: { in: ids } },
      data: { vehicle_id: null },
    });
  }
  const still = await prisma.brakePartFitment.count({ where: { vehicle_id: { not: null } } });
  console.log(`\n收斂完成：清空 ${toNull.length} 筆，剩餘已連結 ${still} 筆`);

  await prisma.$disconnect();
})().catch(async e => { console.error('ERR', e.message); await prisma.$disconnect(); process.exit(1); });
