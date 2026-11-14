#!/usr/bin/env node
/**
 * fix_part_image_urls.js — 修正常見的 Part.image_url 資料問題
 *
 * 可重複執行（冪等）。預設「乾跑」只報告，加 --apply 才會真的寫入。
 *
 * 用法：
 *   node scripts/fix_part_image_urls.js               # 乾跑：只印報告
 *   node scripts/fix_part_image_urls.js --apply        # 實際寫入
 *   node scripts/fix_part_image_urls.js --apply --quiet
 *
 * 處理四類問題：
 *   A. 重複前綴   media/parts/...      → /media/parts/...   （檔案其實存在）
 *   B. 前導斜線   media/... 以外無斜線 → 補 /
 *   C. null 產物   ...1440x1440null    → 清空（讓前端走佔位圖）
 *   D. 檔案不存在  /media/...          → 只報告，不自動清（見下方說明）
 *
 * ⚠️ 為什麼 D 類不自動清？
 *    m2_catalog_cache 那 4,000+ 筆是「整個目錄沒進 repo」，可能只是本機缺檔、
 *    正式環境其實有。自動清空會把正式環境的圖弄不見。要先確認：
 *      - 本機缺 → 補檔案進 media/
 *      - 正式環境也缺 → 再清空（--clear-missing）
 *
 * 加 --clear-missing 才會把「檔案真的不存在」的 image_url 設為 null。
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const CLEAR_MISSING = process.argv.includes('--clear-missing');
const QUIET = process.argv.includes('--quiet');

// media 目錄：本專案實際放在 carparts-api/media（不是專案根）
const MEDIA_DIR = path.join(__dirname, '..', 'media');

const log = (...a) => { if (!QUIET) console.log(...a); };

/** image_url → 磁碟路徑（已解 URL 編碼、去掉 query） */
function toFsPath(imageUrl) {
  if (!imageUrl) return null;
  // 外鏈不檢查本機檔案
  if (/^https?:\/\//i.test(imageUrl)) return null;
  const clean = decodeURIComponent(imageUrl.split('?')[0]);
  const rel = clean.replace(/^\/+/, '');              // 去掉前導斜線
  return path.join(MEDIA_DIR, rel.replace(/^media[\\/]/, ''));
}

function exists(imageUrl) {
  const p = toFsPath(imageUrl);
  if (p === null) return true;   // 外鏈：不在此檢查
  return fs.existsSync(p);
}

// ============================================================
// 分類
// ============================================================
function classify(imageUrl) {
  if (!imageUrl) return { kind: 'EMPTY' };
  if (/^https?:\/\//i.test(imageUrl)) return { kind: 'EXTERNAL' };
  if (imageUrl.includes('1440x1440null')) return { kind: 'NULL_ARTIFACT' };

  // A. 重複 media/ 前綴（檔案存在，只是 URL 錯）
  if (/^media\//.test(imageUrl)) {
    return exists(imageUrl) ? { kind: 'DUP_PREFIX' } : { kind: 'MISSING' };
  }

  // B. 相對路徑沒前導斜線（/media 靜態掛載需要絕對路徑）
  if (!imageUrl.startsWith('/')) {
    return { kind: 'NO_LEADING_SLASH' };
  }

  // D. 檔案不存在
  if (!exists(imageUrl)) return { kind: 'MISSING' };

  return { kind: 'OK' };
}

/** 依分類回傳修正後的值（null = 不需改） */
function fixValue(kind, imageUrl) {
  switch (kind) {
    case 'DUP_PREFIX':
    case 'NO_LEADING_SLASH': {
      const rel = imageUrl.replace(/^\/+/, '').replace(/^media[\\/]/, '');
      return '/media/' + rel;
    }
    case 'NULL_ARTIFACT':
      return null;
    default:
      return null;
  }
}

// ============================================================
// 主流程
// ============================================================
(async () => {
  const total = await prisma.part.count();
  const withImg = await prisma.part.count({ where: { image_url: { not: null } } });
  log(`parts 總數 ${total}｜有 image_url ${withImg}`);
  log(`media 目錄：${MEDIA_DIR}`);
  log(`模式：${APPLY ? 'APPLY（會寫入）' : 'DRY-RUN（只報告）'}${CLEAR_MISSING ? ' + --clear-missing' : ''}`);
  log('');

  const buckets = { OK: 0, DUP_PREFIX: 0, NO_LEADING_SLASH: 0, NULL_ARTIFACT: 0, MISSING: 0, EMPTY: 0, EXTERNAL: 0 };
  const missingByDir = new Map();
  const toFix = [];          // [{id, image_url, newUrl, kind}]
  const toClear = [];        // [{id, image_url}]

  // 分批掃，避免一次撈 13k 筆進記憶體
  const BATCH = 1000;
  let scanned = 0;
  while (scanned < withImg) {
    const rows = await prisma.part.findMany({
      where: { image_url: { not: null } },
      select: { id: true, image_url: true },
      skip: scanned,
      take: BATCH,
    });
    if (rows.length === 0) break;

    for (const r of rows) {
      const { kind } = classify(r.image_url);
      buckets[kind] = (buckets[kind] || 0) + 1;

      if (kind === 'MISSING') {
        // 目錄層統計，方便判斷是「整個目錄沒進 repo」還是零星缺檔
        const clean = decodeURIComponent(r.image_url.split('?')[0]).replace(/^\/+/, '');
        const dir = clean.split('/').slice(0, 2).join('/');
        missingByDir.set(dir, (missingByDir.get(dir) || 0) + 1);
        if (CLEAR_MISSING) toClear.push({ id: r.id, image_url: r.image_url });
      } else if (kind === 'NULL_ARTIFACT') {
        toClear.push({ id: r.id, image_url: r.image_url });
      } else {
        const nv = fixValue(kind, r.image_url);
        if (nv !== null && nv !== r.image_url) {
          toFix.push({ id: r.id, image_url: r.image_url, newUrl: nv, kind });
        }
      }
    }
    scanned += rows.length;
    process.stdout.write(`\r  已掃 ${scanned}/${withImg}`);
  }
  log('\n');

  // ---- 報告 ----
  log('=== 分類統計 ===');
  const label = {
    OK: '正常',
    DUP_PREFIX: 'A 重複 media/ 前綴（檔案存在，URL 錯）',
    NO_LEADING_SLASH: 'B 缺前導斜線',
    NULL_ARTIFACT: 'C null 產物（1440x1440null）',
    MISSING: 'D 檔案不存在（只報告）',
    EMPTY: '無 image_url',
    EXTERNAL: '外部連結（不檢查本機）',
  };
  for (const [k, v] of Object.entries(buckets)) {
    if (k === 'EMPTY' || k === 'OK') { if (v) log(`  ${label[k]}: ${v}`); continue; }
    log(`  ${label[k]}: ${v}`);
  }

  if (missingByDir.size > 0) {
    log('\n=== 檔案缺失集中目錄（前 10）===');
    [...missingByDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([d, c]) => log(`  ${d}: ${c}`));
    const totalMissing = [...missingByDir.values()].reduce((s, n) => s + n, 0);
    log(`  （合計 ${totalMissing} 筆）`);
  }

  if (toFix.length) {
    log(`\n=== 待修正 URL：${toFix.length} 筆 ===`);
    toFix.slice(0, 5).forEach((x) => log(`  #${x.id} [${x.kind}]\n    ${x.image_url}\n →  ${x.newUrl}`));
    if (toFix.length > 5) log(`  … 其餘 ${toFix.length - 5} 筆略`);
  }
  if (toClear.length) {
    log(`\n=== 待清空 image_url：${toClear.length} 筆 ===`);
    toClear.slice(0, 3).forEach((x) => log(`  #${x.id}  ${String(x.image_url).slice(0, 80)}`));
  }

  // ---- 寫入 ----
  if (!APPLY) {
    log(`\n[DRY-RUN] 未寫入任何資料。加 --apply 才會套用。`);
    await prisma.$disconnect();
    return;
  }
  if (toFix.length === 0 && toClear.length === 0) {
    log('\n沒有需要修改的資料。');
    await prisma.$disconnect();
    return;
  }

  let fixed = 0, cleared = 0, failed = 0;
  for (const x of toFix) {
    try {
      await prisma.part.update({ where: { id: x.id }, data: { image_url: x.newUrl } });
      fixed++;
    } catch (e) {
      failed++;
      console.error(`  修 #${x.id} 失敗: ${e.message}`);
    }
  }
  for (const x of toClear) {
    try {
      await prisma.part.update({ where: { id: x.id }, data: { image_url: null } });
      cleared++;
    } catch (e) {
      failed++;
      console.error(`  清 #${x.id} 失敗: ${e.message}`);
    }
  }

  log(`\n=== 完成 ===`);
  log(`  修正 URL: ${fixed}`);
  log(`  清空 image_url: ${cleared}${CLEAR_MISSING ? '' : '（僅 null 產物；檔案缺失需 --clear-missing）'}`);
  if (failed) log(`  失敗: ${failed}`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});