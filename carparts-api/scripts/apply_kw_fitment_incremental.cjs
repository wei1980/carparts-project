// KW 適配增量套用（暫存庫驗證用）
//
// 設計原則：只「新增」零適配零件的適配連結，絕不刪除或修改既有連結。
// 理由：v7 結果雖經客觀評估確認淨改善 +531，但整體重建會覆寫 354 筆已正確的適配；
//       增量模式風險小得多，且可回滾（僅需刪除本次新增的連結）。
//
// 用法：node scripts/apply_kw_fitment_incremental.cjs --resolved <檔案> [--apply]
//       不加 --apply 為 dry-run，只印出將會做的變更。
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// ========== 安全閘 ==========
const PROD_DB = 'carparts';
const EFFECTIVE_URL = process.env.DATABASE_URL || require('dotenv').config().parsed.DATABASE_URL;
const dbName = (u => { const m = String(u).match(/\/([^/?]+)(\?|$)/); return m ? m[1] : null; })(EFFECTIVE_URL);
if (!dbName) { console.error('FATAL: 無法解析 DATABASE_URL'); process.exit(2); }
if (dbName === PROD_DB && process.env.ALLOW_PROD_DB !== '1') {
  console.error(`FATAL: 拒絕對正式庫 ${PROD_DB} 寫入（設 ALLOW_PROD_DB=1 才可覆寫）`);
  process.exit(3);
}
const APPLY = process.argv.includes('--apply');
const ri = process.argv.indexOf('--resolved');
const resolvedFile = ri >= 0 ? process.argv[ri + 1] : 'scratch_v7_resolved.json';

const prisma = new PrismaClient({ datasources: { db: { url: EFFECTIVE_URL } } });
const API = 'C:/carparts/carparts-api';

(async () => {
  console.log(`[安全閘] 目標資料庫：${dbName}｜模式：${APPLY ? 'APPLY（實際寫入）' : 'DRY-RUN'}`);
  const resolved = JSON.parse(fs.readFileSync(path.isAbsolute(resolvedFile) ? resolvedFile : path.join(API, resolvedFile), 'utf8'));

  // SKU → 變體 id 清單
  const skuVars = new Map();
  for (const [key, sku] of resolved) {
    const [vid] = key.split('|');
    if (!skuVars.has(sku)) skuVars.set(sku, new Set());
    skuVars.get(sku).add(Number(vid));
  }

  // 找出目前零適配的 KW parts
  const orphan = await prisma.part.findMany({
    where: { brand: 'KW Suspensions', is_active: true, compatible_vehicles: { none: {} } },
    select: { id: true, sku: true, name: true, subcategory: { select: { name: true } } },
  });
  console.log(`KW 零適配零件：${orphan.length} 筆`);

  // --extend 模式：除了零適配零件，也補上「連結不足」的零件
  //   （已有部分連結、但 v7 有更多變體的零件）。純新增，不刪除既有連結。
  const EXTEND = process.argv.includes('--extend');
  let allKw = orphan;
  if (EXTEND) {
    allKw = await prisma.part.findMany({
      where: { brand: 'KW Suspensions', is_active: true },
      select: { id: true, sku: true, name: true, subcategory: { select: { name: true } } },
    });
    console.log('模式：--extend（零適配 + 連結不足）');
  }

  // 既有連結（用於計算缺哪些）
  const existingLinks = await prisma.partCompatibility.findMany({
    where: { part_id: { in: allKw.map(x => x.id) } },
    select: { part_id: true, vehicle_id: true },
  });
  const existingByPart = new Map();
  for (const l of existingLinks) {
    if (!existingByPart.has(l.part_id)) existingByPart.set(l.part_id, new Set());
    existingByPart.get(l.part_id).add(l.vehicle_id);
  }

  const bySku = new Map(allKw.map(p => [p.sku, p]));
  const plan = [];
  for (const [sku, vids] of skuVars) {
    const part = bySku.get(sku);
    if (!part) continue;
    if (!vids.size) continue;
    const have = existingByPart.get(part.id) || new Set();
    const missing = [...vids].filter(v => !have.has(v));
    if (!missing.length) continue;   // 已完整
    plan.push({ part, vids: missing });
  }
  const totalLinks = plan.reduce((a, x) => a + x.vids.length, 0);
  console.log(`可補上：${plan.length} 個零件，共 ${totalLinks} 條連結`);

  // 確認變體都存在
  const allIds = [...new Set(plan.flatMap(x => x.vids))];
  const existingVars = await prisma.vehicleVariant.findMany({ where: { id: { in: allIds } }, select: { id: true } });
  const existingSet = new Set(existingVars.map(v => v.id));
  const missing = allIds.filter(id => !existingSet.has(id));
  if (missing.length) {
    console.log(`⚠️ 忽略 ${missing.length} 個不存在的變體 id`);
  }
  const valid = plan.map(x => ({ ...x, vids: x.vids.filter(id => existingSet.has(id)) }))
                      .filter(x => x.vids.length);
  const validLinks = valid.reduce((a, x) => a + x.vids.length, 0);
  console.log(`實際可寫入：${valid.length} 個零件，${validLinks} 條連結`);

  // 依子分類統計
  const bySub = new Map();
  for (const x of valid) {
    const k = x.part.subcategory?.name || '?';
    bySub.set(k, (bySub.get(k) || 0) + 1);
  }
  console.log('依子分類：', [...bySub.entries()].map(([k, v]) => `${k} ${v}`).join(' | '));

  if (!APPLY) {
    console.log('\n--- DRY-RUN（未寫入）---');
    for (const x of valid.slice(0, 8)) {
      console.log(`  ${x.part.sku} ${x.part.name} → ${x.vids.length} 個變體`);
    }
    console.log(`  ... 共 ${valid.length} 個零件`);
    await prisma.$disconnect();
    return;
  }

  // 實際寫入（單一交易）
  const before = await prisma.partCompatibility.count({ where: { part: { brand: 'KW Suspensions' } } });
  console.log(`\n寫入前 KW 適配連結：${before} 條`);

  await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const x of valid) for (const vid of x.vids) rows.push({ part_id: x.part.id, vehicle_id: vid });
    // 分批以避免參數上限
    const CHUNK = 2000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx.partCompatibility.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true });
    }
  }, { timeout: 120000 });

  const after = await prisma.partCompatibility.count({ where: { part: { brand: 'KW Suspensions' } } });
  console.log(`寫入後 KW 適配連結：${after} 條（新增 ${after - before} 條）`);

  // 驗證
  const stillOrphan = await prisma.part.count({ where: { brand: 'KW Suspensions', is_active: true, compatible_vehicles: { none: {} } } });
  const zeroBefore = orphan.length;
  console.log(`\n驗證：零適配零件 ${zeroBefore} → ${stillOrphan}`);
  // 既有零件的連結是否被保留
  const touched = valid.map(x => x.part.id);
  const linkCount = await prisma.partCompatibility.count({ where: { part_id: { in: touched } } });
  console.log(`本次補上的零件現在共有 ${linkCount} 條連結`);

  await prisma.$disconnect();
})().catch(async e => { console.error('ERR', e.message); await prisma.$disconnect(); process.exit(1); });
