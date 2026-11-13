// FUNK Motorsport 渦輪隔熱毯匯入（271 SKU）
// 定價（使用者公式）：建議售價 TWD = (£ × 44 + 2000 國際運費) × 1.2 關稅；批發價 = 建議售價 × 0.9
// 分類：引擎 → 其他（subcategory_id 20 / category_id 5；CSV 的 熱管理｜渦輪隔熱毯 在 DB 無對應類別，使用者已確認）
// 圖片：media/parts/Brand/FUNK/<parent SKU>.<ext>（48 個官網商品照片，尺寸變體共用）
// 相容連結：funk_match v5 產出（identity 相等＋MkN-AND 世代閘＋引擎族前綴＋排氣量矛盾檢查＋dt 雙層閘）
// 同車去重：funk_dedup.js（每車只保留名稱最符合車型的一個 SKU；去重後零相容 SKU 下架 is_active=false）
// 乾跑（預設）：列印全部變更不寫入；上架：node funk_import.js --apply
const { PrismaClient } = require('@prisma/client');
const { runDedup } = require('./funk_dedup');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const SCRATCH = 'C:/Users/User/AppData/Local/hermes/cache/scratch';
const CSV_PATH = 'C:/Users/User/Desktop/商品資料庫/parts_upload_FUNK.csv';
const DATA = path.join(process.cwd(), 'media/Data');
const IMG_DIR_REL = path.join('media/parts/Brand/FUNK');
const BRAND = 'Funk Motorsport';
const SUBCAT_ID = 20;    // 引擎/其他
const CATEGORY_ID = 5;   // 引擎
const CATEGORY_NAME = '引擎';

const sanitize = s => s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

// ---------- CSV parser (state machine, quoted multi-line safe) ----------
function parseCSV(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map(h => h.replace(/^﻿/, '').trim());
  return rows.filter(r => r.length > 1).map(r => {
    const o = {};
    header.forEach((h, i) => o[h] = (r[i] || '').trim());
    return o;
  });
}

function gbpPrice(p) {
  const m = String(p || '').match(/^£\s*([\d.]+)$/);
  return m ? parseFloat(m[1]) : null;
}
const msrpTwd = g => Math.round((g * 44 + 2000) * 1.2);

async function main() {
  const rows = parseCSV(fs.readFileSync(CSV_PATH, 'utf-8'));
  const skuImg = JSON.parse(fs.readFileSync(SCRATCH + '/funk_sku_image_map.json', 'utf-8'));
  const parentImgs = JSON.parse(fs.readFileSync(SCRATCH + '/funk_parent_images.json', 'utf-8'));
  const links = JSON.parse(fs.readFileSync(SCRATCH + '/funk_fitment_results.json', 'utf-8'));
  const unmatched = JSON.parse(fs.readFileSync(SCRATCH + '/funk_fitment_unmatched.json', 'utf-8'));
  const ambiguous = JSON.parse(fs.readFileSync(SCRATCH + '/funk_fitment_ambiguous.json', 'utf-8'));
  const broad = JSON.parse(fs.readFileSync(SCRATCH + '/funk_broad_rows.json', 'utf-8'));

  // parent SKU → local image file (extension from the source URL)
  const parentFile = {};
  for (const psku of Object.keys(parentImgs)) {
    const m = (parentImgs[psku] || '').match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i);
    parentFile[psku] = sanitize(psku) + '.' + (m ? m[1].toLowerCase() : 'jpg');
  }

  // product master: first row per SKU carries the product columns
  const bySku = new Map();
  for (const r of rows) if (!bySku.has(r['SKU'])) bySku.set(r['SKU'], r);
  console.log(`CSV: ${rows.length} rows → ${bySku.size} unique SKU`);

  // ---------- 1. 零件主檔（乾跑預检） ----------
  const imgMissing = [], noPrice = [];
  const partPlans = [];
  for (const [sku, r] of bySku) {
    const gbp = gbpPrice(r['建議售價']);
    if (gbp === null) { noPrice.push(sku); continue; }
    const msrp = msrpTwd(gbp);
    const wholesale = Math.round(msrp * 0.9);
    const info = skuImg[sku];
    if (!info || !info.parent_sku || !parentFile[info.parent_sku]) { imgMissing.push(sku); continue; }
    const file = parentFile[info.parent_sku];
    const localPath = path.join(process.cwd(), IMG_DIR_REL, file);
    if (!fs.existsSync(localPath)) imgMissing.push(sku + ' (missing file ' + file + ')');
    partPlans.push({
      sku,
      data: {
        name: r['品名'],
        brand: BRAND,
        subcategory_id: SUBCAT_ID,
        category: CATEGORY_NAME,
        image_url: `/media/parts/Brand/FUNK/${file}`,
        description: r['商品說明'] || null,
        specs: null,
        msrp_price: msrp,
        wholesale_price: wholesale,
        stock_qty: parseInt(r['庫存數量'], 10) || 0,
        distributor_stock_qty: 0,
        is_universal: false,
        is_active: msrp >= 100,
      },
    });
  }
  console.log(`零件主檔：${partPlans.length} SKU 有完整計畫｜圖片缺失 ${imgMissing.length}｜無價格 ${noPrice.length}`);
  if (imgMissing.length) console.log('  圖片缺失 SKU: ' + imgMissing.slice(0, 20).join(', '));

  // ---------- 2. 相容連結計畫（去重：同 SKU 經不同年份/世代組連到同一車型變體只算一筆） ----------
  const linkSet = new Map(); // sku -> Set(variant_id)
  for (const l of links) {
    if (!linkSet.has(l.sku)) linkSet.set(l.sku, new Set());
    linkSet.get(l.sku).add(l.variant_id);
  }
  const linkCount = new Map([...linkSet.entries()].map(([k, s]) => [k, s.size]));
  const totalUniqueLinks = [...linkSet.values()].reduce((a, s) => a + s.size, 0);
  const zeroFit = [...bySku.keys()].filter(sku => !linkSet.has(sku));
  console.log(`相容連結：${totalUniqueLinks} 筆去重（原始計畫 ${links.length} 筆）覆蓋 ${linkCount.size} SKU｜零相容 SKU ${zeroFit.length}`);

  if (!APPLY) {
    console.log('\n===== 乾跑模式（未寫入 DB）=====');
    console.log('樣本 5 筆：');
    for (const p of partPlans.slice(0, 5)) {
      console.log(`  ${p.sku} | ${p.data.name} | TWD ${p.data.msrp_price} / 批發 ${p.data.wholesale_price} | 庫存 ${p.data.stock_qty} | ${p.data.image_url}`);
    }
    console.log(`零相容 SKU（前 15）: ${zeroFit.slice(0, 15).join(', ')}`);
    console.log(`未匹配組 ${unmatched.length}｜審核（ambiguous）${ambiguous.length}｜寬鬆行（僅廠牌+車型）${broad.length}`);
    const dedupPreview = await runDedup(prisma, false);
    console.log(`同車去重預覽：${dedupPreview.totalLinksBefore} → ${dedupPreview.totalLinksAfter} 連結，保留 ${dedupPreview.partsKept} SKU，下架 ${dedupPreview.zeroLinkParts.length} SKU`);
    console.log('\n執行 node funk_import.js --apply 上架');
    writeReports(partPlans, linkCount, totalUniqueLinks, links.length, zeroFit, unmatched, ambiguous, broad, rows, true, dedupPreview);
    await prisma.$disconnect();
    return;
  }

  // ---------- APPLY ----------
  console.log('\n===== --apply：寫入 DB =====');
  let inserted = 0, updated = 0;
  const skuToId = new Map();
  for (const p of partPlans) {
    const existing = await prisma.part.findUnique({ where: { sku: p.sku }, select: { id: true } });
    if (existing) {
      await prisma.part.update({ where: { sku: p.sku }, data: p.data });
      updated++; skuToId.set(p.sku, existing.id);
    } else {
      const created = await prisma.part.create({ data: { sku: p.sku, ...p.data }, select: { id: true } });
      inserted++; skuToId.set(p.sku, created.id);
    }
  }
  console.log(`零件主檔：新增 ${inserted}，更新 ${updated}`);

  // parts_on_categories（引擎 category_id 5）
  let catUpserted = 0;
  for (const pid of skuToId.values()) {
    await prisma.partsOnCategories.upsert({
      where: { part_id_category_id: { part_id: pid, category_id: CATEGORY_ID } },
      update: {},
      create: { part_id: pid, category_id: CATEGORY_ID },
    }).then(() => catUpserted++).catch(() => {});
  }
  console.log(`parts_on_categories：${catUpserted} 筆（category_id ${CATEGORY_ID}）`);

  // 清除舊 FUNK 相容資料（重跑時避免舊規則殘留），再插入新連結
  const partIds = [...skuToId.values()];
  const cleared = await prisma.partCompatibility.deleteMany({ where: { part_id: { in: partIds } } });
  console.log(`已清除舊 FUNK 相容資料：${cleared.count} 筆`);

  let createdLinks = 0;
  const recs = links.map(l => ({ part_id: skuToId.get(l.sku), vehicle_id: l.variant_id }))
    .filter(r => r.part_id !== undefined);
  for (let i = 0; i < recs.length; i += 500) {
    const res = await prisma.partCompatibility.createMany({ data: recs.slice(i, i + 500), skipDuplicates: true });
    createdLinks += res.count;
  }
  console.log(`相容關係：${recs.length} 筆計畫，本次新增 ${createdLinks} 筆`);

  // 同車多毯去重：每台車只保留名稱最符合車型的一個 SKU；去重後零相容 SKU 下架（is_active=false，價格保留可還原）
  const dedup = await runDedup(prisma, true);
  console.log(`同車去重：${dedup.totalLinksBefore} → ${dedup.totalLinksAfter} 連結（移除 ${dedup.removals} 條），保留上架 ${dedup.partsKept} SKU，下架 ${dedup.zeroLinkParts.length} SKU`);

  // 驗證：JOIN 查詢實際連結數
  const verify = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT c.part_id)::int AS parts_with_links, COUNT(*)::int AS total_links
    FROM part_vehicle_compatibility c
    JOIN parts p ON p.id = c.part_id
    WHERE p.brand = $1`, BRAND);
  console.log(`驗證：${verify[0].parts_with_links} 個零件有相容連結，共 ${verify[0].total_links} 筆`);

  writeReports(partPlans, linkCount, totalUniqueLinks, links.length, zeroFit, unmatched, ambiguous, broad, rows, false, dedup);
  console.log('寫出 FUNK_匯入報告.txt / FUNK_未匹配車型.csv / FUNK_審核清單.csv');
  await prisma.$disconnect();
}

function writeReports(partPlans, linkCount, totalUniqueLinks, rawLinkCount, zeroFit, unmatched, ambiguous, broad, rows, dryRun, dedup) {
  fs.mkdirSync(DATA, { recursive: true });
  const report = [];
  report.push('FUNK Motorsport 渦輪隔熱毯匯入報告 ' + new Date().toISOString() + (dryRun ? '（乾跑）' : ''));
  report.push('');
  report.push(`來源：parts_upload_FUNK.csv（${rows.length} 行，${partPlans.length} SKU）`);
  report.push(`官網：funkmotorsport.com（Store API，48 個商品照片下載至 media/parts/Brand/FUNK/）`);
  report.push('');
  report.push('定價：建議售價 = (£ × 44 + 2000 運費) × 1.2 關稅；批發價 = 建議售價 × 0.9');
  report.push(`分類：引擎 → 其他（subcategory_id ${SUBCAT_ID} / category_id ${CATEGORY_ID}）`);
  report.push(`品牌：${BRAND}｜庫存：CSV 庫存數量｜批發商庫存：0（drop-ship 慣例）`);
  report.push('');
  report.push(`相容連結：${totalUniqueLinks} 筆（去重後；原始計畫 ${rawLinkCount} 筆），覆蓋 ${linkCount.size}/${partPlans.length} SKU`);
  report.push(`零相容 SKU：${zeroFit.length}`);
  if (dedup) {
    report.push(`同車去重：每車 1 條，${dedup.totalLinksBefore} → ${dedup.totalLinksAfter} 連結（移除 ${dedup.removals} 條多餘連結）`);
    report.push(`去重後上架：${dedup.partsKept} SKU｜下架 ${dedup.zeroLinkParts.length} SKU（is_active=false，價格保留可還原）`);
    report.push(`勝者分數分布：${JSON.stringify(dedup.scoreHist)}`);
  }
  report.push(`未匹配車型組（供應商資料與 DB 矛盾，多為引擎碼衝突）：${unmatched.length}`);
  report.push(`審核清單（ambiguous ${ambiguous.length} + 寬鬆行 ${broad.length}）：需人工確認，未連結`);
  report.push('');
  report.push('=== per-SKU（去重後相容連結數 / ⚠零相容）===');
  const perSkuRows = new Map();
  for (const r of rows) perSkuRows.set(r['SKU'], r);
  const dedupLinks = dedup ? new Map(dedup.keptParts.map(pp => [pp.sku, pp.kept])) : null;
  const deactivated = dedup ? new Set(dedup.zeroLinkParts.map(pp => pp.sku)) : null;
  const nOf = sku => dedupLinks ? (dedupLinks.get(sku) || 0) : (linkCount.get(sku) || 0);
  for (const p of partPlans.sort((a, b) => nOf(b.sku) - nOf(a.sku))) {
    const r = perSkuRows.get(p.sku);
    const n = nOf(p.sku);
    const flag = n === 0 ? ' ⚠零相容' : '';
    const off = deactivated && deactivated.has(p.sku) ? '（已下架）' : '';
    report.push(`  ${p.sku}: ${n} 車型變體連結｜TWD ${p.data.msrp_price}｜${r['廠牌']} ${r['車型']}（供應商規格之一）${flag}${off}`);
  }
  fs.writeFileSync(path.join(DATA, 'FUNK_匯入報告.txt'), report.join('\n'), 'utf8');

  // 未匹配車型 CSV
  const uLines = ['sku,csv_spec,candidate_count,fail_gates,sample_db_candidates'];
  for (const u of unmatched) {
    const fails = Object.entries(u.fails || {}).map(([k, n]) => `${k}:${n}`).join(';');
    uLines.push([u.sku, `"${u.csv}"`, u.cands, `"${fails}"`, `"${(u.sampleDb || []).join(' ;; ')}"`].join(','));
  }
  fs.writeFileSync(path.join(DATA, 'FUNK_未匹配車型.csv'), '﻿' + uLines.join('\r\n'), 'utf8');

  // 審核清單：ambiguous + broad rows
  const aLines = ['sku,type,csv_spec,details'];
  for (const a of ambiguous) {
    aLines.push([a.sku, 'ambiguous（多組候選）', `"${a.csv}"`, `"${a.groups.map(g => g.join(' ;; ')).join(' | ')}"`].join(','));
  }
  for (const b of broad) {
    aLines.push([b.sku, '寬鬆行（無世代/引擎/年份）', `"${b.make} | ${b.model} | ${b.gen || ''} | ${b.eng || ''} | ${b.yr || ''}"`, `"${b.name}"`].join(','));
  }
  fs.writeFileSync(path.join(DATA, 'FUNK_審核清單.csv'), '﻿' + aLines.join('\r\n'), 'utf8');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); }).finally(() => prisma.$disconnect());
