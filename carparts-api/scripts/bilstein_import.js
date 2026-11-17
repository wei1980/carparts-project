/**
 * bilstein_import.js — BILSTEIN 避震器 DB 匯入
 *
 * 用法：
 *   node scripts/bilstein_import.js              # dry-run：統計 + 樣本，不寫入
 *   node scripts/bilstein_import.js --apply      # 實際寫入
 *
 * 資料來源：C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/Parts_BILSTEIN_V10_final.csv
 *   77,483 列 / 4,180 unique SKU
 *
 * 規則（依 skill references/bilstein-import.md）：
 *   - 中文品名：倍適登 Bilstein <產品線中文名>[前/後]<品項>
 *   - 產品線：name 明確 B 號 → debug_note SKU_Force → paired 對方 → 前綴表
 *   - 位置：name / debug_note 有寫才顯示；絕不靠前綴猜
 *   - 分類：Shock Absorber / Suspension Kit → 13（避震器）；Suspension Parts → 18
 *   - 價格：EUR × 35 × 1.2 進位百元；批發 × 0.9
 *   - 車型匹配：底盤碼交集优先，退回模型關鍵字
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();
// CSV 來源：預設用 V11 合併版（含 V10 舊資料 + V11 新抓），可用 --csv=<path> 覆寫
const csvArgIdx = process.argv.findIndex(a => a.startsWith('--csv='));
const CSV = csvArgIdx >= 0
  ? process.argv[csvArgIdx].slice('--csv='.length)
  : 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/Parts_BILSTEIN_V11_merged.csv';
const IMG_DIR = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/images';
const APPLY = process.argv.includes('--apply');

const EUR_TO_TWD = 35;
const MARKUP = 1.2;
const WHOLESALE_RATIO = 0.9;
const ROUND_TO = 100;
const BATCH = 500;

// ── 產品線 ──
const PREFIX_LINE = {
  '19': 'B4', '22': 'B4', '24': 'B4',
  '26': 'B6', '34': 'B6', '20': 'B6', '23': 'B6',
  '35': 'B8', '46': 'B12', '47': 'B14', '48': 'B16', '49': 'B16',
  '11': 'Dust Kit', '14': 'Damper Module', '53': 'Suspension Kit',
};
const LINE_ZH = {
  B4: 'B4 原廠替換型', B6: 'B6 運動型', B8: 'B8 賽車型',
  B12: 'B12 避震器', B14: 'B14 可調避震器', B16: 'B16 可調避震器',
  'Dust Kit': '防塵套', 'Damper Module': '阻尼解除模組',
  'Suspension Kit': '全套避震懸吊',
};
const LINE_RE = /\b(B1[0-9]|B[4-8])\b/;
const FORCE_RE = /SKU_Force\(([^)]+)\)/;
const PAIRED_RE = /paired article number:\s*(\d\d-\d+)/;

const ITEM_ZH = [
  [/^Dust Protection Kit/i, '防塵套'],
  [/^Deactivation Module/i, '阻尼解除模組'],
  [/^paired article number/i, '避震器'],
  [/^Item is replaced by/i, '避震器'],
  [/^Item replaces/i, '避震器'],
  [/^Suspension Kit/i, '全套避震懸吊'],
  [/Shock Absorber/i, '避震器'],
];
function itemZh(name) {
  for (const [re, zh] of ITEM_ZH) if (re.test(name)) return zh;
  return '避震器';
}

const POS_NAME = /\b(front|rear)\s+axle\b/i;
function position(name) {
  const m = String(name || '').match(POS_NAME);
  return m ? (/^front/i.test(m[1]) ? '前' : '後') : '';
}

function positionOf(row, skuIndex, seen) {
  const visited = seen || new Set();
  const sku = String(row.sku || '');
  if (visited.has(sku)) return '';
  visited.add(sku);

  const own = position(row.name);
  if (own) return own;

  const dn = String(row.debug_note || '');
  if (/Fitting Position:\s*Rear/i.test(dn)) return '後';
  if (/Fitting Position:\s*Front/i.test(dn)) return '前';

  const paired = (String(row.name || '').match(PAIRED_RE) || [])[1] || '';
  if (paired && skuIndex.has(paired)) {
    const o = positionOf(skuIndex.get(paired), skuIndex, visited);
    if (o) return o === '前' ? '後' : '前';
  }
  return '';
}

function lineOf(row, skuIndex, seen) {
  const visited = seen || new Set();
  const sku = String(row.sku || '');
  if (visited.has(sku)) return '';
  visited.add(sku);

  const name = String(row.name || '');
  const fromName = (name.match(LINE_RE) || [])[1] || '';
  if (fromName) return fromName.toUpperCase();

  const fromForce = (String(row.debug_note || '').match(FORCE_RE) || [])[1] || '';
  if (fromForce) return fromForce.toUpperCase();

  const paired = (name.match(PAIRED_RE) || [])[1] || '';
  if (paired && skuIndex.has(paired)) {
    return lineOf(skuIndex.get(paired), skuIndex, visited);
  }
  return PREFIX_LINE[sku.slice(0, 2)] || '';
}

function buildName(row, skuIndex) {
  const line = lineOf(row, skuIndex);
  const lineZh = LINE_ZH[line] || '避震器';
  const pos = positionOf(row, skuIndex);
  const item = itemZh(String(row.name || ''));
  if (lineZh.includes('避震器') || line === 'Dust Kit' || line === 'Damper Module') {
    return `倍適登 Bilstein ${lineZh}`;
  }
  return `倍適登 Bilstein ${lineZh}${pos}${item}`;
}

// ── 價格 ──
function priceOf(eur) {
  const n = Number(String(eur).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return { msrp: 0, wholesale: 0 };
  const msrp = Math.ceil((n * EUR_TO_TWD * MARKUP) / ROUND_TO) * ROUND_TO;
  return { msrp, wholesale: Math.round((msrp * WHOLESALE_RATIO) / 10) * 10 };
}

// ── 分類 ──
// subcategory 13 = 底盤/避震器, 14 = 底盤/短彈簧, 16 = 底盤/其他（18 是引擎/考耳，不可用）
const SUBCAT_MAP = {
  'Shock Absorber': 13,
  'Suspension Kit, complete': 13,
  'Suspension Parts': 16,
};

// ── 車型匹配 ──
const MAKE_ALIAS = {
  vw: 'Volkswagen', volkswagen: 'Volkswagen', skoda: 'Skoda', mini: 'Mini',
  mitsubishi: 'Mitsubishi', smart: 'Smart', 'ford (usa)': 'Ford',
};
const normMake = (s) => MAKE_ALIAS[String(s || '').trim().toLowerCase()] || String(s || '').trim();

// ── 底盤碼/世代正規化比對 ──
// BILSTEIN 的車型字串是 `Giulia (952)` / `Golf V (1K)`；DB 的 generation 是
// `Type 952` / `Mk5 (1K)` / `C6 (4F)`。字串直接比永遠 0% — 必須兩邊都抽成
// 「可比較的碼集合」再取交集。
const ROMAN = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10' };

function codesOf(s) {
  const out = new Set();
  const raw = String(s || '');
  // 1) 括號內一律視為底盤碼 — `Focus 1 (DAW, DBW)`、`A6 (4B2, 4B4)`、`5 Series (G30, F90)`
  //    不能用「必須含數字」的規則篩，Ford 的底盤碼是純字母。
  for (const m of raw.matchAll(/\(([^)]{1,60})\)/g)) {
    for (const part of m[1].split(/[,/;]+/)) {
      const c = part.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c && c.length >= 2 && c.length <= 12) out.add(c);
    }
  }
  // 2) 裸 token：羅馬數字 / MkN / 含數字的碼 / Alfa 式 3–4 位數字
  const cleaned = raw.replace(/^Type\s*/i, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  if (cleaned) {
    for (const w of cleaned.split(/\s+/)) {
      if (ROMAN[w]) out.add('MK' + ROMAN[w]);               // Golf V → MK5
      if (/^MK\d/.test(w)) out.add(w);                       // Mk5 → MK5
      if (/^[A-Z]{1,3}\d{1,4}[A-Z]?$/.test(w)) out.add(w);  // 1K, 8V1, 4F2, B8, A32
      if (/^\d{3,4}$/.test(w)) out.add(w);                   // 952, 105, 939（Alfa 世代）
    }
  }
  return [...out];
}

// 精確（含去 MK 前綴後相等）— 不做前綴放寬，`B1` 絕不可命中 `B10`
function codeEq(a, b) {
  if (a === b) return true;
  const x = String(a).replace(/^MK/, '');
  const y = String(b).replace(/^MK/, '');
  if (x === y) return true;
  // 平台碼後綴拆分：`F5A`/`F57`/`F5F` → `F5`、`E21` → `E210`、`NX4E` → `NX4`。
  // 只允許長度差 1–2 且短者 ≥3 字元（`B1`→`B10` 這種差 1 的也要擋，靠 ≥3 條款；
  // `F5` 2 字元則不適用 — 改用 8TA→8T 這類由 alias 表處理）。
  if (x.length >= 3 && y.length > x.length && y.length - x.length <= 2 && y.startsWith(x)) return true;
  if (y.length >= 3 && x.length > y.length && x.length - y.length <= 2 && x.startsWith(y)) return true;
  return false;
}

// 短碼（≤2 字元，如 `8T`/`F5`/`4F`）的平台別名 — 這些無法靠前綴規則安全推導
const PLATFORM_BASE = {
  'F5A': 'F5', 'F5F': 'F5', 'F57': 'F5', 'F5E': 'F5',
  '4F2': '4F', '4F5': '4F', '4F7': '4F',
  '4G2': '4G', '4G5': '4G', '4GC': '4G', '4GD': '4G',
  '4K2': '4K', '4K5': '4K',
  '8TA': '8T', '8TS': '8T',
  '8K2': '8K', '8K5': '8K', '8K1': '8K',
  '8W2': '8W', '8W5': '8W', '8W1': '8W',
  '8V1': '8V', '8VA': '8V', '8VK': '8V', '8VS': '8V',
  '8Y1': '8Y', '8YS': '8Y',
};
function platformAliases(c) {
  const base = PLATFORM_BASE[c];
  return base ? [c, base] : [c];
}
const codeEqLoose = (a, b) => platformAliases(a).some(x => codeEq(x, b)) || platformAliases(b).some(y => codeEq(a, y));

// ── 世代別名（DB `Mk7` ↔ BILSTEIN `5G1`）────────────────────────────
// 根因：DB 的 Volkswagen generation 是 `Mk7` / `Mk7.5` / `Mk8 (CD1)`，
// 而 BILSTEIN 給的是底盤碼 `5G1, BQ1, BE1, BE2`。兩邊字串毫無交集，
// 導致 2018 Golf GTI（Mk7.5）完全連不到任何 BILSTEIN 避震器。
// 對應關係不是猜的：由 BILSTEIN 自己的車系編號推出
// （`Golf 7 (5G1,...)` 的「7」對應 DB 的 `Mk7`），再用家族精確配對合併。
// 由 scripts/build_gen_alias.js 產生 → _gen_alias.json
const GEN_ALIAS = (() => {
  const p = path.join(__dirname, '_gen_alias.json');
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
})();
const ALIAS_ENTRIES = Object.entries(GEN_ALIAS);

// ── 人工維護的世代碼別名（跨命名體系，無法自動推導）─────────────
// BILSTEIN 用車系碼（`Yaris (P21, PA1, PH1)` = Yaris IV 底盤），
// DB 的 GR Yaris 用 `XP210`（車型引擎碼）。兩邊不同體系 → 手動對照。
const GEN_ALIAS_MANUAL = {
  toyota: {
    'P21': ['XP210'], 'PA1': ['XP210'], 'PH1': ['XP210'],
    'MXPA11': ['XP210'], 'MXPH13': ['XP210'], 'MXPH14': ['XP210'],
    'GXPA16': ['XP210'],
  },
};
function manualAliases(make, code) {
  const mk = String(make || '').toLowerCase();
  const tbl = GEN_ALIAS_MANUAL[mk];
  return (tbl && tbl[code]) || [];
}

// 給定 (make, DB generation) → 該世代可接受的底盤碼集合
function genCodes(make, generation) {
  const mk = String(make || '');
  const g = String(generation || '');
  const direct = GEN_ALIAS[`${mk}|${g}`];
  const out = new Set(direct || []);
  // 也吃「去括號後」的版本：`Mk8 (CD1)` 同時對 `Mk8`
  const bare = g.replace(/\s*\([^)]*\)\s*$/, '').trim();
  for (const c of GEN_ALIAS[`${mk}|${bare}`] || []) out.add(c);
  // 人工別名（跨命名體系）
  for (const c of manualAliases(mk, g)) out.add(c);
  for (const c of manualAliases(mk, bare)) out.add(c);
  return [...out];
}

// 兩側碼是否可互通：直接相等 → 平台別名 → 世代別名
function codeCompatible(supplierCodes, dbMake, dbGeneration) {
  if (!supplierCodes.length) return false;
  // 人工別名：供應商碼 → DB 世代碼（如 P21 → XP210）
  for (const sc of supplierCodes) {
    for (const mapped of manualAliases(dbMake, sc)) {
      if (String(dbGeneration || '').toUpperCase().includes(mapped)) return true;
    }
  }
  const dbCodes = genCodes(dbMake, dbGeneration);
  const all = new Set([...dbCodes, ...codesOf(dbGeneration)]);
  for (const s of supplierCodes) {
    for (const d of all) if (codeEqLoose(s, d)) return true;
  }
  return false;
}

const normModel = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
// 家族名正規化：Mercedes 的 `A 200` / `A200`、VW 的 `Golf V` 等。
// BILSTEIN 的 `Model_Series` 已帶世代（`Golf V (1K)`），DB 的 model 只有家族名
// (`Golf`)，所以家族比對要抓「去掉世代/數字」後的第一個有意義 token。
const FAMILY_STOP = new Set(['THE', 'AND', 'VAN', 'LIMOUSINE', 'SALOON', 'ESTATE', 'HATCHBACK', 'COUPE', 'CABRIOLET', 'CONVERTIBLE']);
function familyOf(s) {
  const toks = normModel(s).split(/\s+/).filter(Boolean);
  for (const t of toks) {
    if (FAMILY_STOP.has(t)) continue;
    // `A5`, `A6`, `3` 這類純家族碼要保留；`2.0`/`TSI` 這類引擎規格要跳過
    if (/^\d+(\.\d+)?$/.test(t)) continue;
    if (t.length < 2) continue;
    return t;
  }
  return toks[0] || '';
}

// ── 家族別名：供應商家族名 → DB 的 model 家族名 ────────────────
// 實例：BILSTEIN `Yaris (P21...)` → DB `GR Yaris 6MT`，家族 token 是 `GR` 而非 `Yaris`
const FAMILY_ALIAS = {
  'yaris': ['GR Yaris', 'Yaris'],   // 兩種都要試（GR Yaris 與一般 Yaris）
  'gr yaris': ['GR Yaris'],
};
function familyCandidates(fam) {
  const k = String(fam || '').toLowerCase();
  const mapped = FAMILY_ALIAS[k];
  return mapped ? mapped.map(x => x.toUpperCase().split(' ')[0]) : [String(fam || '').toUpperCase()];
}

// 家族的替代 token（`GR Yaris` 的家族 token 是 GR，但供應商寫 Yaris）
function familyTokensOfModel(model) {
  // 回傳所有可當家族 token 的詞（包含 `GR Yaris` 的 GR 與 YARIS）
  const toks = normModel(model).split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of toks) {
    if (FAMILY_STOP.has(t)) continue;
    if (/^\d+(\.\d+)?$/.test(t)) continue;
    if (/^\d/.test(t)) continue;
    if (t.length < 2) continue;
    out.push(t);
  }
  if (!out.length && toks.length) out.push(toks[0]);
  return out;
}

// BILSTEIN 的 From_to 是 `MM.YY`（月.年）：`03.08 - 06.10` = 2008/03 – 2010/06，`09.74` = 1974/09。
// ⚠️ 年份在「點」之後，抓前面的 `09` 會誤判成 2009 → 整批年份閘全錯。
function yearRange(s) {
  const t = String(s || '').trim();
  if (!t || t === '-') return null;
  const parts = t.split(/\s*-\s*/).map(x => x.trim()).filter(Boolean);
  const toYear = (x) => {
    const m = String(x).match(/^(\d{1,2})\.(\d{2}|\d{4})$/);
    if (m) {
      let y = parseInt(m[2], 10);
      if (y < 100) y = y > 50 ? 1900 + y : 2000 + y;
      return y;
    }
    const y2 = String(x).match(/^(\d{4})$/);
    if (y2) return parseInt(y2[1], 10);
    const y3 = String(x).match(/^(\d{2})$/);
    if (y3) { let y = parseInt(y3[1], 10); return y > 50 ? 1900 + y : 2000 + y; }
    return null;
  };
  const start = toYear(parts[0] || '');
  const end = parts[1] ? toYear(parts[1]) : 9999;
  if (!start) return null;
  return { start, end: end == null ? 9999 : end };
}
function modelKeys(s) {
  return String(s || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(\.\d+)?\s*(L|cc|cm3)\b/gi, ' ')
    .replace(/\b(TSI|TFSI|TDI|JTS|VVT|MK\d?|4MOTION|AWD|xDrive|quattro)\b/gi, ' ')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w.length >= 3).map(w => w.toLowerCase());
}

(async () => {
  console.log('BILSTEIN import');
  console.log(`  CSV    : ${CSV}`);
  console.log(`  images : ${IMG_DIR}`);
  console.log(`  mode   : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`  price  : EUR×${EUR_TO_TWD}×${MARKUP} → 進位 ${ROUND_TO}，批發 ×${WHOLESALE_RATIO}`);

  // csv-parse 的 columns:true 對 BOM 敏感：先剝 BOM 再餵字串
  const readCsvFile = (pth) => {
    const raw = fs.readFileSync(pth, 'utf8');
    const txt = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return parse(txt, { columns: true, skip_empty_lines: true, trim: true });
  };

  const rows = readCsvFile(CSV);
  console.log(`  rows   : ${rows.length}`);

  // sku → 代表列（paired / 前綴解析用）
  const skuIndex = new Map();
  for (const r of rows) {
    const s = String(r.sku || '').trim();
    if (s && !skuIndex.has(s)) skuIndex.set(s, r);
  }
  console.log(`  unique SKU: ${skuIndex.size}`);

  // 依 SKU 聚合
  const bySku = new Map();
  for (const r of rows) {
    const sku = String(r.sku || '').trim();
    if (!sku) continue;
    if (!bySku.has(sku)) bySku.set(sku, { row: r, vehicles: [] });
    const series = String(r.Model_Series || '').trim();
    const model = series || String(r.Model || '').trim();
    if (model) bySku.get(sku).vehicles.push({
      make: normMake(r.Manufacturer), model,
      from: String(r.From_to || '').trim(),
    });
  }

  // DB 車型索引
  const dbVariants = await prisma.vehicleVariant.findMany({
    select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true },
  });
  const byMake = new Map();
  for (const v of dbVariants) {
    const mk = String(v.make).toLowerCase();
    if (!byMake.has(mk)) byMake.set(mk, []);
    // 每個 variant 要帶 make（給世代別名用），否則 codeCompatible 拿不到品牌
    byMake.get(mk).push({ ...v, make: v.make, codes: codesOf(v.generation) });
  }
  // 家族索引：make → 家族 token（model 第一個有意義字）→ variants
  // 少了這層，`A6` 的候選會在 1,165 個 Audi variant 裡線性掃，4,180 個 SKU 會跑到逾時
  // ✅ 同一個 variant 會被放進「多個家族 token」桶（`GR Yaris 6MT` → GR、YARIS），
  //    這樣供應商寫 `Yaris` 或 `GR Yaris` 都能找到它。
  const famIndex = new Map();
  for (const [mk, list] of byMake) {
    const fam = new Map();
    for (const v of list) {
      const withCodes = Object.assign({}, v, { codes: v.codes || [] });
      if (!Array.isArray(withCodes.codes)) withCodes.codes = [];
      const seenTok = new Set();
      for (const tok of familyTokensOfModel(v.model)) {
        if (seenTok.has(tok)) continue;
        seenTok.add(tok);
        if (!fam.has(tok)) fam.set(tok, []);
        fam.get(tok).push(withCodes);
      }
    }
    famIndex.set(mk, fam);
  }
  console.log(`  DB variants: ${dbVariants.length} | makes: ${byMake.size}`);

  // 組裝
  const parts = [];
  let noLine = 0, noImg = 0, noPrice = 0;
  for (const [sku, { row, vehicles }] of bySku) {
    const line = lineOf(row, skuIndex);
    if (!line) noLine++;
    const pr = priceOf(row.msrp_eur);
    if (!pr.msrp) noPrice++;
    const imgFile = String(row.image_file || '').trim();
    if (!imgFile || !fs.existsSync(path.join(IMG_DIR, path.basename(imgFile)))) noImg++;

    parts.push({
      sku, name: buildName(row, skuIndex), brand: 'BILSTEIN',
      subcategoryId: SUBCAT_MAP[String(row.subcategory || '').trim()] || 13,
      msrp: pr.msrp, wholesale: pr.wholesale,
      imgFile: path.basename(imgFile), imageOk: imgFile && fs.existsSync(path.join(IMG_DIR, path.basename(imgFile))),
      vehicles, eur: row.msrp_eur,
    });
  }

  // 車型匹配
  // 兩層策略：
  //   1) 家族索引（model 第一字相同）→ 縮小候選後比底盤碼/世代碼 + 年份覆蓋
  //   2) 全車廠掃（家族名不同，例如 BILSTEIN `A6` vs DB `A6 2.0 TDI` 這類可命中，
  //      但 `A5 Cabriolet` vs DB `A5` 家族不同）— 只在家族層零命中時才用
  let totalPairs = 0, chassisHits = 0, keyHits = 0, famFallback = 0;
  for (const p of parts) {
    const resolved = new Set();
    for (const v of p.vehicles) {
      const mk = String(v.make).toLowerCase();
      const pool = byMake.get(mk) || [];
      if (!pool.length) continue;
      totalPairs++;
      const yr = yearRange(v.from);
      const inYear = (c) => {
        if (!yr) return true;
        const a = Number(c.year_start) || 0;
        const b = Number(c.year_end) || 9999;
        return yr.start <= b && yr.end >= a;
      };
      const supCodes = codesOf(v.model);
      const supFam = familyOf(v.model);

      const tryPool = (candList) => {
        let hits = 0;
        // 只認「底盤碼 / 世代碼交集」+ 年份覆蓋。
        // 不做「模型關鍵字」比對：BILSTEIN 的 `Golf VII (5G)` 去掉括號後只剩 `golf`，
        // 關鍵字比對會把整條 Golf 系列（Mk5/Mk6/Mk7/Mk8）全部連上 — 這是過度連結。
        // 沒有碼的列宁可不連，商品照樣上架（前台搜得到，車型篩選不出現）。
        if (supCodes.length) {
          for (const c of candList) {
            if (!inYear(c)) continue;
            // 世代別名：DB `Mk7` 可接受 BILSTEIN 的 `5G1`（見 GEN_ALIAS）
            if (codeCompatible(supCodes, c.make, c.generation) ||
                (c.codes || []).some(d => supCodes.some(s => codeEqLoose(s, d)))) {
              resolved.add(c.id); hits++;
            }
          }
          if (hits) return { hits, how: 'chassis' };
        }
        return { hits: 0, how: '' };
      };

      const fam = famIndex.get(mk);
      let famPool = (fam && fam.get(supFam)) || [];
      // 供應商家族別名（`Yaris` → DB 的 `GR Yaris` 也歸在 YARIS 桶）
      if (!famPool.length) {
        for (const cand of familyCandidates(supFam)) {
          const p2 = (fam && fam.get(cand)) || [];
          if (p2.length) { famPool = p2; break; }
        }
      }
      // 家族名不同但前綴相符（`Giulietta` vs DB `Giulia`、`Corolla Estate` vs `Corolla`）
      // 只在前綴 ≥4 字元時成立，避免 `A5`/`A6` 這類 2 字家族互撞。
      if (!famPool.length && supFam.length >= 4) {
        famPool = (fam && [...fam.entries()]
          .filter(([f]) => f.length >= 4 && (f.startsWith(supFam.slice(0, 4)) || supFam.startsWith(f.slice(0, 4))))
          .flatMap(([, v2]) => v2)) || [];
      }
      let r = famPool.length ? tryPool(famPool) : { hits: 0, how: '' };
      if (r.hits) {
        chassisHits += r.hits;
        continue;
      }
    }
    p.vehicleIds = [...resolved];
  }

  const linkedParts = parts.filter(p => p.vehicleIds.length > 0);
  const totalLinks = parts.reduce((s, p) => s + p.vehicleIds.length, 0);
  const activeParts = parts.filter(p => p.msrp > 0 && p.imageOk);

  console.log('\n=== 統計 ===');
  console.log(`  商品數        : ${parts.length}`);
  console.log(`  產品線未判定  : ${noLine}`);
  console.log(`  無價格        : ${noPrice}`);
  console.log(`  無圖片        : ${noImg}`);
  console.log(`  有圖且有價    : ${activeParts.length}`);
  console.log(`  有車型連結    : ${linkedParts.length} / ${parts.length}`);
  console.log(`  連結總數      : ${totalLinks}`);
  console.log(`  車型配對      : ${totalPairs} | 底盤碼命中 ${chassisHits} | 關鍵字命中 ${keyHits} | 家族回退 ${famFallback}`);

  console.log('\n=== 樣本（前 8）===');
  for (const p of parts.slice(0, 8)) {
    console.log(`  ${p.sku.padEnd(13)} ${p.name.padEnd(34)} EUR ${String(p.eur).padStart(8)} → ${p.msrp}/${p.wholesale}  車型 ${p.vehicleIds.length}`);
  }

  if (!APPLY) {
    console.log('\n[dry-run] 未寫入。加 --apply 執行。');
    await prisma.$disconnect();
    return;
  }

  // ---- 寫入 ----
  console.log('\n⏳ 開始寫入...');
  const t0 = Date.now();
  let partOk = 0, partFail = 0, linkOk = 0, imgCopied = 0, imgFail = 0;

  // 圖片：BILSTEIN 的 3,961 張 JPG → media/parts/Suspension/BILSTEIN/<SKU>.jpg
  // 命名直接用 SKU（`11-101291`），image_url 存 `/media/parts/.../11-101291.jpg`。
  // 保留原副檔名（.JPG），/media 靜態路由會依實際檔名回應。
  const destDir = path.join(__dirname, '..', 'media', 'parts', 'Suspension', 'BILSTEIN');
  fs.mkdirSync(destDir, { recursive: true });
  const needCopy = parts.filter(p => p.imageOk);
  console.log(`  複製圖片 ${needCopy.length} 張 → ${destDir}`);
  for (const p of needCopy) {
    const src = path.join(IMG_DIR, p.imgFile);
    const dest = path.join(destDir, p.imgFile);
    if (fs.existsSync(dest)) { imgCopied++; continue; }
    try { fs.copyFileSync(src, dest); imgCopied++; } catch { imgFail++; }
  }
  console.log(`  圖片: 已複製 ${imgCopied} | 失敗 ${imgFail}`);

  for (let i = 0; i < parts.length; i += BATCH) {
    const chunk = parts.slice(i, i + BATCH);
    for (const p of chunk) {
      try {
        const existing = await prisma.part.findUnique({
          where: { sku: p.sku }, select: { id: true, image_url: true },
        });
        const data = {
          name: p.name,
          brand: p.brand,
          subcategory_id: p.subcategoryId,
          msrp_price: p.msrp,
          wholesale_price: p.wholesale,
          stock_qty: 0,
          distributor_stock_qty: 0,
          is_active: p.msrp > 0,
          is_universal: false,
        };
        // 圖片：原 CSV 有圖就用來源檔；沒有則保留 DB 既有 image_url
        // （bilstein_fix_images.js 已用同產品線通用圖補齊那 236 個，
        //  重跑匯入時不可回頭把它們清成 null）
        if (p.imageOk) {
          data.image_url = `/media/parts/Suspension/BILSTEIN/${p.imgFile}`;
        } else if (existing && existing.image_url) {
          data.image_url = existing.image_url;
        }
        let pid;
        if (existing) {
          await prisma.part.update({ where: { id: existing.id }, data });
          pid = existing.id;
        } else {
          const created = await prisma.part.create({ data: { sku: p.sku, ...data }, select: { id: true } });
          pid = created.id;
        }
        // 分類關聯 parts_on_categories（前台「底盤」分類靠這個篩選）
        try {
          const rel = await prisma.partsOnCategories.findFirst({
            where: { part_id: pid, category_id: 4 }, select: { part_id: true },
          });
          if (!rel) await prisma.partsOnCategories.create({ data: { part_id: pid, category_id: 4 } });
        } catch { /* 分類關聯失敗不擋商品 */ }
        partOk++;
      } catch (e) {
        partFail++;
      }
    }
    if ((i + BATCH) % 1000 === 0 || i + BATCH >= parts.length) {
      const el = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  parts ${Math.min(i + BATCH, parts.length)}/${parts.length}  ok=${partOk} fail=${partFail}  ${el}s`);
    }
  }

  // 相容連結（用 sku → id map）
  const skuToId = new Map();
  const allParts = await prisma.part.findMany({ where: { brand: 'BILSTEIN' }, select: { id: true, sku: true } });
  for (const p of allParts) skuToId.set(p.sku, p.id);

  // 先清掉舊連結（品牌重匯入時避免殘留錯誤連結）
  const oldLinks = await prisma.partCompatibility.deleteMany({
    where: { part: { brand: 'BILSTEIN' } },
  });
  console.log(`  清除舊相容連結: ${oldLinks.count}`);

  for (let i = 0; i < parts.length; i += BATCH) {
    const chunk = parts.slice(i, i + BATCH);
    const rowsToInsert = [];
    for (const p of chunk) {
      const pid = skuToId.get(p.sku);
      if (!pid) continue;
      for (const vid of p.vehicleIds) rowsToInsert.push({ part_id: pid, vehicle_id: vid });
    }
    for (let j = 0; j < rowsToInsert.length; j += 1000) {
      const slice = rowsToInsert.slice(j, j + 1000);
      try {
        const sql = 'INSERT INTO part_vehicle_compatibility (part_id, vehicle_id) VALUES ' +
          slice.map((_, k) => `(${slice[k].part_id}, ${slice[k].vehicle_id})`).join(',') +
          ' ON CONFLICT DO NOTHING';
        await prisma.$executeRawUnsafe(sql);
        linkOk += slice.length;
      } catch (e) {
        // 逐筆插入作為 fallback
        for (const r of slice) {
          try { await prisma.partCompatibility.create({ data: r }); linkOk++; } catch {}
        }
      }
    }
    if ((i + BATCH) % 1000 === 0 || i + BATCH >= parts.length) {
      console.log(`  links ${Math.min(i + BATCH, parts.length)}/${parts.length}  inserted=${linkOk}`);
    }
  }

  console.log(`\n=== 完成 (${((Date.now() - t0) / 1000).toFixed(0)}s) ===`);
  console.log(`  parts 成功: ${partOk} | 失敗: ${partFail}`);
  console.log(`  links 寫入: ${linkOk}`);

  await prisma.$disconnect();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });