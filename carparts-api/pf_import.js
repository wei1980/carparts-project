#!/usr/bin/env node
/**
 * Powerflex VW 零件匯入
 * 資料：media/Data/Powerflex_零件資料.csv（35,616 列、718 SKU）
 * 匹配：車型名 → DB vehicle_variants（make='VW'），fam 前綴 + gen 子字串 + 年份區間
 * 用法：node pf_import.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const ROOT = __dirname;
const CSV = path.join(ROOT, 'media', 'Data', 'Powerflex_零件資料.csv');
const REPORT = path.join(ROOT, 'media', 'Data', 'Powerflex_匯入報告.txt');
const UNMATCHED = path.join(ROOT, 'media', 'Data', 'Powerflex_未匹配車型.csv');

// ---------- CSV 解析（含引號欄位、內嵌換行、雙引號轉義） ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
      else if (c !== '\r') field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------- 車型映射（CSV 車型欄 → DB 匹配條件） ----------
// fam: 車型名前置詞；gen: generation 子字串；incl/excl: 車型名必須/不得含；universal: 全車通用
const MAP = {
  'Amarok': { fam: ['Amarok'] },
  'Arteon': { fam: ['Arteon'] },
  'Atlas': {},
  'Beetle & Cabrio 2WD': { fam: ['Beetle'], gen: ['9C'] },
  'Beetle A5 Multi-Link': { fam: ['Beetle'], gen: ['A5'] },
  'Beetle A5 Rear Beam': { fam: ['Beetle'], gen: ['A5'] },
  'Beetle RSi 4Motion': {},
  'Bora 2WD': {},
  'Bora 4Motion': {},
  'Bora A5 (1K)': {},
  'CC': { fam: ['CC'] },
  'Caddy MK4 Typ SB': { fam: ['Caddy'], gen: ['Mk5'] },
  'Caddy Mk1 Typ 14': {},
  'Caddy Mk2 Typ 9K': {},
  'Caddy Mk3 Typ 2K (2004 - 06/2010)': { fam: ['Caddy'], gen: ['Mk3'] },
  'Caddy Mk3.5 Typ 2K (06/2010 - 2020)': { fam: ['Caddy'], gen: ['Mk3 FL', 'Mk4'] },
  'Corrado 53L': {},
  'Corrado VR6': {},
  'Eos 1F': { fam: ['Eos'] },
  'Fox': {},
  'Gol': {},
  'Golf MK1 inc Cabriolet': { fam: ['Golf'], gen: ['Mk1'] },
  'Golf MK2 2WD': { fam: ['Golf'], gen: ['Mk2'] },
  'Golf MK2 4WD, Inc Rallye & Country': { fam: ['Golf'], gen: ['Mk2'] },
  'Golf MK3 2WD': { fam: ['Golf'], gen: ['Mk3'] },
  'Golf Mk3 4WD Syncro': { fam: ['Golf'], gen: ['Mk3'] },
  'Golf MK4 2WD Typ 1J': { fam: ['Golf'], gen: ['Mk4'] },
  'Golf MK4 Cabrio': { fam: ['Golf'], gen: ['Mk4'] },
  'Golf MK4 R32 / 4Motion': { fam: ['Golf'], gen: ['Mk4'] },
  'Golf MK5 1K': { fam: ['Golf'], gen: ['Mk5'], excl: ['Plus'] },
  'Golf Mk5 GTI & R32': { fam: ['Golf'], gen: ['Mk5'], excl: ['Plus'] },
  'Golf Plus 5M': { fam: ['Golf'], gen: ['Mk5'], incl: ['Plus'] },
  'Golf MK6 inc R 5K': { fam: ['Golf'], gen: ['Mk6'], excl: ['Plus'] },
  'Golf MK7 5G 2WD 122PS plus Multi-link': { fam: ['Golf'], gen: ['Mk7'], excl: ['Plus'] },
  'Golf MK7 5G 2WD up to 122PS Rear Beam': { fam: ['Golf'], gen: ['Mk7'], excl: ['Plus'] },
  'Golf MK7 5G 4WD inc R': { fam: ['Golf'], gen: ['Mk7'], excl: ['Plus'] },
  'Golf MK7 GTE': { fam: ['Golf'], gen: ['Mk7'], excl: ['Plus'] },
  'Golf MK8 2WD Multi-Link': { fam: ['Golf'], gen: ['Mk8'], excl: ['Plus'] },
  'Golf MK8 2WD Rear Beam': { fam: ['Golf'], gen: ['Mk8'], excl: ['Plus'] },
  'Golf R MK8 4WD': { fam: ['Golf'], gen: ['Mk8'], excl: ['Plus'] },
  'Iltis': {},
  'Jetta MK1 A1': { fam: ['Jetta'], gen: ['Mk1'] },
  'Jetta MK2 A2': { fam: ['Jetta'], gen: ['Mk2'] },
  'Jetta MK3 A3': { fam: ['Jetta'], gen: ['Mk3'] },
  'Jetta MK4 A4 2WD': { fam: ['Jetta'], gen: ['Mk4'] },
  'Jetta MK4 A4 4Motion': { fam: ['Jetta'], gen: ['Mk4'] },
  'Jetta MK5 A5 1K': { fam: ['Jetta'], gen: ['Mk5'] },
  'Jetta MK6 A6 Multi-Link': { fam: ['Jetta'], gen: ['Mk6'] },
  'Jetta MK6 A6 Rear Beam': { fam: ['Jetta'], gen: ['Mk6'] },
  'Jetta MK7 A7 Multi-Link': { fam: ['Jetta'], gen: ['Mk7'] },
  'Jetta MK7 A7 Rear Beam': { fam: ['Jetta'], gen: ['Mk7'] },
  'Lupo': {},
  'Phaeton': { fam: ['Phaeton'] },
  'Polo / Derby MK1/2': { fam: ['Polo'], gen: ['Mk1', 'Mk2'] },
  'Polo MK3 6N': { fam: ['Polo'], gen: ['Mk3'] },
  'Polo MK4 9N/9N3': { fam: ['Polo'], gen: ['9N'] },
  'Polo MK5 6R/6C': { fam: ['Polo'], gen: ['Mk5'] },
  'Polo MK6 AW Inc. GTI': { fam: ['Polo'], gen: ['Mk6'] },
  'Scirocco MK1/2': { fam: ['Scirocco'], gen: ['Mk1', 'Mk2'] },
  'Scirocco MK3': { fam: ['Scirocco'], gen: ['Mk3'] },
  'Sharan MK1': { fam: ['Sharan'], gen: ['Mk1'] },
  'Sharan MK2': { fam: ['Sharan'], gen: ['Mk2'] },
  'Passat B3/B4 2WD': { fam: ['Passat'], gen: ['B3', 'B4'] },
  'Passat B3/B4 Syncro 4WD': { fam: ['Passat'], gen: ['B3', 'B4'] },
  'Passat B5': { fam: ['Passat'], gen: ['B5'] },
  'Passat B6 & B7 Typ3C': { fam: ['Passat'], gen: ['B6', 'B7'] },
  'Passat B8': { fam: ['Passat'], gen: ['B8'] },
  'Passat CC 35': { fam: ['Passat CC'] },
  'T25/T3 Type 2 (Vanagon) All Models': { fam: ['Transporter'] },
  'T4 Transporter': { fam: ['Transporter'] },
  'T5 Transporter inc. 4Motion': { fam: ['Transporter'] },
  'T6 / 6.1 Transporter': { fam: ['Transporter', 'Sportsvan', 'Golf Sportsvan'] },
  'Taigo': {},
  'Tiguan 5N MK1': { fam: ['Tiguan'], gen: ['Mk1'] },
  'Tiguan AD/BW MK2': { fam: ['Tiguan'], gen: ['Mk2'] },
  'Touareg': { fam: ['Touareg'] },
  'Touareg 7L': { fam: ['Touareg'], gen: ['7L'] },
  'Touareg 7P': { fam: ['Touareg'], gen: ['7P'] },
  'Touran': { fam: ['Touran'] },
  'T-Cross': { fam: ['T-Cross'] },
  'T-Roc 4-Motion inc R': { fam: ['T-Roc'] },
  'T-Roc FWD Rear Beam': { fam: ['T-Roc'] },
  'Universal (Jack Pad Adaptor)': { universal: true },
  'Up! inc. GTI': {},
  'Vento A3': { fam: ['Jetta'], gen: ['Mk3'] },
  'Vento A5': { fam: ['Jetta'], gen: ['Mk5'] },
};
const UNIV_MODEL = 'Universal (Jack Pad Adaptor)';
const CAT_SUB = { '底盤': { sub: 16, cat: '底盤' }, '引擎': { sub: 18, cat: '引擎' } };

(async () => {
  // ---------- 讀 CSV ----------
  const lines = parseCSV(fs.readFileSync(CSV, 'utf8').replace(/^\uFEFF/, ''));
  const header = lines[0];
  const idx = {};
  header.forEach((h, i) => idx[h] = i);
  const recs = lines.slice(1).map(r => ({
    sku: r[idx['SKU']], name: r[idx['品名']], brand: r[idx['品牌']],
    cat: r[idx['主分類']], sub: r[idx['子分類']], msrp: parseInt(r[idx['建議售價']], 10),
    wholesale: parseInt(r[idx['車廠批發價']], 10), stock: parseInt(r[idx['庫存數量']], 10),
    desc: r[idx['商品說明']], img: (r[idx['圖片路徑']] || '').replace(/^\/?/, '/'),
    model: r[idx['車型']].replace(/&amp;/g, '&'), year: r[idx['年份']],
  }));
  console.log(`CSV 列：${recs.length}`);

  // 驗證所有車型都在 MAP
  const models = new Set(recs.map(r => r.model));
  const unmapped = [...models].filter(m => !MAP[m]);
  if (unmapped.length) { console.error('未映射車型：', unmapped); process.exit(1); }
  console.log(`車型：${models.size}`);

  // ---------- 載入 DB 變體 ----------
  const variants = await prisma.$queryRawUnsafe(
    `SELECT id, make, model, generation, year_start, year_end FROM vehicle_variants WHERE make = 'Volkswagen'`);
  console.log(`DB VW 變體：${variants.length}`);

  // ---------- 匹配 ----------
  const matchCache = new Map(); // model|year → ids
  function matchRow(model, yearStr) {
    const key = model + '|' + yearStr;
    if (matchCache.has(key)) return matchCache.get(key);
    const spec = MAP[model];
    let ids = [];
    if (spec && !spec.universal && spec.fam) {
      const y = parseInt(yearStr, 10);
      for (const v of variants) {
        if (!spec.fam.some(f => v.model.startsWith(f))) continue;
        if (spec.gen && !spec.gen.some(g => (v.generation || '').includes(g))) continue;
        if (spec.incl && !spec.incl.some(s => v.model.includes(s))) continue;
        if (spec.excl && spec.excl.some(s => v.model.includes(s))) continue;
        if (!isNaN(y) && (y < v.year_start || y > v.year_end)) continue;
        ids.push(v.id);
      }
    }
    matchCache.set(key, ids);
    return ids;
  }

  // ---------- 分組零件 ----------
  const parts = new Map(); // sku → {info, rows, models:Set, links:Set}
  for (const r of recs) {
    let p = parts.get(r.sku);
    if (!p) { p = { info: r, rows: [], models: new Set(), links: new Set() }; parts.set(r.sku, p); }
    p.rows.push(r);
    p.models.add(r.model);
  }
  let rowMatched = 0, rowTotal = 0;
  const unmatchedRows = []; // {sku, model, year, reason}
  for (const p of parts.values()) {
    for (const r of p.rows) {
      if (r.model === UNIV_MODEL) continue; // 通用列不產生連結
      rowTotal++;
      const ids = matchRow(r.model, r.year);
      if (ids.length === 0) {
        const spec = MAP[r.model];
        const reason = !spec || !spec.fam ? 'DB 無此車型' : '年份/世代無交集';
        unmatchedRows.push({ sku: p.info.sku, model: r.model, year: r.year, reason });
      } else {
        rowMatched++;
        for (const id of ids) p.links.add(id);
      }
    }
  }
  const rowRate = (100 * rowMatched / rowTotal).toFixed(1);
  console.log(`\n車型列匹配：${rowMatched}/${rowTotal}（${rowRate}%）｜零匹配列：${unmatchedRows.length}`);

  // 零件分類
  let nUniv = 0, nActive = 0, nInactive = 0, totalLinks = 0;
  const inactiveSkus = [];
  const univSkus = [];
  for (const p of parts.values()) {
    const isUniv = [...p.models].every(m => m === UNIV_MODEL);
    p.isUniv = isUniv;
    p.isActive = isUniv || p.links.size > 0;
    if (isUniv) { nUniv++; univSkus.push(p.info.sku); }
    else if (p.isActive) nActive++;
    else { nInactive++; inactiveSkus.push(p.info.sku); }
    totalLinks += p.links.size;
    const cs = CAT_SUB[p.info.cat];
    if (!cs) { console.error('未知分類：', p.info.sku, p.info.cat); process.exit(1); }
    p.subId = cs.sub; p.category = cs.cat;
  }
  console.log(`零件：${parts.size}｜上架（有連結）：${nActive}｜通用：${nUniv}｜零匹配下架：${nInactive}｜總連結：${totalLinks}`);

  // 零匹配車型分組
  const zeroByModel = {};
  for (const u of unmatchedRows) zeroByModel[u.model] = (zeroByModel[u.model] || 0) + 1;
  console.log('\n零匹配車型（列數）：');
  for (const [m, n] of Object.entries(zeroByModel).sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${m}`);

  // 連結數 >100 檢查
  console.log('\n連結數 >100 的 SKU：');
  for (const p of parts.values()) {
    if (p.links.size > 100) console.log(`  ${p.info.sku} → ${p.links.size}｜${p.info.name}`);
  }

  if (!APPLY) {
    console.log('\n=== 乾跑完成（加 --apply 匯入）===');
    // 未匹配 CSV 也先寫出供檢查
    fs.writeFileSync(UNMATCHED, '\uFEFF' + ['SKU', '車型', '年份', '原因'].join(',') + '\n' +
      unmatchedRows.map(u => [u.sku, u.model, u.year, u.reason].map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'), 'utf8');
    await prisma.$disconnect();
    return;
  }

  // ================= 執行匯入 =================
  const partIds = {};
  for (const p of parts.values()) {
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO parts (sku, name, brand, subcategory_id, category, image_url, description, msrp_price, wholesale_price, stock_qty, distributor_stock_qty, preorder_lead_time_days, is_active, is_universal)
       VALUES ($1, $2, 'Powerflex', $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, $11)
       ON CONFLICT (sku) DO UPDATE SET name = $2, subcategory_id = $3, category = $4, image_url = $5, description = $6, msrp_price = $7, wholesale_price = $8, is_active = $10, is_universal = $11
       RETURNING id`,
      p.info.sku, p.info.name, p.subId, p.category, p.info.img, p.info.desc || '',
      p.info.msrp, p.info.wholesale, p.info.stock || 10, p.isActive, p.isUniv
    );
    partIds[p.info.sku] = r[0].id;
  }
  console.log('\n零件匯入完成');

  const linkRows = [];
  for (const p of parts.values()) for (const vid of p.links) linkRows.push([partIds[p.info.sku], vid]);
  console.log(`待寫入相容連結：${linkRows.length}`);
  const BATCH = 500;
  for (let i = 0; i < linkRows.length; i += BATCH) {
    const chunk = linkRows.slice(i, i + BATCH);
    const ph = chunk.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`).join(', ');
    await prisma.$queryRawUnsafe(`INSERT INTO part_vehicle_compatibility (part_id, vehicle_id) VALUES ${ph} ON CONFLICT DO NOTHING`, ...chunk.flat());
  }
  console.log(`相容連結寫入：${linkRows.length}`);

  // 未匹配 CSV
  fs.writeFileSync(UNMATCHED, '\uFEFF' + ['SKU', '車型', '年份', '原因'].join(',') + '\n' +
    unmatchedRows.map(u => [u.sku, u.model, u.year, u.reason].map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'), 'utf8');

  // 報告
  const L = [];
  L.push('Powerflex（VW）匯入報告');
  L.push('========================');
  L.push(`CSV 列：${recs.length}｜SKU：${parts.size}`);
  L.push(`車型列匹配：${rowMatched}/${rowTotal}（${rowRate}%）`);
  L.push(`上架（有連結）：${nActive}｜全車通用：${nUniv}｜零匹配下架：${nInactive}`);
  L.push(`相容連結總數：${totalLinks}`);
  L.push('');
  L.push('全車通用零件（is_universal，無車型連結）：');
  for (const s of univSkus) { const p = parts.get(s); L.push(`  ${s}｜${p.info.name}｜$${p.info.msrp}`); }
  L.push('');
  L.push('零匹配下架零件（' + nInactive + '）：');
  for (const s of inactiveSkus) { const p = parts.get(s); L.push(`  ${s}｜${p.info.name}｜${[...p.models].join(', ')}`); }
  L.push('');
  L.push('零匹配車型分組：');
  for (const [m, n] of Object.entries(zeroByModel).sort((a, b) => b[1] - a[1])) L.push(`  ${n}  ${m}`);
  fs.writeFileSync(REPORT, L.join('\n'), 'utf8');
  console.log(`\n報告：${REPORT}`);
  await prisma.$disconnect();
  console.log('=== 完成 ===');
})();
