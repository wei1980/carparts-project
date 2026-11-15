/**
 * fix_brembo_images.js — 修復 Brembo 商品圖指向外部 CDN 的問題
 *
 * 背景（2026-11 稽核發現）：
 *   4,129 個 Brembo 商品的 image_url 是
 *     /media/m2_catalog_cache/1440x1440%2FTecDoc%2F.../xxx.jpg?1
 *   這是匯入時從 trodo 的 CDN 只存了 path、沒存 domain。
 *   - 本地 media/m2_catalog_cache/ 目錄不存在
 *   - 且不在 MEDIA_PUBLIC_PREFIXES 白名單 → 一律 401
 *   結果：這 4,129 個商品在前台全部只顯示「圖片準備中」佔位塊。
 *
 * 作法：從 CDN 下載到 media/parts/Brand/Brembo/<型號>.jpg，
 *       image_url 改成本機路徑。需 Referer（CDN 有防熱連結）。
 *
 * 用法：
 *   node scripts/fix_brembo_images.js --dry-run      # 只統計，不下載
 *   node scripts/fix_brembo_images.js --limit 50     # 先試 50 張
 *   node scripts/fix_brembo_images.js                # 全量（4,129 張）
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit'));
// 支援 --limit 30 / --limit=30（process.argv 已把兩段分開，這裡統一取後面的數字）
let LIMIT = 0;
if (limitArg) {
  const inline = limitArg.includes('=') ? limitArg.split('=')[1] : null;
  if (inline) {
    LIMIT = parseInt(inline, 10) || 0;
  } else {
    const idx = process.argv.indexOf(limitArg);
    LIMIT = parseInt(process.argv[idx + 1], 10) || 0;
  }
}

const OUT_DIR = path.join(__dirname, '..', 'media', 'parts', 'Brand', 'Brembo');
const CDN_BASE = 'https://picdn.trodo.com';
const REFERER = 'https://www.trodo.com/';

function fetchTo(url, dest, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 5) return resolve({ ok: false, reason: 'too many redirects' });
    const req = https.get(url, {
      headers: {
        'Referer': REFERER,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : CDN_BASE + res.headers.location;
        return resolve(fetchTo(next, dest, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ ok: false, reason: 'HTTP ' + res.statusCode });
      }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > 8 * 1024 * 1024) { req.destroy(); return resolve({ ok: false, reason: 'too large' }); }
        chunks.push(c);
      });
      res.on('end', () => {
        try {
          fs.writeFileSync(dest, Buffer.concat(chunks));
          resolve({ ok: true, size });
        } catch (e) { resolve({ ok: false, reason: e.message }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, reason: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
  });
}

function localName(imageUrl, sku) {
  // 取 URL 最後一段的檔名，去掉 query；若無副檔名則用 sku
  const clean = imageUrl.split('?')[0];
  // decodeURIComponent 對整段做，避免 %2F 被解成路徑分隔而抓錯段
  let decoded = clean;
  try { decoded = decodeURIComponent(clean); } catch { /* 保留原值 */ }
  const base = decoded.split('/').pop() || '';
  if (/\.(jpg|jpeg|png|webp)$/i.test(base)) return base;
  return `${sku}.jpg`;
}

(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT id, sku, brand, image_url FROM parts
    WHERE image_url LIKE '/media/m2_catalog_cache%'
    ORDER BY id
  `);
  const list = LIMIT > 0 ? rows.slice(0, LIMIT) : rows;

  console.log(`Brembo CDN 圖片商品：${rows.length} 筆${DRY ? '（dry-run）' : `，本次處理 ${list.length}`}`);
  console.log('輸出目錄:', OUT_DIR);

  if (DRY) {
    const sample = rows.slice(0, 3);
    sample.forEach((r) => console.log(`  #${r.id} ${r.sku} → ${localName(r.image_url, r.sku)}`));
    console.log('\n[dry-run] 未下載。');
    await prisma.$disconnect();
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0, fail = 0, skip = 0;
  const failures = [];
  const t0 = Date.now();

  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const name = localName(r.image_url, r.sku);
    const dest = path.join(OUT_DIR, name);
    const relUrl = `/media/parts/Brand/Brembo/${name}`;

    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      // 檔案已在 → 只更新 DB 指向
      await prisma.part.update({ where: { id: r.id }, data: { image_url: relUrl } });
      skip++;
      continue;
    }

    const remote = CDN_BASE + r.image_url;
    const res = await fetchTo(remote, dest);
    if (res.ok) {
      await prisma.part.update({ where: { id: r.id }, data: { image_url: relUrl } });
      ok++;
    } else {
      fail++;
      if (failures.length < 10) failures.push({ id: r.id, sku: r.sku, reason: res.reason });
    }

    if ((i + 1) % 250 === 0) {
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  ... ${i + 1}/${list.length}  ok=${ok} skip=${skip} fail=${fail}  ${el}s`);
    }
  }

  const mb = (list.length ? require('child_process') : null, 0);
  console.log(`\n=== 完成 ===`);
  console.log(`  下載成功: ${ok}`);
  console.log(`  檔案已存在（只更新 DB）: ${skip}`);
  console.log(`  失敗: ${fail}`);
  if (failures.length) {
    console.log('  失敗樣本:');
    failures.forEach((f) => console.log(`    #${f.id} ${f.sku}: ${f.reason}`));
  }
  console.log(`  耗時: ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  await prisma.$disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });