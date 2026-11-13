// EBC 來令片匯入：零件主檔（2,467）+ 車型相容關係（56,408 來源列）
// 輸入：media/Data/EBC_零件上傳規格_含價格.csv, EBC_零件規格.json, EBC_來令片車型關係表.csv
// 輸出：parts / parts_on_categories / part_vehicle_compatibility / part.specs + EBC_未匹配車型.csv + EBC_匯入報告.txt
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const {
  normModelCore, normGen, normEngine,
  modelSimilarity, genMatch, engineMatch, dispMatch, hpMatch,
} = require('./src/services/airFilterMatching');

const prisma = new PrismaClient();
const API_BASE = process.cwd();
const DATA = path.join(API_BASE, 'media/Data');
const SUBCAT_ID = 9;    // 來令片
const CATEGORY_ID = 3;  // 煞車
const MODEL_THRESHOLD = 0.6;
// 品牌映射：EBC UK 目錄品牌 → DB 品牌
const MAKE_MAP = { 'MERCEDES-BENZ COMMERCIAL': 'Mercedes-Benz' };

function parseLine(line) {
  const r = []; let c = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else c += ch;
  }
  r.push(c); return r;
}

function readCsv(file) {
  const buf = fs.readFileSync(path.join(DATA, file));
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => {
    const v = parseLine(l);
    const o = {}; headers.forEach((h, j) => o[h] = (v[j] || '').trim());
    return o;
  });
}

// ===== EBC 車型比對核心 =====
// 車型識別：去括號底盤碼後取 token；非首位且數字開頭者（引擎/規格碼 25、6MT、118）與引擎後綴捨棄
const ENGINE_TOKENS = new Set(['TFSI','TSI','TDI','CDI','JTDM','JTD','HDI','DIT','T','D','S','E','L','GL','GLX','LX','EX','LE','SE','SI','TI','FSI','GDI','CRDI','DCI','TDCI','DTI']);
// GTI/GTS 不在此：它們是車型設計（Golf GTI）而非引擎後綴——列入會把 "Golf GTI Mk8" 塌縮成 "GOLF"，
// 以 0.8 前綴分誤配到 Golf R / Golf GTE / Golf Variant（正確應為 "GOLF GTI"，精確匹配 GTI 車型）
const ROMAN_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
function romanToNum(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += (map[s[i + 1]] > map[s[i]]) ? -map[s[i]] : map[s[i]];
  return n;
}
// 品牌專用車型正規化（EBC 字串格式與 DB 不同）
// BMW：EBC "1 Series (E81) 116" / DB "116i Hatchback" → "BMW 1 116"
// Mercedes：EBC "AClass (V177) A180" / DB "A180" → "MERCEDES A 180"
const MERCEDES_CLASSES = new Set(['A','B','C','E','S','CLA','CLS','GLA','GLC','GLE','GLS','SL','SLK','SLC','SLR','GT','R','V','X','EQ','AMGGT']);
const CHASSIS_TOK_RE = /^[A-Z]{1,3}\d{1,4}[A-Z]?$|^\d{1,4}[A-Z]{1,3}$/;
function dropNoiseTokens(toks) {
  return toks.filter(t =>
    t !== 'SERIES' && t !== 'CLASS' && t !== 'SERIE' &&
    !(CHASSIS_TOK_RE.test(t) && t.length >= 2 && !/^M\d$/.test(t) && !/^\dM$/.test(t) && !/^I\d+$/.test(t) && t !== 'IX') &&
    !/^(?:X|E|S)DRIVE/.test(t)
  );
}
function brandModelNorm(make, model) {
  const mk = String(make || '').toUpperCase();
  const raw = String(model || '').toUpperCase();
  // 括號內獨立 M token → M 旗標（"1 Series (E82 M) 135" 表示 M135）
  const parenM = /\(([^)]*)\)/.test(raw) && raw.match(/\(([^)]*)\)/)[1].split(/[^A-Z0-9]+/).includes('M');
  const toks = raw.replace(/[(\[【「].*?[)\]】」]/g, ' ').split(/[^A-Z0-9]+/).filter(Boolean).map(normIdentityToken);
  if (mk === 'BMW' || mk === 'MINI') {
    // M 系列獨立車型：首位 M+單數字（M2/M3/M4/M5/M6/M8）
    if (/^M\d$/.test(toks[0] || '')) return 'BMW ' + dropNoiseTokens(toks).join(' ');
    // 系列碼：單數字（1 Series）、X/Z/I+數字（SUV/電動）、IX
    const seriesTok = toks.find(t => /^\d$/.test(t) || (/^[A-Z]{1,2}\d+$/.test(t) && !/^M/.test(t)) || t === 'IX' || t === 'I') || '';
    let trim = '';
    const mFlag = parenM || toks.includes('M');
    for (const t of toks) {
      if (/^M\d{2,3}$/.test(t) || /^\d{2,3}$/.test(t) || /^\dM$/.test(t)) { trim = t; break; }
      const em = t.match(/^(?:X|E|S)DRIVE(\d{1,3}[A-Z]?)$/);
      if (em) { trim = normIdentityToken(em[1]); break; }
    }
    if (trim) {
      if (mFlag && !trim.startsWith('M')) trim = 'M' + trim;
      const series = seriesTok || (/^M?(\d)/.test(trim) ? trim.replace(/^M/, '').charAt(0) : '');
      const extras = dropNoiseTokens(toks.filter(t => t !== seriesTok && t !== trim && t !== 'M')).join(' ');
      return series ? `BMW ${series} ${trim}${extras ? ' ' + extras : ''}` : `BMW ${trim}${extras ? ' ' + extras : ''}`;
    }
    return 'BMW ' + dropNoiseTokens(toks).join(' ');
  }
  if (mk.startsWith('MERCEDES')) {
    let cls = '';
    const clsTok = toks.find(t => /^([A-Z]{1,3})CLASS$/.test(t));
    if (clsTok) cls = clsTok.replace(/CLASS$/, '');
    else if (MERCEDES_CLASSES.has(toks[0] || '')) cls = toks[0];
    let trim = '';
    for (const t of toks) {
      if (/^[A-Z]{1,3}\d{2,3}[A-Z]?$/.test(t) || /^\d{2,4}$/.test(t)) { trim = t; break; }
    }
    if (trim) {
      const tCls = cls || (/^([A-Z]{1,3})\d/.test(trim) ? trim.match(/^([A-Z]{1,3})\d/)[1] : '');
      const bare = tCls ? trim.replace(new RegExp('^' + tCls), '') : trim;
      const amg = toks.includes('AMG') ? ' AMG' : '';
      const extras = dropNoiseTokens(toks.filter(t => t !== clsTok && t !== toks[0] && t !== trim && t !== 'AMG' && t !== '4MATIC' && t !== 'MATIC')).join(' ');
      return tCls ? `MERCEDES ${tCls} ${bare}${amg}${extras ? ' ' + extras : ''}` : `MERCEDES ${bare}${amg}${extras ? ' ' + extras : ''}`;
    }
    return 'MERCEDES ' + dropNoiseTokens(toks).join(' ');
  }
  return null;   // 其他品牌用通用規則
}
function normIdentityToken(tok) {
  let t = tok.replace(/(?<=\d)I$/, '');              // M340I → M340
  if (/^MK\d+/.test(t)) t = t.slice(2);              // MK6 → 6
  if (t.length >= 2 && ROMAN_RE.test(t)) t = 'G' + romanToNum(t);   // VI → G6（避免數字開頭被當引擎碼捨棄）
  return t;
}
function modelIdentity(s) {
  const t = String(s || '').toUpperCase().replace(/[(\[【「].*?[)\]】」]/g, ' ');
  const toks = t.split(/[^A-Z0-9]+/).filter(Boolean);
  const kept = [];
  toks.forEach((tok, i) => {
    const nt = normIdentityToken(tok);
    if (i > 0 && /^\d/.test(nt)) return;             // 引擎/規格碼
    if (i > 0 && ENGINE_TOKENS.has(nt)) return;      // 引擎後綴
    kept.push(nt);
  });
  return kept.join(' ');
}
// 車型識別相似度：僅精確或 token 前綴（禁止子字串包含，避免 YARIS ⊂ GR YARIS 誤配）
function identitySim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  const ta = a.split(' '), tb = b.split(' ');
  const [s, l] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return s.every((tok, i) => l[i] === tok) ? 0.8 : 0;
}
// 底盤碼集合（主鍵：generation/chassis code）
function chassisCodes(s) {
  const out = new Set();
  for (const m of String(s || '').toUpperCase().matchAll(/[A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3}|\d{2,3}/g)) {
    const code = m[0];
    if (code.length < 2 || /^\d{4}$/.test(code)) continue;   // 排除年份
    out.add(code);
  }
  return out;
}
// EBC 底盤碼：優先模型字串括號碼（EBC 世代欄常有誤，如 G42 車型標成 G05）
// 世代欄為純底盤碼（如 "G20"）時才採納；"E210 (12th)" 這類平台描述不採納（命名與 DB 不一致）
function ebcChassis(r) {
  const m = String(r.model || '').match(/[(\[【「]([^)\]】」]+)[)\]】」]/);
  if (m) return chassisCodes(m[1]);
  const g = String(r.generation || '').trim().toUpperCase();
  if (/^([A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3})$/.test(g)) return chassisCodes(g);
  return new Set();
}
// 世代標記（Roman/Mk/第N代/Facelift）——用於無底盤碼車型的世代閘
function genIsMarker(g) {
  const s = String(g || '').trim().toUpperCase();
  if (!s) return false;
  if (ROMAN_RE.test(s)) return true;
  if (/^MK\.?\s?\d+/.test(s)) return true;
  if (/^\d+(TH|ST|ND|RD)?\s*GEN/.test(s)) return true;
  if (/^[A-Z]+$/.test(s) && !/\d/.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  return false;
}
function parenStrip(s) {
  return String(s || '').trim().replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}
// EBC 引擎比對：主代碼相同且尾碼相容（一方無尾碼或尾碼前綴包含，如 GEN4 ⊆ GEN4 EVO）
function engineMatchEBC(a, b) {
  if (!a || !b) return false;
  const A = String(a).trim().toUpperCase();
  const B = String(b).trim().toUpperCase();
  if (A === B) return true;
  const mainA = A.split(/\s+/)[0];
  const mainB = B.split(/\s+/)[0];
  if (mainA !== mainB) return false;
  const sufA = A.slice(mainA.length).trim();
  const sufB = B.slice(mainB.length).trim();
  if (!sufA || !sufB) return true;
  return sufA === sufB || sufA.startsWith(sufB) || sufB.startsWith(sufA);
}
// 世代碼集合（Roman/Mk 統一為 G+N；CD ⊆ CD1 前綴包含）
function genCodesEBC(g) {
  const out = new Set();
  for (const m of String(g || '').toUpperCase().matchAll(/[A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3}|\d{2,3}|[A-Z]{2,3}/g)) {
    let code = m[0];
    if (/^MK\d+$/.test(code)) code = 'G' + code.slice(2);
    else if (ROMAN_RE.test(code)) code = 'G' + romanToNum(code);
    if (code.length >= 2) out.add(code);
  }
  return out;
}
function genGateEBC(a, b) {
  for (const x of a) {
    for (const y of b) {
      if (x === y) return true;
      if (x.length >= 2 && y.startsWith(x)) return true;
      if (y.length >= 2 && x.startsWith(y)) return true;
    }
  }
  return false;
}

// 單一車型設定 → 匹配所有 vehicle_variants（回傳匹配品質：sim 識別度、gates 條件數、overlap 年份重叠）
function matchConfig(r, ys, ye, byMake) {
  const cands = byMake.get(String(r.make).toLowerCase()) || [];
  const srcBrandNorm = brandModelNorm(r.make, r.model);
  const srcId = srcBrandNorm || modelIdentity(r.model);
  const srcChassis = ebcChassis(r);
  const hasChassis = srcChassis.size > 0;
  const srcGen = String(r.generation || '').trim();
  const srcEng = parenStrip(r.engine);
  const srcDisp = parseFloat(r.displacement_cc);
  const srcHp = parseFloat(r.bhp_ps);
  const out = [];
  for (const v of cands) {
    if (v.year_start > ye || v.year_end < ys) continue;          // 年份重叠
    let gates = 0;
    // 底盤碼閘：雙方皆有時須有交集（GR Yaris XP210 ≠ GR Supra A90）
    if (hasChassis) {
      if (v.chassisSet.size === 0) continue;
      let hit = false;
      for (const c of srcChassis) { if (v.chassisSet.has(c)) { hit = true; break; } }
      if (!hit) continue;
      gates++;
    } else if (genIsMarker(r.generation) && !genGateEBC(genCodesEBC(r.generation), v.genCodes)) {
      continue;                                                    // 無底盤碼時用世代閘（Golf VI 區分 Mk6/Mk7）
    } else if (genIsMarker(r.generation)) {
      gates++;
    }
    // 車型識別閘：品牌正規化 or 通用識別，精確或前綴
    const vId = v.brandNorm || v.identity;
    const sim = identitySim(srcId, vId);
    if (sim < 0.8) continue;
    gates++;
    if (srcEng && !engineMatchEBC(srcEng, v.engineNorm)) continue;   // 引擎（來源有值時）
    if (srcEng) gates++;
    if (!isNaN(srcDisp) && v.dispVal != null && !dispMatch(srcDisp, v.dispVal)) continue;
    if (!isNaN(srcDisp) && v.dispVal != null) gates++;
    if (!isNaN(srcHp) && v.hpVal != null && !hpMatch(srcHp, v.hpVal)) continue;
    if (!isNaN(srcHp) && v.hpVal != null) gates++;
    out.push({ vid: v.id, sim, gates, overlap: Math.min(ye, v.year_end) - Math.max(ys, v.year_start) + 1 });
  }
  return out;
}
// 連結品質排序：車型識別精確度 > 碟規格族 > 條件數 > 年份重叠
// 碟規格族：一般車型取「明確碟規格」族；效能車型取「空白碟」族——EBC 空白碟規格族 =
// Performance Pack 大碟（ZF-TRW 卡鉗），才是 R/AMG/M/Clubsport 車的正確規格
//（使用者確認：Golf R Mk8 全年式 = ZF-TRW 族，前 DP42448R／後 DP42438R；
//  R 車上列出的 TRW 340/30 具體碟規格族疑為目錄誤植，複製了 GTI/一般車的煞車套件）
function rankRec(a, b, perf) {
  if (a.sim !== b.sim) return a.sim - b.sim;
  if (a.concrete !== b.concrete) {
    const aScore = perf ? (a.concrete ? 0 : 1) : (a.concrete ? 1 : 0);
    const bScore = perf ? (b.concrete ? 0 : 1) : (b.concrete ? 1 : 0);
    return aScore - bScore;
  }
  return (a.gates - b.gates) || (a.overlap - b.overlap);
}
// 效能車型判斷（R/AMG/M/RS/S/Clubsport/Type R/GR——M Sport 旅行版等不含獨立 M 數字碼者不計）
function isPerformanceModel(m) {
  const s = String(m || '').toUpperCase().replace(/[(\\[【「].*?[)\\]】」]/g, ' ');
  if (/\bAMG\b/.test(s)) return true;                       // Mercedes AMG
  if (/\bCLUBSPORT\b/.test(s)) return true;                 // Golf GTI Clubsport
  if (/\bTYPE\s*R\b/.test(s)) return true;                  // Honda Civic Type R
  if (/\bGR\b/.test(s)) return true;                        // Toyota GR
  if (/(^|\s)R\d/.test(s)) return true;                     // R8…（R+數字）
  if (/(^|\s)R(\s|$)/.test(s)) return true;                 // 獨立 R（Golf R、T-Roc R）
  if (/(^|\s)(RS|S)\d/.test(s)) return true;                // RS3／S3…
  if (/(^|\s)M\d/.test(s)) return true;                     // BMW M2/M3…
  return false;
}

async function main() {
  // ========== 1. 零件主檔 ==========
  const specRows = readCsv('EBC_零件上傳規格_含價格.csv');
  const specsJson = JSON.parse(fs.readFileSync(path.join(DATA, 'EBC_零件規格.json'), 'utf-8'));
  const specBySku = new Map(specsJson.map(s => [String(s.sku).trim(), s]));

  const partIds = {};
  let inserted = 0, updated = 0, imgMissing = [], noPrice = [];
  for (const row of specRows) {
    const sku = row.SKU;
    let img = row.image_url || null;
    if (img && !fs.existsSync(path.join(API_BASE, img))) { img = null; imgMissing.push(sku); }
    const msrp = parseFloat(row.msrp_twd) || 0;
    if (msrp <= 0) noPrice.push(sku);
    const spec = specBySku.get(sku) || {};
    const data = {
      name: row.Name || sku,
      brand: 'EBC',
      category: '煞車',
      subcategory_id: SUBCAT_ID,
      msrp_price: msrp,
      wholesale_price: parseFloat(row.wholesale_twd) || msrp,
      stock_qty: parseInt(row['Own Stock']) || 0,
      distributor_stock_qty: parseInt(row['Distributor Stock']) || 0,
      image_url: img,
      description: row.description || null,
      is_universal: false,
      is_active: msrp >= 100,   // 金額低於 100 元不能上架
      specs: {
        compound: spec.compound || null,
        position: spec.position || null,
        disc_diameter_mm: spec.disc_diameter_mm || [],
        disc_thickness_mm: spec.disc_thickness_mm || [],
        disc_style: spec.disc_style || [],
        caliper_make: spec.caliper_make || [],
      },
    };
    const existing = await prisma.part.findUnique({ where: { sku } });
    if (existing) { await prisma.part.update({ where: { sku }, data }); updated++; }
    else { await prisma.part.create({ data: { sku, ...data } }); inserted++; }
    partIds[sku] = (await prisma.part.findUnique({ where: { sku }, select: { id: true } })).id;
    await prisma.partsOnCategories.upsert({
      where: { part_id_category_id: { part_id: partIds[sku], category_id: CATEGORY_ID } },
      update: {},
      create: { part_id: partIds[sku], category_id: CATEGORY_ID },
    }).catch(() => {});
  }
  console.log(`零件主檔：新增 ${inserted}，更新 ${updated}（共 ${specRows.length} SKU）`);
  console.log(`  圖片缺失：${imgMissing.length}｜無價格（請洽客服）：${noPrice.length}`);

  // ========== 2. 車型相容匹配 ==========
  // 清除舊 EBC 相容資料（重跑時避免舊規則的錯誤連結殘留）
  const cleared = await prisma.partCompatibility.deleteMany({
    where: { part_id: { in: Object.values(partIds) } },
  });
  console.log(`已清除舊 EBC 相容資料：${cleared.count} 筆`);

  const rels = readCsv('EBC_來令片車型關係表.csv');
  console.log(`\n相容資料：${rels.length} 來源列`);

  const variants = await prisma.vehicleVariant.findMany({
    where: { is_approved: true },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true, year_end: true, specs: true },
  });
  const byMake = new Map();
  const variantModels = new Map();   // vid -> model（效能車型判斷用）
  for (const v of variants) {
    const k = (v.make || '').toLowerCase();
    if (!byMake.has(k)) byMake.set(k, []);
    variantModels.set(v.id, v.model);
    byMake.get(k).push({
      id: v.id,
      year_start: v.year_start,
      year_end: v.year_end,
      identity: modelIdentity(v.model),
      brandNorm: brandModelNorm(v.make, v.model),
      chassisSet: chassisCodes(v.generation),
      genCodes: genCodesEBC(v.generation),
      genNorm: normGen(v.generation || ''),
      engineNorm: normEngine(v.engine_code || ''),
      dispVal: v.specs?.displacement_cc ?? null,
      hpVal: v.specs?.horsepower_ps ?? null,
    });
  }
  console.log(`vehicle_variants：${variants.length} 筆（${byMake.size} 品牌）`);

  const configCache = new Map();
  const linkRecords = new Map();   // partId -> Map(vid -> 品質記錄)
  const quality = { withGen: 0, withEngine: 0, withDispHp: 0, modelYearOnly: 0 };
  let matchedRows = 0, unmatchedRows = 0, skippedRows = 0, overLinked = 0;
  const unmatchedLog = [];
  const unmatchedYearBucket = {};
  let pre2003Rows = 0;

  for (const r of rels) {
    const partId = partIds[r.sku];
    if (!partId) { skippedRows++; continue; }
    const ys = parseInt(r.year_start), ye = parseInt(r.year_end);
    if (!r.make || !r.model || isNaN(ys) || isNaN(ye)) { skippedRows++; continue; }
    if (ys < 2003) pre2003Rows++;   // DB 車型庫起始於 2003

    const makeKey = MAKE_MAP[r.make] || r.make;
    const cfgKey = `${makeKey}|${r.model}|${r.generation}|${r.engine}|${r.displacement_cc}|${r.bhp_ps}|${ys}|${ye}`;
    let vids = configCache.get(cfgKey);
    if (vids === undefined) {
      vids = matchConfig({ ...r, make: makeKey }, ys, ye, byMake);
      configCache.set(cfgKey, vids);
      if (vids.length > 0) {
        if (r.generation) quality.withGen++;
        if (r.engine) quality.withEngine++;
        if ((parseFloat(r.displacement_cc) || parseFloat(r.bhp_ps)) && (parseFloat(r.displacement_cc) && parseFloat(r.bhp_ps))) quality.withDispHp++;
        if (!r.generation && !r.engine) quality.modelYearOnly++;
        if (vids.length > 50) overLinked++;
      }
    }
    if (vids.length === 0) {
      unmatchedRows++;
      const b = `${Math.floor(ys / 10) * 10}s`;
      unmatchedYearBucket[b] = (unmatchedYearBucket[b] || 0) + 1;
      unmatchedLog.push({ sku: r.sku, make: r.make, model: r.model, generation: r.generation, engine: r.engine, displacement_cc: r.displacement_cc, bhp_ps: r.bhp_ps, year_start: r.year_start, year_end: r.year_end, reason: '無匹配車型（車型核心<0.6 或年份/規格不符，或 DB 無此年份車型）' });
      continue;
    }
    matchedRows++;
    // 記錄連結品質（同 part×vehicle 取最佳列）
    const specKey = (r.disc_diameter_mm && r.disc_thickness_mm) ? `${r.disc_diameter_mm}/${r.disc_thickness_mm}` : '';
    const concrete = !!(r.disc_diameter_mm && r.disc_thickness_mm);
    if (!linkRecords.has(partId)) linkRecords.set(partId, new Map());
    const vehMap = linkRecords.get(partId);
    for (const m of vids) {
      const rec = { sku: r.sku, specKey, concrete, sim: m.sim, gates: m.gates, overlap: m.overlap, compound: r.compound, position: r.position };
      const prev = vehMap.get(m.vid);
      if (!prev || rankRec(rec, prev) > 0) vehMap.set(m.vid, rec);
    }
  }

  console.log(`匹配結果：成功 ${matchedRows}｜未匹配 ${unmatchedRows}｜跳過 ${skippedRows}`);
  console.log(`  匹配品質：含世代 ${quality.withGen}｜含引擎 ${quality.withEngine}｜含排量馬力 ${quality.withDispHp}｜僅車型+年份 ${quality.modelYearOnly}｜過度連結(>50) ${overLinked}`);

  // ========== 一車型一規格：同車型同化合物+位置只保留一種碟規格 ==========
  // 同一車型若連到多種碟規格（如 Golf R Mk8 前輪 340/30 標準煞 vs 357mm PP 大碟），
  // 保留最佳規格族：車型識別精確度 > 碟規格明確 > 條件數 > 年份重叠
  const groups = new Map();   // `${vid}|${compound}|${position}` -> rec[]
  for (const [partId, vehMap] of linkRecords) {
    for (const [vid, rec] of vehMap) {
      const key = `${vid}|${rec.compound}|${rec.position}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ partId, vid, ...rec });
    }
  }
  let conflictGroups = 0, droppedLinks = 0;
  const links = new Map();   // partId -> Set(vehicleId)
  for (const [key, recs] of groups) {
    const specKeys = new Set(recs.map(x => x.specKey));
    let keep = recs;
    if (specKeys.size > 1) {
      const perf = isPerformanceModel(variantModels.get(recs[0].vid));
      const best = recs.slice().sort((a, b) => rankRec(b, a, perf))[0];
      keep = recs.filter(x => x.specKey === best.specKey);   // 同規格族全留，他規格族剔除
      conflictGroups++;
      droppedLinks += recs.length - keep.length;
    }
    for (const rec of keep) {
      if (!links.has(rec.partId)) links.set(rec.partId, new Set());
      links.get(rec.partId).add(rec.vid);
    }
  }
  console.log(`一車型一規格衝突解決：${conflictGroups} 組衝突，剔除 ${droppedLinks} 連結`);

  // ========== 3. 寫入 part_vehicle_compatibility ==========
  let created = 0;
  let totalLinks = 0;
  for (const [partId, vset] of links) {
    const rows = [...vset].map(vehicle_id => ({ part_id: partId, vehicle_id }));
    const res = await prisma.partCompatibility.createMany({ data: rows, skipDuplicates: true });
    created += res.count;
    totalLinks += vset.size;
  }
  console.log(`\n相容關係：${totalLinks} 組（part×vehicle），本次新增 ${created} 筆`);

  // ========== 4. 報告 ==========
  const perSku = {};
  for (const r of rels) perSku[r.sku] = (perSku[r.sku] || 0) + 1;
  const unmatchedPerSku = {};
  for (const u of unmatchedLog) unmatchedPerSku[u.sku] = (unmatchedPerSku[u.sku] || 0) + 1;
  const zeroFit = specRows.map(r => r.SKU).filter(sku => !links.has(partIds[sku]));

  const report = [];
  report.push('EBC 來令片匯入報告 ' + new Date().toISOString());
  report.push('');
  report.push(`零件主檔：新增 ${inserted}，更新 ${updated}（共 ${specRows.length} SKU）`);
  report.push(`  價格：精選表 698｜NEWRETAIL 推導 1,017｜成本推導 650｜無價格 ${noPrice.length}（請洽客服）`);
  report.push(`  圖片缺失：${imgMissing.length}`);
  report.push(`相容資料：${rels.length} 來源列 → 成功 ${matchedRows}｜未匹配 ${unmatchedRows}｜跳過 ${skippedRows}`);
  report.push(`未匹配年代分布：${JSON.stringify(unmatchedYearBucket)}`);
  report.push(`  其中 2003 年前（DB 車型庫未覆蓋）：${pre2003Rows} 列`);
  report.push(`相容關係：${totalLinks} 組 part×vehicle，新增 ${created} 筆`);
  report.push(`匹配品質：含世代 ${quality.withGen}｜含引擎 ${quality.withEngine}｜含排量+馬力 ${quality.withDispHp}｜僅車型+年份 ${quality.modelYearOnly}`);
  report.push('');
  report.push('=== per-SKU（來源列 / 零相容標記）===');
  for (const sku of Object.keys(perSku).sort()) {
    report.push(`  ${sku}: ${perSku[sku]}${links.has(partIds[sku]) ? '' : ' ⚠零相容'}`);
  }
  report.push('');
  report.push('⚠ 零相容 SKU（' + zeroFit.length + '）：' + zeroFit.join(', '));
  fs.writeFileSync(path.join(DATA, 'EBC_匯入報告.txt'), report.join('\n'), 'utf8');

  const uHeaders = ['sku','make','model','generation','engine','displacement_cc','bhp_ps','year_start','year_end','reason'];
  const uLines = [uHeaders.join(',')];
  for (const u of unmatchedLog) {
    uLines.push([u.sku, u.make, `"${u.model}"`, u.generation, u.engine, u.displacement_cc, u.bhp_ps, u.year_start, u.year_end, `"${u.reason}"`].join(','));
  }
  fs.writeFileSync(path.join(DATA, 'EBC_未匹配車型.csv'), '﻿' + uLines.join('\r\n'), 'utf8');
  console.log('寫出 EBC_未匹配車型.csv, EBC_匯入報告.txt');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); }).finally(() => prisma.$disconnect());
