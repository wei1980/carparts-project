/**
 * build_gen_alias.js — 從 BILSTEIN CSV 推導「世代別名」
 *
 * 問題：DB 的 Volkswagen generation 是 `Mk7` / `Mk7.5` / `Mk8 (CD1)`，
 *       BILSTEIN 給的是底盤碼 `5G1, BQ1, BE1, BE2`。兩邊字串毫無交集，
 *       導致 2018 Golf GTI（Mk7.5）連不到任何 BILSTEIN 商品。
 *
 * 做法：BILSTEIN 的 `Model_Series` 自帶「車系編號」——
 *       `Golf 7 (5G1, BQ1, BE1, BE2)` 的「7」就是世代 7。
 *       依 (品牌, 家族, 編號) 三鍵把 BILSTEIN 的底盤碼對到 DB 的 `Mk<編號>`。
 *       只用家族精確相符的列，避免 `Golf Plus` 的碼污染 `Golf`。
 *
 * 輸出：scripts/_gen_alias.json  { "Volkswagen|Mk7.5": ["5G1", ...], ... }
 * 用法：node scripts/build_gen_alias.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();
const CSV = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/Parts_BILSTEIN_V10_final.csv';
const OUT = path.join(__dirname, '_gen_alias.json');

const ROMAN = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10' };

// 「Golf 7 (5G1, BQ1)」→ { fam:'GOLF', num:'7', codes:['5G1','BQ1'] }
function parseSeries(s) {
  const raw = String(s || '');
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const head = (m ? m[1] : raw).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const codes = m
    ? m[2].split(/[,/;]+/).map(x => x.trim().toUpperCase()).filter(x => x.length >= 2 && x.length <= 12)
    : [];
  let num = '';
  for (let i = head.length - 1; i >= 0; i--) {
    const t = head[i];
    if (ROMAN[t]) { num = ROMAN[t]; break; }
    if (/^MK(\d+)$/i.test(t)) { num = t.replace(/^MK/i, ''); break; }
    if (/^\d{1,2}$/.test(t)) { num = t; break; }
    if (/^[A-Z]\d{1,4}[A-Z]?$/.test(t)) { num = t; break; }
  }
  return { fam: head[0] || '', num, codes };
}

const ALIAS = { VW: 'Volkswagen', MITSUBISHI: 'Mitsubishi', MINI: 'Mini', smart: 'Smart', 'Ford (USA)': 'Ford' };
const nm = (s) => {
  const t = String(s || '').trim();
  return ALIAS[t] || ALIAS[t.toLowerCase()] || t;
};
const famOf = (model) => String(model || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/)[0] || '';

(async () => {
  const rows = parse(fs.readFileSync(CSV, 'utf8'), { columns: true, skip_empty_lines: true, trim: true });
  const db = await p.$queryRawUnsafe('SELECT make, model, generation FROM vehicle_variants');

  // DB: make|family → { generation → count }
  const dbMap = new Map();
  for (const v of db) {
    const k = `${v.make}|${famOf(v.model)}`;
    if (!dbMap.has(k)) dbMap.set(k, new Map());
    const m = dbMap.get(k);
    const g = String(v.generation || '');
    m.set(g, (m.get(g) || 0) + 1);
  }

  // BILSTEIN: make|family|num → codes
  const sup = new Map();
  const seen = new Set();
  for (const r of rows) {
    const s = String(r.Model_Series || r.Model || '');
    const key = nm(r.Manufacturer) + '|' + s;
    if (seen.has(key)) continue;
    seen.add(key);
    const { fam, num, codes } = parseSeries(s);
    if (!fam || !num || !codes.length) continue;
    const k = `${nm(r.Manufacturer)}|${fam}|${num}`;
    if (!sup.has(k)) sup.set(k, new Set());
    for (const c of codes) sup.get(k).add(c);
  }

  // 推導
  const alias = new Map();
  let used = 0;
  for (const [k, codes] of sup) {
    const [mk, fam, num] = k.split('|');
    const dbm = dbMap.get(`${mk}|${fam}`);
    if (!dbm) continue;
    // DB 的 `Mk7` / `Mk7.5` / `Mk7 (5G)` 都算世代 7
    const targets = [...dbm.keys()].filter(g => new RegExp(`^mk\\s*${num}(\\D|$)`, 'i').test(g));
    if (!targets.length) continue;
    used++;
    for (const tg of targets) {
      const ak = `${mk}|${tg}`;
      if (!alias.has(ak)) alias.set(ak, new Set());
      for (const c of codes) alias.get(ak).add(c);
    }
  }

  const out = Object.fromEntries([...alias.entries()].map(([k, v]) => [k, [...v].sort()]));
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

  console.log(`BILSTEIN 車系列(帶編號+碼): ${sup.size} | 對上 DB: ${used}`);
  console.log(`alias 條目: ${Object.keys(out).length} → ${OUT}`);
  console.log('\n抽查:');
  ['Volkswagen|Mk7', 'Volkswagen|Mk7.5', 'Volkswagen|Mk8 (CD1)', 'Ford|Mk4 (C519)', 'Skoda|Mk3 (5E)'].forEach(k => {
    console.log(`  ${k.padEnd(22)} ← ${(out[k] || ['(無)']).join(', ')}`);
  });

  await p.$disconnect();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });