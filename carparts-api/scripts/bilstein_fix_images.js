/**
 * bilstein_fix_images.js — 補齊 BILSTEIN 缺圖 SKU
 *
 * 兩類來源：
 *   A. 磁碟上其實有同 SKU 檔（CSV 的 image_file 欄漏填）→  ← 精確，直接沿用
 *   B. 完全無圖 → 借用「同產品線中被最多 SKU 共用的通用產品圖」
 *      依據：BILSTEIN 供應商自己就把同一張圖以不同 SKU 檔名分發
 *      （實測 46-258144.JPG 的 bytes 出現在 37 個不同 SKU 檔名下），
 *      所以同產品線共用一張產品圖是供應商既有的資料慣例，不是猜測。
 *
 * 用法：node scripts/bilstein_fix_images.js          # dry-run
 *       node scripts/bilstein_fix_images.js --apply  # 寫入
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();
const CSV = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/Parts_BILSTEIN_V10_final.csv';
const SRC_DIR = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/images';
const DEST_DIR = path.join(__dirname, '..', 'media', 'parts', 'Suspension', 'BILSTEIN');
const APPLY = process.argv.includes('--apply');

// 產品線判定（與 bilstein_import.js 一致）
const PREFIX = {
  '19': 'B4', '22': 'B4', '24': 'B4', '21': 'B4',
  '26': 'B6', '34': 'B6', '20': 'B6', '23': 'B6', '33': 'B6',
  '35': 'B8', '29': 'B8',
  '46': 'B12', '47': 'B14', '48': 'B16', '49': 'B16',
  '11': 'Dust', '14': 'Damper', '53': 'Kit',
};

(async () => {
  const rows = parse(fs.readFileSync(CSV, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
  const bySku = new Map();
  for (const r of rows) {
    const s = String(r.sku || '').trim();
    if (!s || bySku.has(s)) continue;
    bySku.set(s, r);
  }
  const lineOf = (sku) => {
    const n = String((bySku.get(sku) || {}).name || '');
    const m = n.match(/\b(B1[0-9]|B[4-8])\b/);
    if (m) return m[1];
    return PREFIX[sku.slice(0, 2)] || '?';
  };

  // 磁碟上的實際檔案
  const files = fs.readdirSync(SRC_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  const skuToFile = new Map();
  for (const f of files) {
    const sku = f.replace(/\.[^.]+$/, '');
    if (!skuToFile.has(sku)) skuToFile.set(sku, f);
  }

  // md5 → SKU 群
  const groups = new Map();
  for (const [sku, f] of skuToFile) {
    const h = crypto.createHash('md5').update(fs.readFileSync(path.join(SRC_DIR, f))).digest('hex');
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(sku);
  }
  const sizeOf = new Map();
  for (const [sku, f] of skuToFile) {
    const h = crypto.createHash('md5').update(fs.readFileSync(path.join(SRC_DIR, f))).digest('hex');
    sizeOf.set(sku, (groups.get(h) || []).length);
  }

  // 缺圖 SKU
  const noImg = [...bySku.keys()].filter(s => !String(bySku.get(s).image_file || '').trim());
  const exact = noImg.filter(s => skuToFile.has(s));       // A 類
  const borrow = noImg.filter(s => !skuToFile.has(s));     // B 類
  console.log(`CSV 無圖 SKU: ${noImg.length}`);
  console.log(`  A 類（磁碟有同 SKU 檔，CSV 漏填）: ${exact.length}`);
  console.log(`  B 類（完全無圖，需借用同線圖）  : ${borrow.length}`);

  // B 類：找同產品線中最常被共用的圖
  const byLine = new Map();
  for (const [sku, f] of skuToFile) {
    const l = lineOf(sku);
    if (!byLine.has(l)) byLine.set(l, []);
    byLine.get(l).push(sku);
  }

  const plan = [];
  for (const s of exact) {
    plan.push({ sku: s, line: lineOf(s), from: skuToFile.get(s), kind: 'exact', sharedBy: sizeOf.get(s) || 1 });
  }
  for (const s of borrow) {
    const l = lineOf(s);
    const pool = (byLine.get(l) || []).filter(x => x !== s);
    let best = null, bestN = 0;
    for (const p of pool) {
      const n = sizeOf.get(p) || 1;
      if (n > bestN) { bestN = n; best = p; }
    }
    if (best) plan.push({ sku: s, line: l, from: skuToFile.get(best), kind: 'borrow', sharedBy: bestN });
  }

  const stat = { exact: 0, borrow: 0, skipped: 0 };
  const bySource = new Map();
  for (const p of plan) {
    stat[p.kind]++;
    if (!bySource.has(p.from)) bySource.set(p.from, { n: 0, kind: p.kind, line: p.line, sharedBy: p.sharedBy });
    bySource.get(p.from).n++;
  }

  console.log(`\n=== 計畫 ===`);
  console.log(`  可補圖: ${plan.length}（精確 ${stat.exact} / 借用 ${stat.borrow}）`);
  console.log(`  實體來源檔: ${bySource.size} 張`);
  [...bySource.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([f, e]) => {
    console.log(`   ${f.padEnd(16)} ${e.kind === 'exact' ? '精確' : '借用'} [${e.line}] → ${e.n} 個 SKU（此圖已被 ${e.sharedBy} 個 SKU 共用）`);
  });

  const uncovered = borrow.length - stat.borrow;
  if (uncovered > 0) console.log(`  ⚠ 仍無可借用來源: ${uncovered}`);

  console.log('\n樣本:');
  plan.slice(0, 6).forEach(p => console.log(`   ${p.sku} → ${p.from} (${p.kind}, ${p.line})`));

  if (!APPLY) {
    console.log('\n[dry-run] 未寫入。加 --apply 執行。');
    await prisma.$disconnect();
    return;
  }

  // ---- 執行 ----
  fs.mkdirSync(DEST_DIR, { recursive: true });
  let copied = 0, updated = 0, failed = 0;
  for (const p of plan) {
    try {
      const destName = `${p.sku}${path.extname(p.from)}`;
      const dest = path.join(DEST_DIR, destName);
      const src = path.join(SRC_DIR, p.from);
      if (!fs.existsSync(dest)) { fs.copyFileSync(src, dest); copied++; }
      const image_url = `/media/parts/Suspension/BILSTEIN/${destName}`;
      await prisma.part.update({ where: { sku: p.sku }, data: { image_url } });
      updated++;
    } catch (e) {
      failed++;
    }
  }
  console.log(`\n=== 完成 ===`);
  console.log(`  複製圖檔: ${copied} | 更新 DB: ${updated} | 失敗: ${failed}`);

  // 驗證
  const chk = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int total,
       COUNT(*) FILTER (WHERE image_url IS NOT NULL)::int with_img
     FROM parts WHERE brand='BILSTEIN'`
  );
  console.log(`  驗證: ${chk[0].with_img} / ${chk[0].total} 有圖`);

  const miss = await prisma.$queryRawUnsafe(
    `SELECT sku, name FROM parts WHERE brand='BILSTEIN' AND image_url IS NULL ORDER BY sku LIMIT 15`
  );
  if (miss.length) {
    console.log(`  仍缺圖 ${miss.length}+ 個:`);
    miss.forEach(m => console.log(`    ${m.sku}  ${m.name}`));
  }

  await prisma.$disconnect();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });