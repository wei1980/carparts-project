// AP/KW 避震器匯入管線：parts_upload_AP.csv + parts_upload_KW.csv → parts + 相容連結
// 乾跑：node apkw_import.js
// 執行：node apkw_import.js --apply
// 產品說明：KW 技術頁 https://www.kwsuspensions.com/de/technologie/ventilsystem（V1-V7/DDC 閥技術）
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// ================= 產品說明（KW 技術頁）====================
const DESC_MAP = {
  'KW V1 避震器': 'KW V1 螺絲避震器，車輛專屬固定阻尼設定，免額外調校。諧調的底盤基礎設定，在日常實用與運動化之間取得最佳平衡，即使最大程度降低車高仍保留良好的剩餘舒適度。德國原裝進口，附原廠認證。',
  'KW V2 避震器': 'KW V2 螺絲避震器，獨特回彈階段可調（Zugstufenverstellung），可個別影響輪胎的壓入與回彈運動，細緻調校行車動態與舒適度——運動駕馭或日常舒適駕駛皆依您的設定。德國原裝進口，附原廠認證。',
  'KW V3 避震器': 'KW V3 螺絲避震器，融合運動動態與行車舒適：將賽事避震科技轉化為街道用。壓力與回彈階段力獨立可調，含可調 Lowspeed 壓力階段與 Lowspeed 回彈階段；壓力階段控制壓入行為，壓力階段閥具備 Blow-off 特性，日常行駛更加舒適。德國原裝進口，附原廠認證。',
  'KW V4 避震器': 'KW V4 螺絲避震器，可獨立調校 Highspeed 壓力階段、Lowspeed 壓力階段與 Lowspeed 回彈階段，徹底改變行車動態。提供舒適與性能兩種基礎設定，眾多汽車製造商限量特別版車型亦採用 KW V4 技術。德國原裝進口，附原廠認證。',
  'KW Clubsport 避震器': 'KW Clubsport 賽道避震器，賽事導向運動化調校（V3/V4 賽事技術），壓力與回彈階段獨立可調，為賽道日與競技駕馭打造。德國原裝進口。',
  'KW Street Comfort 避震器': 'KW Street Comfort 街道舒適避震器，保留原廠舒適取向的阻尼與彈簧設定，在降低車身高度的同時兼顧日常行駛舒適。德國原裝進口，附原廠認證。',
  'KW DDC ECU 電子避震器': 'KW DDC 電子控制螺絲避震器，半主動式阻尼調節，與眾多原廠電子懸吊系統相容。一鍵切換行車模式，必要時自動接管阻尼設定。德國原裝進口。',
  'KW DDC Plug & Play 電子避震器': 'KW DDC Plug & Play 電子螺絲避震器，半主動式阻尼調節，與眾多原廠電子懸吊系統相容；針對無原廠電子懸吊的車款，提供含線束與懸吊控制模組的即插即用升級。德國原裝進口。',
};
// KW 圖片（已轉 webp＋廠牌 LOGO，media/parts/Suspension/）
const KW_IMG_MAP = {
  'KW V1 避震器': '/media/parts/Suspension/kw_v1.webp',
  'KW V2 避震器': '/media/parts/Suspension/kw_v2.webp',
  'KW Street Comfort 避震器': '/media/parts/Suspension/kw_v2_comfort.webp',
  'KW V3 避震器': '/media/parts/Suspension/kw_v3.webp',
  'KW V4 避震器': '/media/parts/Suspension/kw_v4_clubsport.webp',
  'KW 高低可調短彈簧': '/media/parts/Suspension/kw_v3_leveling.webp',
  'KW DDC ECU 電子避震器': '/media/parts/Suspension/kw_ddc.webp',
  'KW DDC Plug & Play 電子避震器': '/media/parts/Suspension/kw_ddc.webp',
};
// Clubsport 依料號前綴分派：352x=V3 Clubsport、397x=V4 Clubsport（官網實證）
function kwImage(p) {
  if (p.name === 'KW Clubsport 避震器') {
    return p.sku.startsWith('397')
      ? '/media/parts/Suspension/kw_v4_clubsport.webp'
      : '/media/parts/Suspension/kw_v3_clubsport.webp';
  }
  return KW_IMG_MAP[p.name] || null;
}
const AP_IMG = '/media/parts/Suspension/ap_coilovers.jpg'; // 既有共用圖（media/parts/Suspension/ap_coilovers.jpg）

// ================= 類別映射 =================
// CSV 子分類全為「避震器」；品名含「短彈簧」者改歸 DB 短彈簧（subcategory 14）
const SUB_SHOCK = 13;   // 避震器（cat 4 底盤）
const SUB_SPRING = 14;  // 短彈簧（cat 4 底盤）
const CAT_NAME = { 13: '底盤', 14: '底盤' };

// ================= CSV 解析 =================
function parseCSV(text) {
  const out = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') out.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out;
}
function loadUpload(path) {
  const rows = parseCSV(fs.readFileSync(path).toString('utf8').replace(/^﻿/, ''));
  const products = new Map(); const fits = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 15) continue;
    const sku = r[0].trim();
    if (!products.has(sku)) products.set(sku, {
      sku, name: r[1].trim(), brand: r[2].trim(), cat: r[3].trim(), sub: r[4].trim(),
      msrp: parseInt(r[5]) || 0, wholesale: parseInt(r[6]) || 0, stock: parseInt(r[7]) || 0,
      desc: r[8].trim(), img: r[9].trim(),
    });
    fits.push({ sku, make: r[10], model: r[11], gen: r[12], engine: r[13], year: r[14] });
  }
  return { products, fits };
}

// ================= 匹配器（v4）====================
const MAKE_MAP = {
  'bmw': 'BMW', 'mercedes': 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
  'volkswagen': 'Volkswagen', 'vw': 'Volkswagen', 'audi': 'Audi', 'skoda': 'Skoda',
  'seat': 'Seat', 'alfa romeo': 'Alfa Romeo', 'alfaromeo': 'Alfa Romeo',
  'mini': 'Mini', 'ford': 'Ford', 'mazda': 'Mazda', 'fiat': 'Fiat', 'opel': 'Opel',
  'subaru': 'Subaru', 'honda': 'Honda', 'toyota': 'Toyota', 'nissan': 'Nissan',
  'renault': 'Renault', 'citroen': 'Citroen', 'peugeot': 'Peugeot', 'suzuki': 'Suzuki',
  'volvo': 'Volvo', 'jaguar': 'Jaguar', 'land rover': 'Land Rover', 'smart': 'Smart',
  'hyundai': 'Hyundai', 'kia': 'Kia', 'saab': 'Saab', 'mitsubishi': 'Mitsubishi',
  'porsche': 'Porsche', 'chrysler': 'Chrysler', 'dodge': 'Dodge', 'acura': 'Acura',
  'rover': 'Rover', 'pontiac': 'Pontiac', 'chevrolet': 'Chevrolet', 'chevrolet / daewoo': 'Chevrolet',
};
const ROMAN = { 'I': 'Mk1', 'II': 'Mk2', 'III': 'Mk3', 'IV': 'Mk4', 'V': 'Mk5', 'VI': 'Mk6', 'VII': 'Mk7', 'VIII': 'Mk8' };
const TRAILING_QUAL = /\s+(limousine|sedan|lim\.?|coup[é]e?|cabrio(let)?|roadster|frontantrieb|quattro|allrad|wagon|kombi|combi|hatchback|liftback|sportcoup[é]e?)$/i;
const QUALIFIER_WORDS = /^(lim|limousine|sedan|coup[é]e?|cabrio(let)?|roadster|avant|sportback|sport|frontantrieb|quattro|allrad|2wd|4wd|awd|fwd|rwd|ddc|irs|va|ha|tdi|tfsi|gti|nur|only|vehicles|with|and|or|the|f(ü|ü)r|ab|bis|fahrgestell|nr\.?|mehrlenker|federbein|ø|mm|front|strut|drive[nd]?|incl[ud]e?[dn]?|convertible|incl\.|kombi|combi|liftback|hatchback|wagon|fl|lc|si|ti|st|gt|compact|mod\.?|niveau|luftfeder|feder|federung|dampfer|stossdämpfer|stoßdämpfer|stossdmpfer|stoßdmpfer|schweller|touring|heckantrieb|luftfederung)$/i;
const CHASSIS_EXCLUDE = new Set(['2WD', '4WD', '3WD', 'DDC', 'IRS', 'VA', 'HA', 'FWD', 'RWD', 'AWD', 'TDI', 'TFSI', 'GTI', '4MOTION', 'QUATTRO', 'RS', 'GT']);
function isTrailingCode(tok) {
  tok = tok.trim();
  if (!/^[A-Z0-9]{2,4}$/i.test(tok)) return false;
  if (/mm$/i.test(tok) || /cm$/i.test(tok)) return false;
  if (/^[A-Z][0-9]{2,}$/i.test(tok)) return true;
  if (/^[0-9]{1,2}[A-Z]{1,2}$/i.test(tok)) return true;
  if (/^[0-9][A-Z][0-9]$/i.test(tok)) return true;
  return false;
}
const CODE_ALIAS = {
  'B81': ['B8'], '8R1': ['8R'], 'QB6': ['B7', '8E'], 'AUV': [], '3BS': ['3BG'],
  'Z85': ['E85'], 'B8S': ['B8'], 'B81S': ['B8'],
  'B8': ['B8', '8T', '8F'], 'B9': ['B9', '8W'],
};
const MODEL_ALIAS = { 'new beetle': 'beetle', 'newbeetle': 'beetle', 'z-c': 'zafira c', 'proceed': 'proceed' };
const deAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[´`]/g, "'");

function isChassis(tok) {
  tok = tok.trim();
  if (CHASSIS_EXCLUDE.has(tok.toUpperCase())) return false;
  if (!/^[A-Z0-9]{2,4}$/i.test(tok)) return false;
  if (/mm$/i.test(tok) || /cm$/i.test(tok)) return false;
  if (/^[A-Z]{2,3}$/i.test(tok)) return true;
  if (/^[A-Z]{2}[0-9]$/i.test(tok)) return true;
  if (/^[0-9]{1,2}[A-Z]{1,2}$/i.test(tok)) return true;
  if (/^[A-Z][0-9]{1,2}$/i.test(tok)) return true;
  if (/^[A-Z][0-9]{2}[A-Z]$/i.test(tok)) return true;
  if (/^[0-9][A-Z][0-9]$/i.test(tok)) return true;
  if (/^\d{3,4}$/.test(tok)) return true;
  return false;
}

function parseModelString(str, genCol, make) {
  const res = { models: [], genCodes: [], opelGens: [], bmwSeries: [] };
  if (genCol && genCol.trim()) {
    for (const t of deAccent(genCol).split(/[\s(),]+/)) {
      if (!t) continue;
      if (isChassis(t)) res.genCodes.push(t.toUpperCase());
      else if (/^mk\d/i.test(t)) res.genCodes.push(t);
    }
  }
  const s = deAccent(String(str || ''));
  if (!s.trim()) return res;
  const sNorm = s.replace(/（/g, '(').replace(/）/g, ')');
  const parenMatches = [...sNorm.matchAll(/\(([^()]*)\)/g)];
  const firstParen = sNorm.indexOf('(');
  const head = firstParen === -1 ? sNorm : sNorm.slice(0, firstParen);
  for (const m of parenMatches) {
    for (const tok of m[1].split(/[,;\s]+/)) {
      const t = tok.trim().replace(/\.$/, '');
      if (!t) continue;
      if (isChassis(t)) res.genCodes.push(t.toUpperCase());
    }
  }
  const segs = head.split('/');
  const modelSeg = segs[0];
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i].replace(TRAILING_QUAL, '').trim();
    if (isChassis(seg)) res.genCodes.push(seg.toUpperCase());
  }
  for (let tok of modelSeg.split(/[,;]/).map(x => x.trim().replace(TRAILING_QUAL, '').trim()).filter(Boolean)) {
    if (/^mini\s+/i.test(tok) && make === 'Mini') tok = tok.replace(/^mini\s+/i, '');
    const opelM = tok.match(/^([A-Za-z][A-Za-z0-9]*)\s+([A-Z])$/);
    if (opelM && /^(astra|corsa|insignia|mokka|vectra|zafira|combo|grandland)$/i.test(opelM[1])) {
      res.models.push(opelM[1]);
      res.opelGens.push(opelM[2]);
      continue;
    }
    const bmwM = tok.match(/^([1-8])er\b/i);
    if (bmwM && make === 'BMW') {
      res.bmwSeries.push(bmwM[1]);
      continue;
    }
    const mbM = tok.match(/^([A-Z]{1,3})[-\s]*(?:klasse|class)\b/i);
    if (mbM && make === 'Mercedes-Benz') {
      res.models.push(mbM[1].toUpperCase());
      continue;
    }
    const words = tok.split(/\s+/).filter(Boolean);
    const romans = words.filter(w => ROMAN[w]);
    const rest = words.filter(w => !ROMAN[w]);
    if (romans.length && rest.length && !rest.join(' ').match(/class|klasse/i)) {
      res.models.push(rest.join(' '));
      for (const rn of romans) res.genCodes.push(ROMAN[rn]);
      continue;
    }
    if (QUALIFIER_WORDS.test(tok)) continue;
    if (!/^[A-Z0-9]/.test(tok)) {
      if (/^(up!|i\d{2,3}|pro_?cee|cee)/i.test(tok)) { res.models.push(tok); continue; }
      continue;
    }
    if (/frontantrieb|quattro|fahrgestell|mehrlenker|federbein|strut|irs\b|chassis|vehicles|only|with|incl/i.test(tok)) continue;
    if (words.length >= 2 && isTrailingCode(words[words.length - 1])) {
      res.models.push(words.slice(0, -1).join(' '));
      res.genCodes.push(words[words.length - 1].toUpperCase());
      continue;
    }
    res.models.push(tok);
  }
  // 括號內車型（前置括號或全形括號內的車型列表）
  if (!res.models.length) {
    for (const m of parenMatches) {
      for (let tok of m[1].split(/[,;]/).map(x => x.trim().replace(/\/.*$/, '').replace(TRAILING_QUAL, '').trim()).filter(Boolean)) {
        const opelM = tok.match(/^([A-Za-z][A-Za-z0-9-]*)\s+([A-Z])$/);
        if (opelM && /^(astra|corsa|insignia|mokka|vectra|zafira|combo|grandland)$/i.test(opelM[1])) {
          res.models.push(opelM[1]);
          res.opelGens.push(opelM[2]);
          continue;
        }
        if (QUALIFIER_WORDS.test(tok)) continue;
        if (!/^[A-Z][A-Za-z-]{2,14}(\s[A-Z]?[A-Za-z0-9-]*)?$/.test(tok)) continue;
        res.models.push(tok);
      }
    }
  }
  res.models = res.models.map(m => {
    const key = m.toLowerCase().replace(/[\s_]+/g, '').replace(/[´'`']/g, '');
    return MODEL_ALIAS[key] || m;
  });
  const modelSet = new Set(res.models.map(m => m.toUpperCase()));
  res.genCodes = res.genCodes.filter(c => !modelSet.has(c));
  const expanded = [];
  for (const c of res.genCodes) {
    if (CODE_ALIAS[c]) expanded.push(...CODE_ALIAS[c]);
    else expanded.push(c);
  }
  res.genCodes = [...new Set(expanded)];
  return res;
}

function modelRegex(name) {
  const raw = deAccent(name).match(/[A-Za-z]+[0-9]*|[0-9]+/gi) || [name];
  const chunks = [];
  for (const c of raw) {
    const m = c.match(/^([A-Za-z]+)([0-9]+)$/);
    if (m) chunks.push(m[1], m[2]);
    else chunks.push(c);
  }
  return new RegExp('\\b' + chunks.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[-_\\s\'’]*') + '\\b', 'i');
}
function genRegex(code) {
  const parts = deAccent(code).split(/\s+/).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp('\\b' + parts.join('\\s+') + '\\b', 'i');
}
function parseYear(y) {
  y = String(y || '').trim();
  if (!y) return [null, null];
  let m;
  if ((m = y.match(/^(\d{4})-(\d{4})$/))) return [+m[1], +m[2]];
  if ((m = y.match(/^(\d{4})-$/))) return [+m[1], null];
  if ((m = y.match(/^-(\d{4})$/))) return [null, +m[1]];
  if ((m = y.match(/^(\d{2})-(\d{2})$/))) return [normY(+m[1]), normY(+m[2])];
  if ((m = y.match(/^(\d{2})\/(\d{2})-(\d{2})\/(\d{2})$/))) return [normY(+m[2]), normY(+m[4])];
  if ((m = y.match(/^(\d{2})\/(\d{2})-(\d{2})$/))) return [normY(+m[2]), normY(+m[3])];
  if ((m = y.match(/^-(\d{2})\/(\d{2})$/))) return [null, normY(+m[2])];
  if ((m = y.match(/^(\d{2})\/(\d{2})-$/))) return [normY(+m[2]), null];
  return [null, null];
}
function normY(y) { return y < 50 ? 2000 + y : 1900 + y; }

// ================= 主流程 =================
(async () => {
  const ap = loadUpload('C:/Users/User/Desktop/商品資料庫/parts_upload_AP.csv');
  const kw = loadUpload('C:/Users/User/Desktop/商品資料庫/parts_upload_KW.csv');
  const allProducts = new Map([...ap.products, ...kw.products]);
  const allFits = [...ap.fits, ...kw.fits];
  console.log(`產品：${allProducts.size} SKU（AP ${ap.products.size}｜KW ${kw.products.size}）｜fitment 列：${allFits.length}（AP ${ap.fits.length}｜KW ${kw.fits.length}）`);

  // 類別與說明分配
  const subDist = {};
  for (const p of allProducts.values()) {
    p.subId = /短彈簧/.test(p.name) ? SUB_SPRING : SUB_SHOCK;
    p.category = CAT_NAME[p.subId];
    p.descFinal = DESC_MAP[p.name] !== undefined ? DESC_MAP[p.name] : (p.desc || '');
    p.imgFinal = p.brand.includes('ap') ? AP_IMG : kwImage(p);
    const k = `${p.category}｜${p.subId === SUB_SHOCK ? '避震器' : '短彈簧'}`;
    subDist[k] = (subDist[k] || 0) + 1;
  }
  console.log('子類別分布（SKU 數）：');
  for (const [k, n] of Object.entries(subDist)) console.log(`  ${k}：${n}`);

  // 載入 DB 變體
  const DB_MAKES = ['Audi', 'Volkswagen', 'Skoda', 'BMW', 'Mini', 'Mercedes-Benz', 'Smart', 'Ford', 'Mazda', 'Volvo', 'Jaguar', 'Opel', 'Subaru', 'Honda', 'Toyota', 'Peugeot', 'Porsche', 'Suzuki', 'Nissan', 'Kia', 'Hyundai', 'Saab', 'Mitsubishi', 'Land Rover', 'Alfa Romeo'];
  const ph = DB_MAKES.map((_, i) => '$' + (i + 1)).join(',');
  const variants = await prisma.$queryRawUnsafe(
    `SELECT id, make, model, generation, year_start, year_end FROM vehicle_variants WHERE make IN (${ph})`, ...DB_MAKES
  );
  const byMake = new Map();
  for (const v of variants) {
    if (!byMake.has(v.make)) byMake.set(v.make, []);
    byMake.get(v.make).push(v);
  }
  const dbCodesByMake = new Map();
  const genRangeByMake = new Map();
  for (const [make, vs] of byMake) {
    const codes = new Set();
    const gr = new Map();
    for (const v of vs) {
      codes.add(deAccent(v.generation).toUpperCase());
      for (const t of deAccent(v.generation).split(/[\s(),/]+/)) if (t) codes.add(t.toUpperCase());
      const g = deAccent(v.generation);
      const s = v.year_start ?? 9999;
      const e = v.year_end ?? 0;
      const cur = gr.get(g);
      if (!cur) gr.set(g, [s, e]);
      else { cur[0] = Math.min(cur[0], s); cur[1] = Math.max(cur[1], e); }
    }
    dbCodesByMake.set(make, codes);
    genRangeByMake.set(make, gr);
  }
  console.log(`DB 變體：${variants.length}（${byMake.size} 廠牌）`);

  // 匹配
  const stats = { rows: 0, matched: 0, matchedNoGen: 0, noMake: 0, noModel: 0, noGen: 0, dbGap: 0, miss: 0, carryover: 0 };
  const perSku = new Map();
  const failByMake = {};
  const zeroLinkByMake = {};
  const dbGapSamples = [];

  for (const file of [ap, kw]) {
    const carry = new Map();
    for (const f of file.fits) {
      stats.rows++;
      const make = MAKE_MAP[String(f.make || '').trim().toLowerCase()];
      if (!make || !byMake.has(make)) { stats.noMake++; failByMake[f.make] = (failByMake[f.make] || 0) + 1; continue; }
      const parsed = parseModelString(f.model, f.gen, make);
      if (!parsed.models.length) {
        const last = carry.get(f.sku);
        if (last) {
          parsed.models = last.models;
          if (!parsed.genCodes.length) parsed.genCodes = last.genCodes;
          if (!parsed.opelGens.length) parsed.opelGens = last.opelGens;
          if (!parsed.bmwSeries.length) parsed.bmwSeries = last.bmwSeries;
          stats.carryover++;
        }
      }
      if (parsed.models.length) carry.set(f.sku, parsed);
      if (!parsed.models.length) { stats.noModel++; continue; }
      const [y0, y1] = parseYear(f.year);
      const hasGen = !!(parsed.genCodes.length || parsed.opelGens.length || parsed.bmwSeries.length);
      if (!hasGen && (y0 == null || y1 == null)) { stats.noGen++; continue; }
      const mRegs = parsed.models.map(modelRegex);
      const gRegs = [...parsed.genCodes, ...parsed.opelGens].map(genRegex);
      const grMap = genRangeByMake.get(make);
      const hit = [];
      for (const v of byMake.get(make)) {
        const ve = v.year_end ?? 9999;
        const vs = v.year_start ?? 0;
        if (hasGen) {
          if (y0 != null && y0 > ve) continue;
          if (y1 != null && y1 < vs) continue;
        } else {
          if (y0 == null || y1 == null) continue;
          const gr = grMap.get(deAccent(v.generation));
          if (!gr || y0 < gr[0] || y1 > gr[1]) continue;
        }
        const miniBare = make === 'Mini' && parsed.models.length === 1 && parsed.models[0].toLowerCase() === 'mini';
        const mHit = miniBare || mRegs.some(r => r.test(deAccent(v.model)));
        const bmwHit = parsed.bmwSeries.length && parsed.bmwSeries.some(d => new RegExp('^' + d + '\\d{2}', 'i').test(deAccent(v.model)));
        if (!mHit && !bmwHit) continue;
        if (gRegs.length && !gRegs.some(r => r.test(deAccent(v.generation)))) continue;
        hit.push(v);
      }
      if (hit.length) {
        stats.matched++;
        if (!hasGen) stats.matchedNoGen++;
        if (!perSku.has(f.sku)) perSku.set(f.sku, new Set());
        for (const v of hit) perSku.get(f.sku).add(v.id);
      } else {
        const dbCodes = dbCodesByMake.get(make);
        const codes = [...parsed.genCodes, ...parsed.opelGens];
        const anyInDB = codes.some(c => dbCodes.has(c));
        if (codes.length && !anyInDB) {
          stats.dbGap++;
          if (dbGapSamples.length < 25) dbGapSamples.push(`${f.sku}｜${make}｜${f.model}｜gen=${f.gen}｜codes=[${codes.join(',')}]`);
        } else stats.miss++;
      }
    }
  }
  console.log(`\nfitment 匹配：${stats.matched}/${stats.rows}（${(100 * stats.matched / stats.rows).toFixed(1)}%）｜續行沿用：${stats.carryover}`);
  console.log(`DB 無此廠：${stats.noMake}｜無車型：${stats.noModel}｜無世代資訊：${stats.noGen}｜DB 缺口（世代碼不存在）：${stats.dbGap}｜其他未中：${stats.miss}`);
  console.log('失敗列按輸入廠牌：' + JSON.stringify(failByMake));
  console.log('\nDB 缺口樣本（前 25）：');
  dbGapSamples.forEach(s => console.log('  ' + s));

  // per-SKU 統計
  const linkCounts = [...perSku.values()].map(s => s.size);
  let totalLinks = 0;
  for (const s of perSku.values()) totalLinks += s.size;
  console.log(`\n有連結 SKU：${perSku.size}/${allProducts.size}（${(100 * perSku.size / allProducts.size).toFixed(1)}%）｜總相容連結：${totalLinks}`);
  console.log(`每 SKU 連結數：中位數 ${linkCounts.sort((a, b) => a - b)[Math.floor(linkCounts.length / 2)]}｜最大 ${Math.max(...linkCounts, 0)}`);
  // 零連結 SKU 的輸入廠牌分布
  for (const [sku, p] of allProducts) {
    if (!perSku.has(sku)) {
      const mk = MAKE_MAP[p.brand.toLowerCase()] || '??';
      zeroLinkByMake[mk] = (zeroLinkByMake[mk] || 0) + 1;
    }
  }

  // 圖片狀態
  const apNoImg = [...allProducts.values()].filter(p => p.brand.includes('ap') && !fs.existsSync('C:/carparts/carparts-api' + AP_IMG));
  const kwNoImg = [...allProducts.values()].filter(p => !p.brand.includes('ap') && !p.imgFinal);
  console.log(`\n圖片：AP 共用圖 ${apNoImg.length === 0 ? 'OK' : '缺檔！'}｜KW 待提供圖片：${kwNoImg.length} SKU（${kwNoImg.length ? '未填入 KW_IMG_MAP' : '已全部填入'}）`);
  const lowPrice = [...allProducts.values()].filter(p => p.msrp < 100);
  console.log(`msrp<100（${lowPrice.length}）：${lowPrice.map(p => p.sku).join(', ') || '無'}`);

  if (!APPLY) { console.log('\n=== 乾跑完成（未寫入 DB）==='); await prisma.$disconnect(); return; }

  // ================= 執行匯入 =================
  const importable = [...allProducts.values()].filter(p => p.imgFinal);
  const skippedKw = [...allProducts.values()].filter(p => !p.imgFinal);
  console.log(`\n匯入零件：${importable.length}｜跳過（缺圖）：${skippedKw.length}`);
  const partIds = {};
  for (const p of importable) {
    const isActive = p.msrp >= 100;
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO parts (sku, name, brand, subcategory_id, category, image_url, description, msrp_price, wholesale_price, stock_qty, distributor_stock_qty, preorder_lead_time_days, is_active, is_universal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, $11, false)
       ON CONFLICT (sku) DO UPDATE SET name = $2, subcategory_id = $4, category = $5, image_url = $6, description = $7, msrp_price = $8, wholesale_price = $9, is_active = $11
       RETURNING id`,
      p.sku, p.name, p.brand, p.subId, p.category, p.imgFinal, p.descFinal, p.msrp, p.wholesale, p.stock, isActive
    );
    partIds[p.sku] = r[0].id;
  }
  console.log('零件匯入完成');

  const linkRows = [];
  for (const p of importable) {
    const pid = partIds[p.sku];
    const set = perSku.get(p.sku);
    if (!set) continue;
    for (const vid of set) linkRows.push([pid, vid]);
  }
  console.log(`待寫入相容連結：${linkRows.length}`);
  const BATCH = 500;
  let links = 0;
  for (let i = 0; i < linkRows.length; i += BATCH) {
    const chunk = linkRows.slice(i, i + BATCH);
    const placeholders = chunk.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`).join(', ');
    await prisma.$queryRawUnsafe(
      `INSERT INTO part_vehicle_compatibility (part_id, vehicle_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      ...chunk.flat()
    );
    links += chunk.length;
  }
  console.log(`相容連結寫入：${links}`);
  console.log(`跳過的 KW SKU（缺圖，待提供路徑後重跑）：${skippedKw.length}`);
  await prisma.$disconnect();
  console.log('=== 完成 ===');
})();
