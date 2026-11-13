// KW 匹配器 v6 — 以 KW.xlsx 為權威適配來源
// 規則：每 (車型變體, 產品線) 只對應一個 SKU
// 衝突解決順序：1) trim 專用（perf 精配） 2) 已驗證約束數 3) 無 DDC 優先 4) 重量梯最輕階 5) SKU 升冪
const XLSX = require('xlsx');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
function parseKWxlsx() {
  const wb = XLSX.readFile('C:/Users/User/Desktop/商品資料庫/KW.xlsx');
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  const S = r => String(r ?? '').trim();
  const MAKE_RE = /^[A-Z][A-Z .&'-]+$/;
  const records = [];
  let make = '', ddcFlag = null, cur = null, lastFamily = null;
  for (let i = 8; i < rows.length; i++) {
    const r = rows[i];
    const c0 = S(r[0]), c1 = S(r[1]), c2 = S(r[2]), c3 = S(r[3]);
    const prod = { SC: S(r[6]) || null, V1: S(r[9]) || null, V2: S(r[12]) || null, V3: S(r[15]) || null, V4: S(r[18]) || null, CS: S(r[21]) || null, WAY: S(r[23]) || null };
    const hasProd = Object.values(prod).some(v => v && v !== '-');
    if (c0 && !c1 && !c2 && !c3 && !hasProd && MAKE_RE.test(c0)) { make = c0; ddcFlag = null; cur = null; continue; }
    const dm = c0.match(/^(無|有)\s*(DDC 電子懸吊|電子懸吊|Dynamic Suspension)/);
    if (dm) {
      // 旗標列本身常帶產品（如 Clubsports 2-3 way）→ 同時作為子列
      ddcFlag = dm[1] === '無' ? 'none' : 'ddc';
      if (cur) {
        cur.ddc = ddcFlag;
        if (hasProd || c3) cur.rows.push({ yFrom: cur.yFrom, yTo: cur.yTo, wF: cur.wF, wR: cur.wR, prod, config: parseConfig(c1), note: null });
      }
      continue;
    }
    const isNote = c0.startsWith('*');
    if (c0.startsWith('(') && cur) {
      for (const ch of c0.replace(/[()]/g, '').split(/[,/]/).map(x => x.trim()).filter(Boolean)) cur.chassis.push(ch);
      if (hasProd || c3) cur.rows.push({ yFrom: cur.yFrom, yTo: cur.yTo, wF: cur.wF, wR: cur.wR, prod, config: parseConfig(c1), note: null });
      continue;
    }
    if (c0 && !isNote) {
      const semi = c0.split(';');
      // 車型名切分：忽略括號內逗號（"1-series (E81, E87)" 是一個車型）
      const splitModels = s => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
      let models = splitModels(semi[0]);
      const chassis = [];
      const pm = (semi[1] || '').match(/\(([^)]*)\)/);
      if (pm) for (const ch of pm[1].split(/[,/]/).map(x => x.trim()).filter(Boolean)) if (!ch.includes('*')) chassis.push(ch);
      // 純數字車型名（如 Lexus 「250 300 350」）→ 繼承上一個家族字首
      if (models.every(m => /^\d/.test(m)) && lastFamily) {
        models = models.map(m => lastFamily + ' ' + m);
      } else if (!models.every(m => /^\d/.test(m))) {
        lastFamily = models[0].split(' ')[0];
      }
      const cfg = parseConfig(c1);
      const [yf, yt] = parseYear(c2);
      cur = { make, models, chassis, ddc: ddcFlag, config: cfg, yFrom: yf, yTo: yt, wF: parseWeight(c3), wR: parseWeight(S(r[4])), prod, rows: [] };
      records.push(cur);
      continue;
    }
    if (cur && (hasProd || c3)) {
      const cfg = c1 ? parseConfig(c1) : cur.config;
      const [yf, yt] = parseYear(c2);
      cur.rows.push({ yFrom: yf ?? cur.yFrom, yTo: yt ?? cur.yTo, wF: parseWeight(c3) ?? cur.wF, wR: parseWeight(S(r[4])) ?? cur.wR, prod, config: cfg, note: isNote ? c0 : null });
    }
  }
  // 攤平 + 記錄 perf（車型名中的性能標記 + 車型配置）
  const flat = [];
  for (const rec of records) {
    const mk = (row, prod, ddc) => {
      const ddcEff = (row.config && row.config._ddc) || ddc;
      let perf = perfTokens(rec.models.flatMap(m => familyTokens(m)));
      if (row.config._perf) perf = perf.concat(row.config._perf);
      perf = [...new Set(perf)];
      // unionConvPerf 的 perf 來自「含 X」
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

// ========== DB 變體匹配 ==========
function vBodyClass(v) {
  const m = norm(v.model);
  if (/CABRIO|CONVERTIBLE|ROADSTER|SPYDER/.test(m)) return 'c';
  if (/SEDAN|LIMOUISINE/.test(m)) return '4';
  if (/SPORTBACK|HATCHBACK|AVANT|WAGON|TOURING|COMBI|VARIANT/.test(m)) return '5';
  if (/COUPE/.test(m)) return '2';
  return null;
}
function vDrive(v) {
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
    if (/\d/.test(mname)) { if (!vm.startsWith(norm(mname))) return false; continue; }
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
  console.log(`KW.xlsx 適配行：${fit.length}`);
  // CSV 產品資訊
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
  const csvRows = parseCSV(fs.readFileSync('C:/Users/User/Desktop/商品資料庫/parts_upload_KW.csv').toString('utf8'));
  const prodInfo = new Map();
  for (const r of csvRows.slice(1)) if (r[0] && !prodInfo.has(r[0])) {
    prodInfo.set(r[0], { name: r[1], cat: r[3], sub: r[4], msrp: r[5], wholesale: r[6], stock: r[7], desc: r[8], img: r[9] });
  }
  // xlsx 出現的 SKU
  const xlsxSkus = new Set();
  for (const f of fit) for (const k of ['SC', 'V1', 'V2', 'V3', 'V4', 'CS']) { const s = f.prod[k]; if (s && s !== '-') xlsxSkus.add(s); }
  console.log(`xlsx SKU：${xlsxSkus.size}｜CSV 有資訊：${prodInfo.size}`);
  const missing = [...xlsxSkus].filter(s => !prodInfo.has(s));
  console.log(`xlsx SKU 缺 CSV 資訊：${missing.length}` + (missing.length ? ' → ' + missing.slice(0, 10).join(', ') : ''));
  // DB 變體
  // 大小寫敏感問題：SQL IN 查詢對不上 xlsx 大寫廠牌，直接全量載入後用 normMake 分組
  const variants = await prisma.$queryRawUnsafe(
    `SELECT id, make, model, generation, engine_code, year_start, year_end FROM vehicle_variants`);
  console.log(`DB 變體：${variants.length}`);
  const byMake = new Map();
  for (const v of variants) {
    const k = normMake(v.make);
    if (!byMake.has(k)) byMake.set(k, []);
    byMake.get(k).push(v);
  }
  // 各車型家族是否只有單一世代（DB 平台碼與 xlsx 底盤碼系統不同時的回退判斷）
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
  // 匹配
  const lineKeys = { SC: 'SC', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', CS: 'CS' };
  const vLine = new Map(); // variant|line -> [{sku, rec}]
  let matchedRows = 0;
  for (const rec of fit) {
    const cands = (byMake.get(normMake(rec.make)) || []).filter(v => matchVariant(v, rec));
    if (cands.length) matchedRows++;
    for (const k of Object.keys(lineKeys)) {
      const sku = rec.prod[k];
      if (!sku || sku === '-') continue;
      for (const v of cands) {
        const key = v.id + '|' + k;
        if (!vLine.has(key)) vLine.set(key, []);
        vLine.get(key).push({ sku, rec });
      }
    }
  }
  console.log(`有變體的適配行：${matchedRows}/${fit.length}`);
  // 衝突解決
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
  const resolved = new Map(); // variant|line -> sku
  const stats = { ties: 0, conflicts: 0 };
  for (const [key, list] of vLine) {
    const skus = new Set(list.map(x => x.sku));
    if (skus.size === 1) { resolved.set(key, list[0].sku); continue; }
    stats.conflicts++;
    // 1) trim 專用（perf 精配）優先
    const tiers = [list.filter(x => x.rec.perf.length), list.filter(x => !x.rec.perf.length)];
    let pool = tiers[0].length ? tiers[0] : tiers[1];
    // 2) 特異度
    const maxSpec = Math.max(...pool.map(x => specificity(x.rec)));
    pool = pool.filter(x => specificity(x.rec) === maxSpec);
    // 3) DDC
    const minDdc = Math.min(...pool.map(x => ddcRank(x.rec)));
    pool = pool.filter(x => ddcRank(x.rec) === minDdc);
    // 4) 重量梯最輕階
    const minRung = Math.min(...pool.map(x => rung(x.rec)));
    pool = pool.filter(x => rung(x.rec) === minRung);
    // 5) SKU 升冪
    pool.sort((a, b) => a.sku < b.sku ? -1 : 1);
    if (pool.length > 1) stats.ties++;
    resolved.set(key, pool[0].sku);
  }
  console.log(`\n衝突（variant×line 多 SKU）：${stats.conflicts} 組｜解決後剩平手 ${stats.ties}`);
  // 輸出：每 SKU 的變體清單
  const skuVariants = new Map();
  for (const [key, sku] of resolved) {
    const [vid, line] = key.split('|');
    if (!skuVariants.has(sku)) skuVariants.set(sku, new Map());
    skuVariants.get(sku).set(vid, line);
  }
  const totalLinks = [...skuVariants.values()].reduce((a, m) => a + m.size, 0);
  console.log(` resolved 連結：${skuVariants.size} SKU｜${totalLinks} 條`);
  // Golf GTI Mk6 驗證
  const gti = variants.filter(v => v.make === 'Volkswagen' && v.model.startsWith('Golf GTI') && String(v.generation || '').includes('Mk6'));
  console.log('\n【Golf GTI Mk6 驗證】');
  for (const v of gti) {
    const lines = {};
    for (const [key, sku] of resolved) if (key.startsWith(v.id + '|')) lines[key.split('|')[1]] = sku;
    console.log(`  ${v.id}｜${v.model}｜${v.engine_code}｜${v.year_start}-${v.year_end} → ` + JSON.stringify(lines));
  }
  fs.writeFileSync('scratch_v6_resolved.json', JSON.stringify([...resolved.entries()]));
  fs.writeFileSync('scratch_v6_fit.json', JSON.stringify(fit));
  console.log('\n已存 scratch_v6_resolved.json / scratch_v6_fit.json');
  await prisma.$disconnect();
})();
