// KW 匹配器 v7 — 以「完整版 KW.xlsx（4 工作表）」為權威適配來源
//
// 相較 v6 的差異（匹配邏輯與輔助函式完全沿用 v6，避免行為漂移）：
//  1. 來源檔改為專案內完整版 media/Data/原始檔案/KW.xlsx（v6 寫死的桌面路徑已失效）
//  2. 支援全部工作表（避震器 / DDC 電子避震器 / 高低可調短彈簧），周邊配件表非車型適配故略過
//  3. 產品欄位索引改為動態偵測（各表欄位偏移不同，v6 只硬編碼避震器那一套）
//  4. DATABASE_URL 可由環境變數覆寫（暫存庫驗證用）+ 安全閘防止誤寫正式庫
//  5. 產出 dry-run 結果，不寫入資料庫
//
// 規則：每 (車型變體, 產品線) 只對應一個 SKU
// 衝突解決順序：1) trim 專用 2) 已驗證約束數 3) 無 DDC 優先 4) 重量梯最輕階 5) SKU 升冪

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// ========== 安全閘：拒絕對正式庫執行 ==========
const PROD_DB = 'carparts';
const EFFECTIVE_URL = process.env.DATABASE_URL || require('dotenv').config().parsed.DATABASE_URL;
const dbNameOf = url => { const m = String(url).match(/\/([^/?]+)(\?|$)/); return m ? m[1] : null; };
const TARGET_DB = dbNameOf(EFFECTIVE_URL);
if (!TARGET_DB) { console.error('FATAL: 無法從 DATABASE_URL 解析資料庫名稱'); process.exit(2); }
if (TARGET_DB === PROD_DB && process.env.ALLOW_PROD_DB !== '1') {
  console.error(`FATAL: 拒絕對正式庫 ${PROD_DB} 執行匹配（設 ALLOW_PROD_DB=1 才可覆寫）`);
  process.exit(3);
}
console.log(`[安全閘] 目標資料庫：${TARGET_DB}`);
const prisma = new PrismaClient({ datasources: { db: { url: EFFECTIVE_URL } } });

// ========== 來源檔（優先完整版；找不到才回退舊路徑）============
const KW_XLSX_CANDIDATES = [
  path.join(__dirname, 'media/Data/原始檔案/KW.xlsx'),
  'C:/carparts/carparts-api/media/Data/原始檔案/KW.xlsx',
  'C:/Users/User/Desktop/商品資料庫/已經上架/KW.xlsx',
  'C:/Users/User/Desktop/商品資料庫/KW.xlsx',
];
const KW_XLSX = KW_XLSX_CANDIDATES.find(p => fs.existsSync(p));
if (!KW_XLSX) { console.error('FATAL: 找不到 KW.xlsx'); process.exit(4); }
console.log(`[來源] ${KW_XLSX}`);

// KW 匹配器 v6 — 以 KW.xlsx 為權威適配來源
// 規則：每 (車型變體, 產品線) 只對應一個 SKU
// 衝突解決順序：1) trim 專用（perf 精配） 2) 已驗證約束數 3) 無 DDC 優先 4) 重量梯最輕階 5) SKU 升冪

// ========== 工具 ==========
const deAccent = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[´`']/g, '');
const norm = s => deAccent(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const normMake = s => { const m = norm(s); return m === 'MERCEDESBENZ' ? 'Mercedes-Benz' : m === 'VOLKSWAGEN' ? 'Volkswagen' : m; };
const ROMAN = { I: 'Mk1', II: 'Mk2', III: 'Mk3', IV: 'Mk4', V: 'Mk5', VI: 'Mk6', VII: 'Mk7', VIII: 'Mk8', IX: 'Mk9', X: 'Mk10' };
const ENGINE_TOK = /^(\d+(\.\d+)?(TSI|TFSI|TDI|FSI|DI|i|e|GDI|HDi|CDi|d|T|JTD|Multijet|dCi|HDi)?|TDI|TFSI|TSI|FSI|GDI|HDi|CDi|JTD|Multijet|dCi)$/i;
function familyTokens(name) {
  const out = [];
  for (const t of deAccent(name).split(/[\s,;+.-]+/).filter(Boolean)) {
    const U = t.toUpperCase();
    if (ENGINE_TOK.test(t)) break; // 引擎/功率代碼起：後面都是規格
    if (U.length <= 1 && !/[A-Z]/.test(U)) continue;
    out.push(U);
  }
  return out;
}
const PERF_RE = /^(GTI|RS|RSG|RS\d*|R32|R8|S\d+|S$|M\d+|M$|TYPE-S|TYP S|QUADROFOGLIO|QV|GTA|SIR|TYPE R|TYP R|R )$/;
// 車型名別名（xlsx 命名 → DB 命名）
const ALIAS = { 'GT86': '86', 'MR 2': 'MR2', 'GT-R': 'GT-R' };
// 車型名清洗：去括號、年份標記、G-model、plus
const cleanModel = s => s.replace(/\([^)]*\)/g, '')
  .replace(/\bMod\.?\s*\d{4}\b/gi, '')
  .replace(/\s*G-?model\b/gi, '')
  .replace(/\s+plus\b/gi, '')
  .trim();
// 車型家族字首（用於單一世代判斷）：首個字母串（數字開頭則數字+字母）
const famKey = m => { const t = norm(m); const mm = t.match(/^[A-Z]+/) || t.match(/^\d+[A-Z]*/); return mm ? mm[0] : t; };
// DB 變體 generation 的世代根集合
function genRootsOf(genU) {
  const roots = new Set();
  let m;
  if ((m = genU.match(/MK\d+/))) roots.add(m[0]);
  if ((m = genU.match(/\d+(?:TH|ST|ND|RD)\s*GEN/))) roots.add(m[0].replace(/\s/g, ''));
  for (const cm of genU.matchAll(/\b([A-Z]{1,3}\d{1,3}[A-Z]?)\b/g)) roots.add(cm[1]);
  return roots;
}
// 各車型家族是否只有單一世代（計算後由 setFamSingleGen 注入）
let FAM_SINGLE_GEN = null;
function setFamSingleGen(m) { FAM_SINGLE_GEN = m; }
function perfTokens(toks) {
  return toks.flatMap(t => /^\dM$/.test(t) ? ['M'] : PERF_RE.test(t) ? [t.replace(/[.;]$/, '')] : []);
}

// ========== KW.xlsx 解析 ==========
function parseConfig(text) {
  const c = { doors: [], drive: null, convertible: null, strutMm: null, susp: [], cyl: null, diesel: false, except: [], all: false, unionConvPerf: false };
  if (!text) return c;
  for (let p of text.split(/[;,]/).map(x => x.trim()).filter(Boolean)) {
    const P = p.toUpperCase();
    if (/^四門|^SEDAN$|^LIMOUISINE|^LIM\.|^SALOON/.test(P)) c.doors.push('4');
    else if (/^五門|^STATION WAGON|^SPORTWAGON|^AVANT|^TOURING|^COMBI/.test(P)) c.doors.push('5');
    else if (/^雙門|^COUPE|^COUPÉ/.test(P)) c.doors.push('2');
    else if (P === '2WD' || P === 'FRONTANTRIEB' || P === 'FRONT' || P === 'FWD') c.drive = c.drive === '4WD' ? null : '2WD';
    else if (P === '4WD' || P === 'ALLRAD' || P === '4MOTION' || P === 'QUATTRO' || P === 'AWD') c.drive = c.drive === '2WD' ? null : '4WD';
    else if (/^含敞篷車款/.test(P)) { c.convertible = true; c.unionConvPerf = true; const m = P.match(/含\s*(.+)/); if (m) c._unionPerf = m[1].trim(); }
    else if (/^含敞篷|^INCL\. CONVERTIBLE|^INKL\. CABRIO/.test(P)) c.convertible = null; // 含＝不限制
    else if (/CONVERTIBLE|CABRIO|敞篷/.test(P)) c.convertible = true;
    else if (/SUSP STRUT|Ø\s*\d+/.test(P)) { const m = P.match(/Ø\s*(\d+)/); if (m) c.strutMm = +m[1]; }
    else if (/IRS/.test(P)) c.susp.push('IRS');
    else if (/拖曳臂|TRAILING|BEAM/.test(P)) c.susp.push('BEAM');
    else if (/FA CLAMP/.test(P)) c.susp.push('FA_CLAMP');
    else if (/FA BRACKET/.test(P)) c.susp.push('FA_BRACKET');
    else if (/^4CYL|^4 ?缸/.test(P)) c.cyl = '4';
    else if (/^6CYL|^6ZYL|^6 ?缸/.test(P)) c.cyl = '6';
    else if (/DIESEL/.test(P)) c.diesel = true;
    else if (/^(無|有)\s*(DDC 電子懸吊|電子懸吊|Dynamic Suspension)/.test(P)) c._ddc = P.startsWith('無') ? 'none' : 'ddc';
    else if (/^(除了|EXCEPT)\s*/.test(P)) c.except.push(P.replace(/^(除了|EXCEPT)\s*/i, '').trim());
    else if (/全車系|ALLE VARIANTEN|ALL TYPES/.test(P)) c.all = true;
    else if (/^(GTI|RS\d*|R32|S\d+|M\d+|TYPE-S|TYP S|QUADROFOGLIO|QV|GTA|SIR|TYPE R|TYP R|R)$/.test(P)) c._perf = (c._perf || []).concat(P.replace(/[.;]$/, ''));
  }
  return c;
}
function parseYear(text) {
  const t = String(text || '').trim();
  if (!t) return [null, null];
  const yy = y => (y >= 50 ? 1900 + y : 2000 + y);
  let m = t.match(/^(\d{1,2})\/(\d{2})-(\d{1,2})\/(\d{2})$/);
  if (m) return [yy(+m[2]), yy(+m[4])];
  m = t.match(/^(\d{1,2})\/(\d{2})-$/);
  if (m) return [yy(+m[2]), null];
  m = t.match(/^(\d{4})-(\d{4})$/);
  if (m) return [+m[1], +m[2]];
  m = t.match(/^(\d{1,2})\/(\d{2})$/);
  if (m) return [yy(+m[2]), null];
  return [null, null];
}
function parseWeight(t) {
  t = String(t || '').trim();
  if (!t || t === '-') return null;
  let m = t.match(/^(-?\d+)-(\d+)$/);
  if (m) return [+m[1], +m[2]];
  m = t.match(/^-(\d+)$/);
  if (m) return [null, +m[1]];
  return null;
}

// ========== 工作表幾何偵測 ==========
// 每個工作表：找出「產品料號」欄位索引、產品線名稱、資料起始列
function detectSheet(rows) {
  const S = r => String(r ?? '').trim();
  let headerRow = -1, prodRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => S(c).includes('廠牌'))) { headerRow = i; break; }
  }
  for (let i = 0; i < rows.length; i++) {
    const idx = rows[i].map((c, j) => S(c) === '產品料號' ? j : -1).filter(j => j >= 0);
    if (idx.length) { prodRow = i; var prodCols = idx; break; }
  }
  if (prodRow < 0 || !prodCols) return null;
  // 產品線名稱：在 headerRow 那列（或 prodRow 上方最近的含 KW 產品線名稱的列）
  let nameRow = headerRow >= 0 ? headerRow : prodRow - 2;
  let names = prodCols.map(col => S(rows[nameRow]?.[col]) || '');
  // 名稱列可能不在同一列 → 往上找
  if (names.every(n => !n || n === '-' || n === '產品料號')) {
    for (let i = prodRow - 1; i >= 0; i--) {
      const cand = prodCols.map(col => S(rows[i]?.[col]) || '');
      if (cand.some(n => /KW\s/.test(n))) { names = cand; nameRow = i; break; }
    }
  }
  // 資料起始列：prodRow 之後第一個非空列
  let dataStart = prodRow + 1;
  while (dataStart < rows.length && !rows[dataStart].some(c => S(c) !== '')) dataStart++;
  return { prodCols, names, dataStart, headerRow, prodRow };
}

// 產品線 key：從名稱推導（避震器 → SC/V1..V4/CS；DDC → DDC_PnP/DDC_ECU；短彈簧 → SPRING）
function lineKeyFor(name, fallbackIdx) {
  const n = String(name || '').toUpperCase();
  if (/STREET\s*COMFORT|街道舒適/.test(n)) return 'SC';
  if (/VARIANT\s*1/.test(n)) return 'V1';
  if (/VARIANT\s*2/.test(n)) return 'V2';
  if (/VARIANT\s*3/.test(n)) return 'V3';
  if (/VARIANT\s*4/.test(n)) return 'V4';
  if (/CLUBSPORT/.test(n)) return 'CS';
  if (/DDC\s*PLUG/.test(n)) return 'DDC_PNP';
  if (/DDC\s*ECU|電子避震器/.test(n)) return 'DDC_ECU';
  if (/短彈簧|GEWINDEFEDER/.test(n)) return 'SPRING';
  return 'L' + fallbackIdx;
}

// ========== KW.xlsx 解析（多工作表）============
function parseKWxlsx() {
  const wb = XLSX.readFile(KW_XLSX);
  const S = r => String(r ?? '').trim();
  const MAKE_RE = /^[A-Z][A-Z .&'-]+$/;
  const records = [];
  const perSheet = [];

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    const geo = detectSheet(rows);
    if (!geo) { perSheet.push({ sheet: sheetName, skipped: '無產品料號欄位' }); continue; }
    // 周邊配件是德文配件表，非車型適配 → 略過
    if (/周邊|ACCESSOR|ZUBEH|STABIUMR|ANTI\s*SWAY/i.test(sheetName)) {
      perSheet.push({ sheet: sheetName, skipped: '配件表（非車型適配）' });
      continue;
    }
    // 欄位 → 產品線 key
    const lineKeys = geo.prodCols.map((col, i) => ({ col, key: lineKeyFor(geo.names[i], i) }));
    // WAY（2-way / 3-way 可調）是「可調特性」不是產品線：保留在 prod 供參考，
    // 但不得作為連結線（否則會產生 "2- way" 這種假 SKU）
    // 欄位位置：最後一個產品欄位之後（v6 硬編碼第 23 欄）
    const lastProdCol = Math.max(...geo.prodCols);
    let wayCol = -1;
    for (let c = lastProdCol + 1; c <= lastProdCol + 4; c++) {
      const sample = rows.slice(geo.dataStart, geo.dataStart + 60).map(r => S(r[c])).filter(Boolean);
      if (sample.length && sample.filter(v => /^\d\s*-?\s*way$/i.test(v)).length >= Math.max(1, sample.length * 0.2)) {
        wayCol = c; break;
      }
    }
    const wayInfo = wayCol >= 0 ? { col: wayCol } : null;
    // DDC 表的前軸/後軸欄位
    let make = '', ddcFlag = null, cur = null, lastFamily = null;
    let sheetRecords = 0;
    for (let i = geo.dataStart; i < rows.length; i++) {
      const r = rows[i];
      const c0 = S(r[0]), c1 = S(r[1]), c2 = S(r[2]), c3 = S(r[3]);
      const prod = {};
      for (const { col, key } of lineKeys) {
        const v = S(r[col]);
        prod[key] = v && v !== '-' ? v : null;
      }
      // WAY 特性（不作為產品線）
      if (wayInfo) {
        const wv = S(r[wayInfo.col]);
        prod.WAY = wv && wv !== '-' ? wv : null;
      }
      const hasProd = Object.values(prod).some(v => v);
      if (c0 && !c1 && !c2 && !c3 && !hasProd && MAKE_RE.test(c0)) { make = c0; ddcFlag = null; cur = null; lastFamily = null; continue; }
      const dm = c0.match(/^(無|有)\s*(DDC 電子懸吊|電子懸吊|Dynamic Suspension)/);
      if (dm) {
        ddcFlag = dm[1] === '無' ? 'none' : 'ddc';
        if (cur) {
          cur.ddc = ddcFlag;
          if (hasProd || c3) cur.rows.push({ yFrom: cur.yFrom, yTo: cur.yTo, wF: cur.wF, wR: cur.wR, prod, config: parseConfig(c1), note: null });
        }
        continue;
      }
      const isNote = c0.startsWith('*');
      // 「無/有 X」條件行：整列 c0 是條件描述，車型在 c1
      // （如 r1770 c0="無 PASM" c1="Carrera, Carrera S; Cabrio / convertible"）
      const condRow = c0.match(/^(無|有)\s*(.+)$/);
      if (condRow && !/DDC\s*電子懸吊|電子懸吊|Dynamic\s*Suspension/i.test(condRow[2])) {
        // 條件是 PASM / PDCC / 電子懸吊 之類的配備限定
        const condVal = condRow[1] === '無' ? 'none' : 'yes';
        const condKey = norm(condRow[2]);
        if (cur) {
          cur.ddc = condKey.includes('DDC') || condKey.includes('電子懸吊') ? condVal : cur.ddc;
          cur.cond = cur.cond || {};
          cur.cond[condKey] = condVal;
          // 車型在 c1 → 以子列處理（沿用目前車型的年份/重量）
          const cfgC = parseConfig(c1);
          if (hasProd || c3) cur.rows.push({ yFrom: cur.yFrom, yTo: cur.yTo, wF: cur.wF, wR: cur.wR, prod, config: cfgC, note: null, cond: cur.cond });
        }
        continue;
      }
      if (c0.startsWith('(') && cur) {
        for (const ch of c0.replace(/[()]/g, '').split(/[,/]/).map(x => x.trim()).filter(Boolean)) cur.chassis.push(ch);
        if (hasProd || c3) cur.rows.push({ yFrom: cur.yFrom, yTo: cur.yTo, wF: cur.wF, wR: cur.wR, prod, config: parseConfig(c1), note: null });
        continue;
      }
      if (c0 && !isNote) {
        // 車型名可能附加條件描述（如 "911; (991)  無 PASM"、"Boxster; (981) 無 PASM"）
        // → 剝離條件詞，條件另存
        let c0Clean = c0;
        let inlineCond = null;
        const ic = c0.match(/^(.*?)\s*[（(]?\s*(無|有)\s+(PASM|PDCC|電子懸吊|DDC)\s*[）)]?\s*$/i);
        if (ic) { c0Clean = ic[1].trim(); inlineCond = { key: norm(ic[3]), val: ic[2] === '無' ? 'none' : 'yes' }; }
        const semi = c0Clean.split(';');
        const splitModels = s => { const out = []; let d = 0, cur2 = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur2); cur2 = ''; } else cur2 += ch; } out.push(cur2); return out.map(x => x.trim()).filter(Boolean); };
        let models = splitModels(semi[0]);
        const chassis = [];
        const pm = (semi[1] || '').match(/\(([^)]*)\)/);
        if (pm) for (const ch of pm[1].split(/[,/]/).map(x => x.trim()).filter(Boolean)) if (!ch.includes('*')) chassis.push(ch);
        // 底盤碼也可能寫在「車型名」本身的括號內，而非分號後
        // （如 "C-class (W204, C204, S204) 2WD"）。舊版只取分號後的括號，
        // 導致這類記錄的 chassis 為空 → 世代檢查被跳過 → C 級避震器
        // 會連到 CLA/CLS/C216 等無關車型（實測 233 個變體）。
        for (const m0 of models) {
          const mm = m0.match(/\(([^)]*)\)/);
          if (!mm) continue;
          for (const ch of mm[1].split(/[,/]/).map(x => x.trim()).filter(Boolean)) {
            // 只接受像底盤碼的短代碼（W204 / 8P / 991 / E46），排除描述詞
            if (ch.includes('*')) continue;
            if (!/^[A-Za-z0-9][A-Za-z0-9 .-]{0,7}$/.test(ch)) continue;
            if (/^(Cabrio|Coupe|coupé|convertible|Sedan|Avant|Sportwagon|incl\.|Lim\.|G-model|4WD|2WD)$/i.test(ch)) continue;
            if (!chassis.includes(ch)) chassis.push(ch);
          }
        }
        // 純數字車型名（如 Lexus 「250 300 350」）→ 繼承上一個家族字首
        // ⚠️ 家族字首不可跨廠牌延續：PONTIAC 的「Solstice」曾被錯誤套用到 PORSCHE 的
        //    「911 G-model」上，產生不存在的車型名「Solstice 911 G-model」。
        //    因此家族字首必須在廠牌切換時重置。
        if (models.every(m => /^\d/.test(m)) && lastFamily) {
          models = models.map(m => lastFamily + ' ' + m);
        } else if (!models.every(m => /^\d/.test(m))) {
          lastFamily = models[0].split(' ')[0];
        }
        const cfg = parseConfig(c1);
        const [yf, yt] = parseYear(c2);
        cur = { make, models, chassis, ddc: ddcFlag, config: cfg, yFrom: yf, yTo: yt, wF: parseWeight(c3), wR: parseWeight(S(r[4])), prod, rows: [] };
        if (inlineCond) { cur.cond = cur.cond || {}; cur.cond[inlineCond.key] = inlineCond.val; }
        records.push(cur);
        sheetRecords++;
        continue;
      }
      if (cur && (hasProd || c3)) {
        const cfg = c1 ? parseConfig(c1) : cur.config;
        const [yf, yt] = parseYear(c2);
        cur.rows.push({ yFrom: yf ?? cur.yFrom, yTo: yt ?? cur.yTo, wF: parseWeight(c3) ?? cur.wF, wR: parseWeight(S(r[4])) ?? cur.wR, prod, config: cfg, note: isNote ? c0 : null });
      }
    }
    perSheet.push({ sheet: sheetName, records: sheetRecords, lines: lineKeys.map(l => l.key) });
  }
  console.log('[解析] 各工作表：');
  for (const s of perSheet) console.log('   ', JSON.stringify(s));

  // 攤平 + 記錄 perf
  const flat = [];
  for (const rec of records) {
    const mk = (row, prod, ddc) => {
      const ddcEff = (row.config && row.config._ddc) || ddc;
      let perf = perfTokens(rec.models.flatMap(m => familyTokens(m)));
      if (row.config._perf) perf = perf.concat(row.config._perf);
      perf = [...new Set(perf)];
      if (row.config._unionPerf) perf = perf.concat(familyTokens(row.config._unionPerf));
      let drive = row.config.drive;
      if (!drive && rec.models.some(m => /QUATTRO|4MOTION/i.test(m))) drive = '4WD';
      flat.push({
        make: rec.make, models: rec.models, chassis: rec.chassis, config: row.config,
        yFrom: row.yFrom, yTo: row.yTo, wF: row.wF, wR: row.wR, prod, ddc: ddcEff, perf, drive,
        note: row.note || null,
      });
    };
    mk({ config: rec.config, yFrom: rec.yFrom, yTo: rec.yTo, wF: rec.wF, wR: rec.wR, note: null }, rec.prod, rec.ddc);
    for (const sr of rec.rows) mk(sr, sr.prod, rec.ddc);
  }
  return flat;
}

// ========== CSV 產品資訊 ==========
function parseCSV(text) {
  const rows = []; let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (inQ && text[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { row.push(cur); cur = ''; }
    else if ((ch === '\n' || ch === '\r') && !inQ) { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ========== 車型比對（沿用 v6 的 matchVariant 邏輯）============
function setFamSingleGen(map) { globalThis.__famSingleGen = map; }
function vBodyClass(v) {
  const m = norm(v.model);
  if (/CABRIO|CONVERTIBLE|ROADSTER|SPYDER/.test(m)) return 'c';
  if (/SEDAN|LIMOUISINE/.test(m)) return '4';
  if (/SPORTBACK|HATCHBACK|AVANT|WAGON|TOURING|COMBI|VARIANT/.test(m)) return '5';
  if (/COUPE/.test(m)) return '2';
  return null;
}
function vDrive(v) {
  // 優先用 vehicle_variants.specs 的 Drive 欄位（100% 覆蓋、準確度遠高於車名猜測）
  // 舊版只從 model 名判斷 4MOTION/QUATTRO/xDrive，會把 Tesla Model 3 Performance、
  // Macan Turbo Electric 等「車名無 4WD 字樣但實際四驅」的車型誤判為 2WD
  // （3,000 筆抽樣中誤判 515 筆，17%）
  const sp = v.specs;
  const d = sp && (sp.Drive || sp['驅動'] || sp.drive);
  if (d) {
    const s = String(d);
    if (/四驅|4WD|AWD|4MATIC|quattro/i.test(s)) return '4WD';
    if (/後驅|2WD|RWD/i.test(s)) return '2WD';
    if (/前驅|FWD/i.test(s)) return '2WD';
  }
  const m = norm(v.model);
  if (m.includes('4MOTION') || m.includes('QUATTRO') || m.includes('XDRIVE') || /\bAWD\b/.test(m) || /\s4X4\b/.test(m)) return '4WD';
  return '2WD';
}
function vConvertible(v) { return /CABRIO|CABRIOLET|ROADSTER|SPYDER|CONVERTIBLE/.test(norm(v.model)); }
function vCyl6(v) {
  const m = norm(v.model);
  if (/V6|V8|V10|V12|W12/.test(m)) return true;
  const dm = v.model.match(/(\d+\.\d+)/);
  return !!(dm && +dm[1] >= 2.5);
}
function vDiesel(v) { return /TDI|CDI|JTD|D-?4D|DITD|DCI|HDi|BLUETEC/i.test(v.model + ' ' + (v.engine_code || '')); }

function matchVariant(v, rec) {
  if (normMake(v.make) !== normMake(rec.make)) return false;
  const fam = familyTokens(v.model);
  const vp = perfTokens(fam);
  const vm = norm(v.model);
  const genU = String(v.generation || '').toUpperCase();
  const mk = normMake(rec.make);
  // 車型名 token（去除羅馬數字）必須在變體 family 中
  for (let mname0 of rec.models) {
    // 別名
    if (ALIAS[mname0]) mname0 = ALIAS[mname0];
    const mname = cleanModel(mname0);
    // BMW 系列規則：1er / 1-series / 3 Series → DB 車型代碼以該數字開頭（118i、M3、M340i）
    const sm = mname.match(/^\s*(\d)\s*(?:er\b|series\b)/i);
    if (sm) {
      const n = sm[1];
      if (!new RegExp(`^${n}\\d{2}|^M${n}|^${n}M`).test(vm)) return false;
      continue;
    }
    // BMW 「Coupé 2er / 2-series」：系列號在名稱中段（數字前綴規則前先處理）
    const ser = mname.match(/\b(\d)\s*er\b/i) || mname.match(/\b(\d)\s*-?\s*series\b/i);
    if (ser && mk === 'BMW') {
      const n = ser[1];
      if (!new RegExp(`^${n}\\d{2}|^M${n}|^${n}M`).test(vm)) return false;
      continue;
    }
    // MINI 底盤碼規則：R50/F56/R60… → generation 含該碼（DB 車型名不含 Mini）
    if (mk === 'MINI') {
      const codes = [...mname.matchAll(/\b([RF]\d{2,3})\b/gi)].map(x => x[1].toUpperCase());
      if (codes.length) { if (!codes.some(c => genU.includes(c))) return false; continue; }
    }
    // 字母級距前綴（Mercedes A-class / CLA / GLA / G 350、Ford F 150）
    const pm = mname.match(/^\s*([A-Z]{1,3})\b/i);
    const rest = mname.replace(/^\s*[A-Z]{1,3}\b/i, '').trim();
    if (pm && /^[A-Z]{1,3}$/i.test(pm[1]) && (rest.startsWith('-') || /\s/.test(rest))) {
      if (!vm.startsWith(pm[1].toUpperCase())) return false;
      continue;
    }
    // 純字母 1-3 字元車型名（CLA, GLA, SL）
    if (/^\s*[A-Z]{1,3}\s*$/i.test(mname)) { if (!vm.startsWith(norm(mname))) return false; continue; }
    // 含阿拉伯數字的車型名（Mazda 3, RX 8, 911, A3, 206）→ 前綴比對
    // 「911 G-model」這類帶車身/系列修飾的名稱，其完整名稱不會出現在 DB model
    // （DB 是「911 Turbo S Cabriolet」）。若該筆記錄帶有底盤碼，底盤碼才是
    // 世代判別的依據，此時改比對首個 token（「911」）；無底盤碼則維持嚴格比對，
    // 避免「Spider 145」誤配到「Spider 3.2 JTS Q4」這類不同世代車型。
    if (/\d/.test(mname)) {
      if (vm.startsWith(norm(mname))) { continue; }
      const hasChassis = rec.chassis && rec.chassis.length > 0;
      const firstTok = mname.trim().split(/\s+/)[0];
      if (hasChassis && /\d/.test(firstTok) && vm.startsWith(norm(firstTok))) { continue; }
      return false;
    }
    // 一般 token 檢查
    let toks = familyTokens(mname).filter(t => !ROMAN[t] && !PERF_RE.test(t) && t !== 'CLASS' && t !== 'KLASSE' && t !== 'SERIES');
    // Opel 單字母世代碼（Astra J → generation 含 J）
    if (mk === 'OPEL') {
      const letters = toks.filter(t => t.length === 1);
      toks = toks.filter(t => t.length > 1);
      if (letters.length && !letters.some(l => genU.includes(l))) return false;
    }
    if (toks.length && !toks.every(t => fam.includes(t))) return false;
  }
  // 世代：羅馬數字（MkN）優先，底盤碼其次（大小寫無關）
  const gen = genU;
  const romans = [...new Set(rec.models.flatMap(m => familyTokens(cleanModel(m)).filter(t => ROMAN[t]).map(t => ROMAN[t])))];
  let genOK = romans.length ? romans.some(x => gen.includes(x.toUpperCase())) : (rec.chassis.length ? rec.chassis.some(c => gen.includes(String(c).toUpperCase())) : true);
  // 單一世代家族回退：DB 該車型家族只有一個世代 → xlsx 底盤碼與 DB 平台碼系統不同不影響
  if (!genOK && FAM_SINGLE_GEN) {
    const fk = famKey(v.model);
    const fm = FAM_SINGLE_GEN[mk];
    if (fm && fm[fk]) genOK = true;
  }
  if (!genOK) return false;
  const c = rec.config;
  // 敞篷∪perf 記錄：敞篷或 perf 相符皆可
  if (c.unionConvPerf) {
    if (!vConvertible(v) && !rec.perf.some(p => vp.includes(p))) return false;
  } else if (rec.perf.length) {
    // perf 記錄涵蓋多個版本（M135i / M140i）→ 變體的 perf 須為記錄涵蓋者之一
    if (!vp.length || !vp.every(p => rec.perf.includes(p))) return false;
  } else if (vp.length) return false;
  // 車身（變體有車身詞才驗證）
  const vc = vBodyClass(v);
  if (vc && vc !== 'c' && c.doors.length && !c.doors.includes(vc)) return false;
  if (vc === 'c' && c.doors.length && !c.doors.includes('2')) return false;
  // 驅動
  if (rec.drive && vDrive(v) !== rec.drive) return false;
  // 敞篷
  if (c.convertible === true && !c.unionConvPerf && !vConvertible(v)) return false;
  // 缸數 / 柴油
  if (c.cyl === '6' && !vCyl6(v)) return false;
  if (c.cyl === '4' && vCyl6(v)) return false;
  if (c.diesel && !vDiesel(v)) return false;
  // 排除
  const vmAll = norm(v.model) + norm(v.engine_code || '');
  for (const ex of c.except) if (vmAll.includes(norm(ex))) return false;
  // 年份
  if (rec.yFrom && v.year_end && v.year_end < rec.yFrom) return false;
  if (rec.yTo && v.year_start && v.year_start > rec.yTo) return false;
  return true;
}


// ========== 主流程 ==========
(async () => {
  const fit = parseKWxlsx();
  console.log(`\nKW.xlsx 適配行：${fit.length}`);

  const csvPath = 'C:/Users/User/Desktop/商品資料庫/parts_upload_KW.csv';
  let prodInfo = new Map();
  if (fs.existsSync(csvPath)) {
    const csvRows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
    for (const r of csvRows.slice(1)) if (r[0] && !prodInfo.has(r[0])) {
      prodInfo.set(r[0], { name: r[1], cat: r[3], sub: r[4], msrp: r[5], wholesale: r[6], stock: r[7], desc: r[8], img: r[9] });
    }
  }
  const xlsxSkus = new Set();
  for (const f of fit) for (const k of Object.keys(f.prod)) { const s = f.prod[k]; if (s) xlsxSkus.add(s); }
  console.log(`xlsx SKU：${xlsxSkus.size}｜CSV 有資訊：${prodInfo.size}`);

  const variants = await prisma.$queryRawUnsafe(
    `SELECT id, make, model, generation, engine_code, year_start, year_end, drive_type, specs FROM vehicle_variants`
  );
  console.log(`DB 變體：${variants.length}`);
  const byMake = new Map();
  for (const v of variants) {
    const k = normMake(v.make);
    if (!byMake.has(k)) byMake.set(k, []);
    byMake.get(k).push(v);
  }
  const famSingle = {};
  for (const [mk, vs] of byMake) {
    const fams = {};
    for (const v of vs) {
      const fk = famKey(v.model);
      (fams[fk] = fams[fk] || new Set()).add(String(v.generation || '').toUpperCase());
    }
    famSingle[mk] = {};
    for (const [fk, gs] of Object.entries(fams)) if (gs.size === 1) famSingle[mk][fk] = true;
  }
  setFamSingleGen(famSingle);

  // 匹配：variant|line -> [{sku, rec}]
  const vLine = new Map();
  let matchedRows = 0;
  for (const rec of fit) {
    // 車型名為空的記錄不得參與匹配：其底盤碼欄位可能過寬
    // （例：MERCEDES-BENZ chassis=['639','2','639','4'] 且無車型名，
    //   會匹配到 226 個變體，把正確 SKU 蓋掉）
    if (!rec.models || !rec.models.length || rec.models.every(m => !String(m).trim())) continue;
    const cands = (byMake.get(normMake(rec.make)) || []).filter(v => matchVariant(v, rec));
    if (cands.length) matchedRows++;
    for (const line of Object.keys(rec.prod)) {
      const sku = rec.prod[line];
      if (!sku) continue;
      for (const v of cands) {
        const key = v.id + '|' + line;
        if (!vLine.has(key)) vLine.set(key, []);
        vLine.get(key).push({ sku, rec });
      }
    }
  }
  console.log(`有變體的適配行：${matchedRows}/${fit.length}`);

  // 衝突解決（沿用 v6）
  const specificity = rec => {
    let s = 0;
    if (rec.config.doors.length) s++;
    if (rec.config.drive) s++;
    if (rec.config.convertible !== null && rec.config.convertible !== undefined) s++;
    if (rec.config.strutMm) s++;
    if (rec.config.susp.length) s++;
    if (rec.perf.length) s++;
    if (rec.config.cyl) s++;
    if (rec.config.diesel) s++;
    if (rec.config.except.length) s++;
    if (rec.yTo) s++;
    if (rec.ddc) s++;
    return s;
  };
  const rung = rec => rec.wF ? (rec.wF[1] ?? rec.wF[0] ?? 0) : (rec.wR ? (rec.wR[1] ?? rec.wR[0] ?? 0) : Infinity);
  const ddcRank = rec => rec.ddc === 'none' ? 0 : rec.ddc === null ? 1 : 2;
  const resolved = new Map();
  const stats = { ties: 0, conflicts: 0 };
  for (const [key, list] of vLine) {
    const skus = new Set(list.map(x => x.sku));
    if (skus.size === 1) { resolved.set(key, list[0].sku); continue; }
    stats.conflicts++;
    const tiers = [list.filter(x => x.rec.perf.length), list.filter(x => !x.rec.perf.length)];
    let pool = tiers[0].length ? tiers[0] : tiers[1];
    const maxSpec = Math.max(...pool.map(x => specificity(x.rec)));
    pool = pool.filter(x => specificity(x.rec) === maxSpec);
    const minDdc = Math.min(...pool.map(x => ddcRank(x.rec)));
    pool = pool.filter(x => ddcRank(x.rec) === minDdc);
    const minRung = Math.min(...pool.map(x => rung(x.rec)));
    pool = pool.filter(x => rung(x.rec) === minRung);
    pool.sort((a, b) => a.sku < b.sku ? -1 : 1);
    if (pool.length > 1) stats.ties++;
    resolved.set(key, pool[0].sku);
  }
  console.log(`\n衝突（variant×line 多 SKU）：${stats.conflicts} 組｜解決後剩平手 ${stats.ties}`);

  // 輸出
  const skuVariants = new Map();
  for (const [key, sku] of resolved) {
    const [vid, line] = key.split('|');
    if (!skuVariants.has(sku)) skuVariants.set(sku, new Map());
    skuVariants.get(sku).set(vid, line);
  }
  const totalLinks = [...skuVariants.values()].reduce((a, m) => a + m.size, 0);
  console.log(` resolved 連結：${skuVariants.size} SKU｜${totalLinks} 條`);

  fs.writeFileSync('scratch_v7_resolved.json', JSON.stringify([...resolved.entries()]));
  fs.writeFileSync('scratch_v7_fit.json', JSON.stringify(fit));
  console.log('\n已存 scratch_v7_resolved.json / scratch_v7_fit.json（dry-run，未寫入資料庫）');
  await prisma.$disconnect();
})();
