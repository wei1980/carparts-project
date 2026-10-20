// EBC 適配重建 dry-run：只計算車型相容連結，不寫入任何資料
//
// 與 import_ebc.js 的關係：匯入腳本會同時重建零件主檔（2,467 SKU）與相容關係，
// 且會先 deleteMany 清掉舊的 EBC 相容資料 —— 直接重跑風險高。
// 本腳本只做「相容比對」，輸出每個 SKU 應連結的變體，供人工檢視與增量套用。
//
// 用法：node scripts/ebc_fitment_dryrun.cjs [--out <輸出檔>]
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const {
  normModelCore, normGen, normEngine,
  modelSimilarity, genMatch, engineMatch, dispMatch, hpMatch,
} = require('../src/services/airFilterMatching');

const PROD_DB = 'carparts';
const EFFECTIVE_URL = process.env.DATABASE_URL || require('dotenv').config().parsed.DATABASE_URL;
const dbName = (u => { const m = String(u).match(/\/([^/?]+)(\?|$)/); return m ? m[1] : null; })(EFFECTIVE_URL);
if (!dbName) { console.error('FATAL: 無法解析 DATABASE_URL'); process.exit(2); }
if (dbName === PROD_DB && process.env.ALLOW_PROD_DB !== '1') {
  console.error(`FATAL: 拒絕對正式庫 ${PROD_DB} 執行（設 ALLOW_PROD_DB=1 才可覆寫）`);
  process.exit(3);
}
console.log(`[安全閘] 目標資料庫：${dbName}｜模式：DRY-RUN（不寫入）`);

const prisma = new PrismaClient({ datasources: { db: { url: EFFECTIVE_URL } } });
const API_BASE = path.resolve(__dirname, '..');
// 來源檔：優先「已經上架」目錄（原始檔已移至此），退回 media/Data
const SRC_CANDIDATES = [
  'C:/Users/User/Desktop/商品資料庫/已經上架/EBC',
  path.join(API_BASE, 'media/Data'),
];
const SRC = SRC_CANDIDATES.find(d => fs.existsSync(path.join(d, 'EBC_來令片車型關係表.csv')));
if (!SRC) { console.error('FATAL: 找不到 EBC_來令片車型關係表.csv'); process.exit(4); }
console.log(`[來源] ${SRC}`);

const SUBCAT_ID = 9;    // 來令片
const MODEL_THRESHOLD = 0.6;
const MAKE_MAP = { 'MERCEDES-BENZ COMMERCIAL': 'Mercedes-Benz' };
const ROMAN_RE = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i;
const romanToNum = r => ({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }[String(r).toUpperCase()] || 0);

function parseLine(line) {
  const r = []; let c = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else c += ch;
  }
  r.push(c); return r;
}
function readCsv(file) {
  const text = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(l => {
    const v = parseLine(l);
    const o = {}; headers.forEach((h, j) => o[h] = (v[j] || '').trim());
    return o;
  });
}

// ===== 車型識別 / 底盤碼（沿用 import_ebc.js 的規則）=====
function modelIdentity(s) {
  return normModelCore(String(s || '').replace(/\([^)]*\)/g, ' ').replace(/[0-9]+/g, '').replace(/\s+/g, ' ').trim());
}function brandModelNorm(make, model) {
  const mk = String(make || '').toLowerCase();
  const m = String(model || '');
  if (/volkswagen|vw/.test(mk)) return m.replace(/\b(passat|golf|polo|jetta|bora|transporter|sharan|eos|touran| Phaeton|caravelle|multivan|cc)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (/audi/.test(mk)) return m.replace(/\b(a[0-8]|tt|rs[0-9]?|s[0-8]|q[0-9]|r8|a2|a3|a4|a5|a6|a7|a8)\b/gi, '').replace(/\s+/g, ' ').trim();
  return modelIdentity(m);
}
function identitySim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  return modelSimilarity(a, b);
}
function chassisCodes(s) {
  const out = new Set();
  for (const m of String(s || '').toUpperCase().matchAll(/[A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3}|\d{2,3}/g)) {
    const code = m[0];
    if (code.length < 2 || /^\d{4}$/.test(code)) continue;
    out.add(code);
  }
  return out;
}
function ebcChassis(r) {
  const m = String(r.model || '').match(/[(\[\u3010\u300c]([^)\]\u300d\u300d]+)[)\]\u300d\u300d]/);
  if (m) return chassisCodes(m[1]);
  const g = String(r.generation || '').trim().toUpperCase();
  if (/^([A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3})$/.test(g)) return chassisCodes(g);
  return new Set();
}function genIsMarker(g) {
  const s = String(g || '').trim().toUpperCase();
  if (!s) return false;
  if (ROMAN_RE.test(s)) return true;
  if (/^MK\.?\s?\d+/.test(s)) return true;
  if (/^\d+(TH|ST|ND|RD)?\s*GEN/.test(s)) return true;
  if (/^[A-Z]+$/.test(s) && !/\d/.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  return false;
}
function parenStrip(s) { return String(s || '').trim().replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim(); }
function engineMatchEBC(a, b) {
  if (!a || !b) return false;
  const A = String(a).trim().toUpperCase(), B = String(b).trim().toUpperCase();
  if (A === B) return true;
  const mainA = A.split(/\s+/)[0], mainB = B.split(/\s+/)[0];
  if (mainA !== mainB) return false;
  const sufA = A.slice(mainA.length).trim(), sufB = B.slice(mainB.length).trim();
  if (!sufA || !sufB) return true;
  return sufA === sufB || sufA.startsWith(sufB) || sufB.startsWith(sufA);
}
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
  for (const x of a) for (const y of b) {
    if (x === y) return true;
    if (x.length >= 2 && y.startsWith(x)) return true;
    if (y.length >= 2 && x.startsWith(y)) return true;
  }
  return false;
}
function matchConfig(r, ys, ye, byMake) {
  const cands = byMake.get(String(r.make).toLowerCase()) || [];
  const srcBrandNorm = brandModelNorm(r.make, r.model);
  const srcId = srcBrandNorm || modelIdentity(r.model);
  const srcChassis = ebcChassis(r);
  const hasChassis = srcChassis.size > 0;
  const srcEng = parenStrip(r.engine);
  const srcDisp = parseFloat(r.displacement_cc);
  const srcHp = parseFloat(r.bhp_ps);
  const out = [];
  for (const v of cands) {
    if (v.year_start > ye || v.year_end < ys) continue;
    let gates = 0;
    if (hasChassis) {
      if (v.chassisSet.size === 0) continue;
      let hit = false;
      for (const c of srcChassis) { if (v.chassisSet.has(c)) { hit = true; break; } }
      if (!hit) continue;
      gates++;
    } else if (genIsMarker(r.generation) && !genGateEBC(genCodesEBC(r.generation), v.genCodes)) {
      continue;
    } else if (genIsMarker(r.generation)) gates++;
    const vId = v.brandNorm || v.identity;
    const sim = identitySim(srcId, vId);
    if (sim < 0.8) continue;
    gates++;
    if (srcEng && !engineMatchEBC(srcEng, v.engineNorm)) continue;
    if (srcEng) gates++;
    if (!isNaN(srcDisp) && v.dispVal != null && !dispMatch(srcDisp, v.dispVal)) continue;
    if (!isNaN(srcDisp) && v.dispVal != null) gates++;
    if (!isNaN(srcHp) && v.hpVal != null && !hpMatch(srcHp, v.hpVal)) continue;
    if (!isNaN(srcHp) && v.hpVal != null) gates++;
    out.push({ vid: v.id, sim, gates, overlap: Math.min(ye, v.year_end) - Math.max(ys, v.year_start) + 1 });
  }
  return out;
}
function rankRec(a, b, perf) {
  if (a.sim !== b.sim) return a.sim - b.sim;
  if (a.concrete !== b.concrete) {
    const aScore = perf ? (a.concrete ? 0 : 1) : (a.concrete ? 1 : 0);
    const bScore = perf ? (b.concrete ? 0 : 1) : (b.concrete ? 1 : 0);
    return aScore - bScore;
  }
  return (a.gates - b.gates) || (a.overlap - b.overlap);
}
function isPerformanceModel(m) {
  const s = String(m || '').toUpperCase().replace(/[(\[【「].*?[\)\]】」]/g, ' ');
  if (/\bAMG\b/.test(s)) return true;
  if (/\bCLUBSPORT\b/.test(s)) return true;
  if (/\bTYPE\s*R\b/.test(s)) return true;
  if (/\bGR\b/.test(s)) return true;
  if (/(^|\s)R\d/.test(s)) return true;
  if (/(^|\s)R(\s|$)/.test(s)) return true;
  if (/(^|\s)(RS|S)\d/.test(s)) return true;
  if (/(^|\s)M\d/.test(s)) return true;
  return false;
}

(async () => {
  const rels = readCsv('EBC_來令片車型關係表.csv');
  console.log(`相容來源列：${rels.length}`);

  const variants = await prisma.vehicleVariant.findMany({
    where: { is_approved: true },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true, year_end: true, specs: true },
  });
  const byMake = new Map();
  const variantModels = new Map();
  for (const v of variants) {
    const k = (v.make || '').toLowerCase();
    if (!byMake.has(k)) byMake.set(k, []);
    variantModels.set(v.id, v.model);
    byMake.get(k).push({
      id: v.id, year_start: v.year_start, year_end: v.year_end,
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

  // EBC 零件 SKU（來令片子分類）
  const ebcParts = await prisma.part.findMany({
    where: { brand: 'EBC', subcategory_id: SUBCAT_ID, is_active: true },
    select: { id: true, sku: true, name: true },
  });
  const partBySku = new Map(ebcParts.map(p => [p.sku, p]));
  console.log(`EBC 來令片零件：${ebcParts.length} 個`);

  const configCache = new Map();
  const linkRecords = new Map();
  const quality = { withGen: 0, withEngine: 0, withDispHp: 0, modelYearOnly: 0 };
  let matchedRows = 0, unmatchedRows = 0, skippedRows = 0, overLinked = 0;
  const unmatchedLog = [];
  const unmatchedMake = new Map();
  const pre2003 = [];

  for (const r of rels) {
    const part = partBySku.get(r.sku);
    if (!part) { skippedRows++; continue; }
    const ys = parseInt(r.year_start), ye = parseInt(r.year_end);
    if (!r.make || !r.model || isNaN(ys) || isNaN(ye)) { skippedRows++; continue; }
    if (ys < 2003) pre2003.push(r);
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
      const mk = r.make || '(空)';
      unmatchedMake.set(mk, (unmatchedMake.get(mk) || 0) + 1);
      if (unmatchedLog.length < 3000) unmatchedLog.push({ sku: r.sku, make: r.make, model: r.model, generation: r.generation, engine: r.engine, year_start: r.year_start, year_end: r.year_end });
      continue;
    }
    matchedRows++;
    const specKey = (r.disc_diameter_mm && r.disc_thickness_mm) ? `${r.disc_diameter_mm}/${r.disc_thickness_mm}` : '';
    const concrete = !!(r.disc_diameter_mm && r.disc_thickness_mm);
    if (!linkRecords.has(part.id)) linkRecords.set(part.id, new Map());
    const vehMap = linkRecords.get(part.id);
    for (const m of vids) {
      const rec = { sku: r.sku, specKey, concrete, sim: m.sim, gates: m.gates, overlap: m.overlap, compound: r.compound, position: r.position };
      const prev = vehMap.get(m.vid);
      if (!prev || rankRec(rec, prev) > 0) vehMap.set(m.vid, rec);
    }
  }

  console.log(`\n匹配結果：成功 ${matchedRows}｜未匹配 ${unmatchedRows}｜跳過 ${skippedRows}`);
  console.log(`  品質：含世代 ${quality.withGen}｜含引擎 ${quality.withEngine}｜含排量馬力 ${quality.withDispHp}｜僅車型+年份 ${quality.modelYearOnly}｜過度連結(>50) ${overLinked}`);
  console.log(`  2003 年前的來源列：${pre2003.length}（DB 車型庫起始 2003）`);

  // 未匹配廠牌分布
  console.log('\n未匹配廠牌分布（前 20）:');
  [...unmatchedMake.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([k, v]) => console.log(`   ${String(k).padEnd(24)} ${v}`));

  // 產出 SKU → 變體清單
  const outMap = {};
  let totalLinks = 0, partWithLink = 0;
  for (const [partId, vehMap] of linkRecords) {
    const part = ebcParts.find(p => p.id === partId);
    if (!part) continue;
    outMap[part.sku] = [...vehMap.keys()];
    totalLinks += vehMap.size;
    partWithLink++;
  }
  console.log(`\n有連結的零件：${partWithLink} / ${ebcParts.length}（${(partWithLink / ebcParts.length * 100).toFixed(1)}%），連結總數 ${totalLinks}`);

  const outIdx = process.argv.indexOf('--out');
  const outFile = outIdx >= 0 ? process.argv[outIdx + 1] : path.join(API_BASE, 'scratch_ebc_fitment.json');
  fs.writeFileSync(outFile, JSON.stringify(outMap));
  console.log(`已寫出 ${outFile}`);
  fs.writeFileSync(path.join(API_BASE, 'scratch_ebc_unmatched.json'), JSON.stringify(unmatchedLog));
  console.log(`已寫出未匹配樣本 ${unmatchedLog.length} 筆`);

  await prisma.$disconnect();
})().catch(async e => { console.error('ERR', e.message); await prisma.$disconnect(); process.exit(1); });
