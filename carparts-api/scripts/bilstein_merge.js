// 合併：舊 CSV（4,180 SKU）+ V11 新抓的 → 一支給 import 用的 CSV
// 用 (sku, Type, From_to, series) 當唯一鍵去重，新資料覆蓋舊的
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const D = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN';
const OLD = path.join(D, 'Parts_BILSTEIN_V10_final.csv');
const NEW_FILES = ['Parts_V11_T8.csv', 'pA.csv', 'pB.csv'];
const OUT = path.join(D, 'Parts_BILSTEIN_V11_merged.csv');

const COLS = ['sku','name','brand','msrp_eur','description','subcategory','Model_Series',
  'Manufacturer','Model','Type','From_to','kW_HP','ccm','Engine_Code','KBA_Keynumber',
  'image_url','image_file','debug_note'];

const parseOld = (f) => {
  const rows = parse(fs.readFileSync(f, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
  return rows.map(r => {
    const o = {};
    COLS.forEach(c => { o[c] = r[c] !== undefined ? r[c] : ''; });
    return o;
  });
};

const oldRows = parseOld(OLD);
console.log(`舊 CSV: ${oldRows.length} 列`);

const key = (r) => [String(r.sku || '').trim(), String(r.Type || '').trim(),
  String(r.From_to || '').trim(), String(r.Model_Series || '').trim()].join('|');

const map = new Map();
for (const r of oldRows) map.set(key(r), { ...r, _src: 'old' });

let added = 0, replaced = 0;
for (const f of NEW_FILES) {
  const fp = path.join(D, f);
  if (!fs.existsSync(fp)) { console.log(`  跳過 ${f}（不存在）`); continue; }
  const rows = parse(fs.readFileSync(fp, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
  console.log(`  ${f}: ${rows.length} 列`);
  for (const r of rows) {
    const o = {};
    COLS.forEach(c => {
      let v = r[c];
      // 新檔的 image_file 是 'images/48-330862.JPG'，舊檔是 '46-341020.JPG'
      if (c === 'image_file' && v) v = path.basename(v);
      if (c === 'brand' && (!v || v === 'BILSTEIN')) v = 'BILSTEIN';
      o[c] = v !== undefined && v !== null ? v : '';
    });
    const k = key(o);
    if (map.has(k)) { if (map.get(k)._src !== 'new') { map.set(k, { ...o, _src: 'new' }); replaced++; } }
    else { map.set(k, { ...o, _src: 'new' }); added++; }
  }
}

const merged = [...map.values()].map(r => {
  const o = {};
  COLS.forEach(c => { o[c] = r[c] !== undefined ? r[c] : ''; });
  return o;
});

// 寫 CSV（手動，避免 csv-writer 型別問題）
const esc = (v) => {
  const s = String(v === undefined || v === null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const out = [COLS.join(','), ...merged.map(r => COLS.map(c => esc(r[c])).join(','))].join('\r\n');
fs.writeFileSync(OUT, '\uFEFF' + out, 'utf8');

const newSkus = new Set(merged.filter(r => r.sku === '48-330862').map(r => r.sku));
console.log(`\n合併完成: ${merged.length} 列 → ${OUT}`);
console.log(`  新增: ${added} | 替換: ${replaced}`);
console.log(`  48-330862 在內: ${newSkus.has('48-330862')}`);
const allSkus = new Set(merged.map(r => r.sku));
console.log(`  unique SKU: ${allSkus.size}`);
console.log(`\n=== 產品線前綴分布 ===`);
const pref = {};
for (const s of allSkus) { const k = s.slice(0, 2); pref[k] = (pref[k] || 0) + 1; }
Object.entries(pref).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}-  ${v}`));