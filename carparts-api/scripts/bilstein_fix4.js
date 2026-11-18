// 補 4 個缺圖 SKU（同產品線借用通用產品圖）
// 與 bilstein_fix_images.js 相同邏輯，但只處理指定 SKU，且用 V11 合併後的資料
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse/sync');

const p = new PrismaClient();
const D = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN';
const IMG_SRC = path.join(D, 'images');
const DEST = 'C:/carparts/carparts-api/media/parts/Suspension/BILSTEIN';
const CSV = path.join(D, 'Parts_BILSTEIN_V11_merged.csv');
const APPLY = process.argv.includes('--apply');

const raw = fs.readFileSync(CSV, 'utf8');
const rows = parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw,
  { columns: true, skip_empty_lines: true, trim: true });
const bySku = new Map();
for (const r of rows) {
  const s = String(r.sku || '').trim();
  if (s && !bySku.has(s)) bySku.set(s, r);
}

// 產品線（與 bilstein_import.js 一致）
const PFX = { '19': 'B4', '22': 'B4', '24': 'B4', '20': 'B6', '23': 'B6', '26': 'B6', '34': 'B6',
  '35': 'B8', '46': 'B12', '47': 'B14', '48': 'B16', '49': 'B16', '11': 'Dust', '14': 'Damper', '53': 'Kit' };
const lineOf = (sku) => {
  const n = String((bySku.get(sku) || {}).name || '');
  const m = n.match(/\b(B1[0-9]|B[4-8])\b/);
  if (m) return m[1];
  return PFX[sku.slice(0, 2)] || '?';
};

// 磁碟檔案 + md5
const files = fs.readdirSync(IMG_SRC).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
const skuFile = new Map();
for (const f of files) {
  const s = f.replace(/\.[^.]+$/, '');
  if (!skuFile.has(s)) skuFile.set(s, f);
}
const md5 = new Map();
for (const [s, f] of skuFile) {
  const h = crypto.createHash('md5').update(fs.readFileSync(path.join(IMG_SRC, f))).digest('hex');
  if (!md5.has(h)) md5.set(h, []);
  md5.get(h).push(s);
}
const groupSize = new Map();
for (const [h, arr] of md5) for (const s of arr) groupSize.set(s, arr.length);

// 依產品線找「被最多 SKU 共用」的圖
const byLine = new Map();
for (const [s, f] of skuFile) {
  const l = lineOf(s);
  if (!byLine.has(l)) byLine.set(l, []);
  byLine.get(l).push(s);
}

const targets = ['20-353254','23-322738','24-005449','24-005555','34-000533','34-000540','34-000588','46-336491','47-353572'];

(async () => {
const plan = [];
for (const sku of targets) {
  const l = lineOf(sku);
  let best = null, bestN = 0;
  for (const cand of (byLine.get(l) || [])) {
    if (cand === sku) continue;
    const n = groupSize.get(cand) || 1;
    if (n > bestN) { bestN = n; best = cand; }
  }
  if (!best) { console.log(`  ✗ ${sku} (${l}) 找不到同線圖`); continue; }
  plan.push({ sku, line: l, from: best, fromFile: skuFile.get(best), sharedBy: bestN });
  console.log(`  ${sku} (${l}) ← ${best}  此圖被 ${bestN} 個 SKU 共用`);
}

if (!APPLY) {
  console.log('\n[dry-run] 加 --apply 執行');
  await p.$disconnect();
  return;
}

fs.mkdirSync(DEST, { recursive: true });
let copied = 0, upd = 0;
for (const q of plan) {
  const destName = q.sku + path.extname(q.fromFile);
  const dest = path.join(DEST, destName);
  if (!fs.existsSync(dest)) { fs.copyFileSync(path.join(IMG_SRC, q.fromFile), dest); copied++; }
  await p.part.update({ where: { sku: q.sku }, data: { image_url: `/media/parts/Suspension/BILSTEIN/${destName}` } });
  upd++;
}
console.log(`\n複製 ${copied} | 更新 ${upd}`);

const chk = await p.$queryRawUnsafe(
  `SELECT COUNT(*)::int t, COUNT(*) FILTER (WHERE image_url IS NULL)::int n FROM parts WHERE brand='BILSTEIN'`
);
console.log(`驗證: ${chk[0].t} 個商品, 缺圖 ${chk[0].n}`);
await p.$disconnect();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });