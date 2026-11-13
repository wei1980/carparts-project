// FUNK fitment matcher v5
// v5 changes vs v4:
//  - DT_SET: xdrive added (BMW AWD token was leaking into identity).
//  - Drivetrain fallback ladder: strict rule first (CSV row w/o dt token
//    excludes DB AWD variants — suppliers list AWD trims as separate rows);
//    when that yields ZERO candidates and the CSV row carries no dt token,
//    retry with dt ignored (mandatory-AWD naming, e.g. M850i xDrive —
//    a turbo blanket is engine-mounted, FWD/AWD share the turbo).
//  - Tie-group key = (db identity, engine family) only — generation dropped
//    (the MkN-AND gen gate already filtered candidates; B9 vs B9.5 and
//    Gen3 vs Gen3B facelift splits of the same car share one blanket).
//  - Displacement map: EA288 covers 1.6+2.0 TDI; EA211 covers 1.0-1.6.
//  - engineFamily strips evo/ev with optional digits (evo4 → base).
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const CSV_PATH = 'C:/Users/User/Desktop/商品資料庫/parts_upload_FUNK.csv';
const SCRATCH = 'C:/Users/User/AppData/Local/hermes/cache/scratch';

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

const htmlDecode = s => (s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&#039;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&#8217;/g, '’');
const normWs = s => (s || '').replace(/\s+/g, ' ').trim();
const MAKE_MAP = { 'VW': 'Volkswagen', 'Ford Truck': 'Ford' };

const SEAT_RE = /^(7seats|5seats|7seat|5seat|7座|5座|6座|4座|5門|7門|6門|4門|七人座|六人座|五人座|四人座|5人座|7人座|6人座)$/i;
const DT_SET = new Set(['quattro', '4x4', 'all4', '4motion', '4matic', 'awd', 'xdrive']);
const PKG_COMMON = new Set([
  'line', 'r-line', 'sportline', 'luxury', 'edition', 'premium', 'elegance', 'ambition',
  'highline', 'comfortline', 'trendline', 'selection', 'style', 'advanced', 'classic',
  'attraction', 'progressive', 'base', 'flagship', 'l&k', 'sport', 'package', 'm',
  'special', 'pure', 'first', 'shadow', 'platinum',
]);
const isCJK = t => /^[\u4e00-\u9fff]+$/.test(t);

function isPowerToken(t) {
  if (/^\d{1,2}(\.\d+)?$/.test(t)) return true;
  if (/^(tsi|tfsi|tdi|e-tec|kw)$/.test(t)) return true;
  if (/^\d+t$/i.test(t)) return true;
  if (/^\d+kw$/i.test(t)) return true;
  return false;
}
function isPerformanceToken(make, t, tokens) {
  if (/^(gti|rs|r|jcw|cupra|abt|clubsport|type-r|works|performance)$/.test(t)) return true;
  if (/^(r|s|m)\d+$/.test(t) || /^sq\d+$/.test(t)) return true;
  if (make === 'Mini' && (t === 's' || t === 'sd')) return true;
  if (make === 'BMW' && t === 'm' && !tokens.includes('sport')) return true;
  return false;
}
function isPackageToken(make, t, tokens) {
  if (PKG_COMMON.has(t)) return true;
  if (isCJK(t)) return true;
  if (make === 'BMW' && t === 'm' && tokens.includes('sport')) return true;
  if (make !== 'Mini' && t === 's') return true;
  return false;
}

const ENGINE_DISPLACEMENT = {
  'ea211 evo2': ['1.5'], 'ea211 evo': ['1.4', '1.5'], 'ea211': ['1.0', '1.2', '1.4', '1.5', '1.6'],
  'ea888': ['1.8', '2.0'], 'ea288': ['1.6', '2.0'], 'ea189': ['2.0'], 'ea855': ['2.5'],
  'ea837': ['3.0'], 'ea824': ['3.0'], 'ea390': ['2.5'],
  'b38': ['1.5'], 'b48': ['2.0'], 'b58': ['3.0'], 'b47': ['2.0'], 'b57': ['3.0'],
  'n13': ['1.6'], 'n20': ['2.0'], 'n55': ['3.0'], 'n47': ['2.0'], 'n45': ['2.0'],
  'n46': ['2.0'], 'n52': ['3.0'], 'n54': ['3.0'], 'n63': ['4.4'], 'n73': ['6.0'],
  'm54': ['3.0'], 'm57': ['3.0'], 's58': ['3.0'], 's63': ['4.4'], 's68': ['4.4'],
  'b48b20': ['2.0'], 'b58b30': ['3.0'], 'n55b30': ['3.0'], 'n63b44': ['4.4'],
};
function engineDisplacementAllowed(engineStr) {
  const e = normWs(engineStr).replace(/\./g, '').toLowerCase();
  const keys = Object.keys(ENGINE_DISPLACEMENT).sort((a, b) => b.length - a.length);
  for (const k of keys) if (e.startsWith(k)) return ENGINE_DISPLACEMENT[k];
  return null;
}

const cjkSpace = s => s
  .replace(/[（）【】]/g, ' ')
  .replace(/([a-zA-Z0-9])([\u4e00-\u9fff])/g, '$1 $2')
  .replace(/([\u4e00-\u9fff])([a-zA-Z0-9])/g, '$1 $2');

function normalizeMiniModel(m) {
  return normWs(m).replace(/^Mini\s+/, '').replace(/Hatch Hatch/, 'Hatch')
    .replace(/(\d)\s*Door/gi, '$1-Door');
}

function classifyModel(make, modelStr) {
  let s = cjkSpace(htmlDecode(normWs(modelStr))).replace(/×/g, 'x');
  if (make === 'BMW') s = s.replace(/^\d+-Series\s+/, '').replace(/\bGT\b/g, 'Gran Turismo');
  if (make === 'Mini') s = normalizeMiniModel(s);
  if (make === 'Volkswagen' && /^passat\s+cc\b/i.test(s)) s = s.replace(/^passat\s+/i, '');
  const rawTokens = s.toLowerCase().split(/\s+/).filter(t => /[a-z0-9\u4e00-\u9fff]/.test(t));
  const displacements = [...new Set(rawTokens.filter(t => /^\d\.\d/.test(t)).map(t => t.match(/^\d\.\d/)[0]))];
  const tokens = rawTokens.filter(t => !SEAT_RE.test(t));
  const identity = new Set(), perf = new Set(), dt = new Set();
  for (const t of tokens) {
    if (DT_SET.has(t)) { dt.add(t); continue; }
    if (isPowerToken(t)) continue;
    if (isPerformanceToken(make, t, tokens)) { perf.add(t); continue; }
    if (isPackageToken(make, t, tokens)) continue;
    identity.add(t);
  }
  if (make === 'Mini') identity.delete('hatch');
  if (identity.size === 0 && perf.size > 0) { for (const t of perf) identity.add(t); }
  return { identity, perf, dt, displacements };
}

function normalizeEngine(csvEngine) {
  let e = normWs(csvEngine).replace(/\./g, '');
  e = e.replace(/\s+\d+(\.\d+)?\s+(TSI|TFSI|TDI)$/i, '');
  const out = new Set([e]);
  if (e === 'EA888 Gen3B') { out.add('EA888 Gen3'); out.add('EA888 Gen3 B-Cycle'); }
  return out;
}
const engineFamily = e => normWs(e).replace(/\./g, '').toLowerCase()
  .replace(/\s*(evo\d*|ev\d*|b-cycle)$/i, '');
function dbEngineMatches(csvEngines, dbEngine) {
  if (!dbEngine) return true;
  const d = normWs(dbEngine).replace(/\./g, '');
  if (csvEngines.has(d)) return true;
  for (const c of csvEngines) {
    if (c.length >= 3 && d.length >= 3 && (d.startsWith(c) || c.startsWith(d))) return true;
  }
  return false;
}

function genTokens(gen) {
  if (!gen) return new Set();
  const g = normWs(gen);
  const toks = new Set(g.split(/[\s/,()]+/).filter(Boolean));
  toks.add(g);
  return toks;
}
function genMatch(csvGen, dbGen) {
  const a = genTokens(csvGen), b = genTokens(dbGen);
  const mkA = [...a].filter(t => /^Mk\d+(\.\d+)?$/.test(t));
  if (mkA.length) return mkA.some(m => b.has(m));
  for (const t of a) if (b.has(t)) return true;
  return false;
}

function modelGate(csvC, dbC, dbEngine, ignoreDt) {
  if (csvC.identity.size === 0 || dbC.identity.size === 0) return { ok: false, why: 'identity-empty' };
  if (csvC.identity.size !== dbC.identity.size || ![...csvC.identity].every(t => dbC.identity.has(t))) {
    return { ok: false, why: 'identity' };
  }
  for (const t of dbC.perf) if (!csvC.perf.has(t)) return { ok: false, why: 'perf' };
  if (!ignoreDt) {
    if (csvC.dt.size === 0) { if (dbC.dt.size > 0) return { ok: false, why: 'dt' }; }
    else {
      let has = false;
      for (const t of dbC.dt) if (csvC.dt.has(t)) { has = true; break; }
      if (!has) return { ok: false, why: 'dt' };
    }
  }
  if (csvC.displacements.length && dbEngine) {
    const allowed = engineDisplacementAllowed(dbEngine);
    if (allowed) {
      for (const d of csvC.displacements) {
        if (!allowed.includes(d)) return { ok: false, why: `displacement ${d} vs ${dbEngine}` };
      }
    }
  }
  return { ok: true };
}

async function main() {
  const text = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(text);
  console.log('CSV rows:', rows.length);

  const prisma = new PrismaClient();
  const variants = await prisma.$queryRawUnsafe(`
    SELECT id, make, model, generation, engine_code, year_start, year_end
    FROM vehicle_variants WHERE is_approved = true`);
  console.log('DB approved variants:', variants.length);

  const byMake = new Map();
  for (const v of variants) {
    const mk = MAKE_MAP[v.make] || v.make;
    if (!byMake.has(mk)) byMake.set(mk, []);
    byMake.get(mk).push(v);
  }

  const groups = new Map();
  const broadRows = [];
  for (const r of rows) {
    const make = MAKE_MAP[r['廠牌']] || r['廠牌'];
    const model = htmlDecode(normWs(r['車型']));
    const gen = normWs(r['世代']);
    const eng = normWs(r['引擎代碼']);
    const year = parseInt(r['年份'].trim(), 10);
    if (!gen || !eng || isNaN(year)) {
      broadRows.push({ sku: r['SKU'], make, model, gen, eng, yr: r['年份'], name: r['品名'] });
      continue;
    }
    const key = [r['SKU'], make, model, gen, eng].join('||');
    if (!groups.has(key)) groups.set(key, { sku: r['SKU'], make, model, gen, eng, years: [], name: r['品名'] });
    groups.get(key).years.push(year);
  }
  console.log('detailed groups:', groups.size, '| broad rows (review-only):', broadRows.length);

  const results = [];
  const unmatchedLog = [];
  const reviewAmbiguous = [];
  let dtFallbackUsed = 0;

  for (const g of groups.values()) {
    g.years.sort((a, b) => a - b);
    const y0 = g.years[0], y1 = g.years[g.years.length - 1];
    const engines = normalizeEngine(g.eng);
    const csvC = classifyModel(g.make, g.model);

    const cands = (byMake.get(g.make) || []).filter(v =>
      genMatch(g.gen, v.generation || '') && !(v.year_start > y1 || v.year_end < y0));

    // pass 1: strict dt rule
    let passing = [];
    let failStats = {};
    for (const v of cands) {
      if (!dbEngineMatches(engines, v.engine_code)) { failStats.engine = (failStats.engine || 0) + 1; continue; }
      const dbC = classifyModel(g.make, v.model);
      const gate = modelGate(csvC, dbC, v.engine_code, false);
      if (!gate.ok) { failStats[gate.why] = (failStats[gate.why] || 0) + 1; continue; }
      passing.push({ v, dbC });
    }
    // pass 2 (fallback): CSV row carries no dt token and strict pass was empty
    if (!passing.length && csvC.dt.size === 0 && cands.length) {
      const fb = [];
      const fbFails = {};
      for (const v of cands) {
        if (!dbEngineMatches(engines, v.engine_code)) { fbFails.engine = (fbFails.engine || 0) + 1; continue; }
        const dbC = classifyModel(g.make, v.model);
        const gate = modelGate(csvC, dbC, v.engine_code, true);
        if (!gate.ok) { fbFails[gate.why] = (fbFails[gate.why] || 0) + 1; continue; }
        fb.push({ v, dbC });
      }
      if (fb.length) { passing = fb; failStats = fbFails; dtFallbackUsed++; }
    }

    if (!passing.length) {
      unmatchedLog.push({
        sku: g.sku,
        csv: `${g.make} | ${g.model} | ${g.gen} | ${g.eng} | ${y0}-${y1}`,
        fails: failStats, cands: cands.length,
        sampleDb: cands.slice(0, 3).map(v => `${v.model} | ${v.generation} | ${v.engine_code} | ${v.year_start}-${v.year_end}`),
      });
      continue;
    }

    // tie grouping by (db identity, engine family) — generation dropped
    const tieGroups = new Map();
    for (const p of passing) {
      const key = JSON.stringify([...p.dbC.identity].sort()) + '|' + engineFamily(p.v.engine_code);
      if (!tieGroups.has(key)) tieGroups.set(key, []);
      tieGroups.get(key).push(p);
    }

    if (tieGroups.size === 1) {
      for (const p of passing) {
        results.push({
          sku: g.sku, variant_id: p.v.id,
          csv: `${g.make} | ${g.model} | ${g.gen} | ${g.eng} | ${y0}-${y1}`,
          db: `${p.v.model} | ${p.v.generation} | ${p.v.engine_code} | ${p.v.year_start}-${p.v.year_end}`,
        });
      }
    } else {
      reviewAmbiguous.push({
        sku: g.sku,
        csv: `${g.make} | ${g.model} | ${g.gen} | ${g.eng} | ${y0}-${y1}`,
        groups: [...tieGroups.values()].map(grp => [...new Set(grp.map(p => p.v.model + ' | ' + p.v.generation + ' | ' + p.v.engine_code))]),
      });
    }
  }

  const matchedGroups = new Set(results.map(r => r.sku + '|' + r.csv));
  console.log(`LINKS ${results.length} | groups matched ${matchedGroups.size}/${groups.size} | unmatched ${unmatchedLog.length} | ambiguous-review ${reviewAmbiguous.length}`);
  console.log('dt-fallback groups:', dtFallbackUsed);

  fs.writeFileSync(SCRATCH + '/funk_fitment_results.json', JSON.stringify(results, null, 1));
  fs.writeFileSync(SCRATCH + '/funk_fitment_unmatched.json', JSON.stringify(unmatchedLog, null, 1));
  fs.writeFileSync(SCRATCH + '/funk_fitment_ambiguous.json', JSON.stringify(reviewAmbiguous, null, 1));
  fs.writeFileSync(SCRATCH + '/funk_broad_rows.json', JSON.stringify(broadRows, null, 1));

  const byMakeUn = {};
  for (const u of unmatchedLog) { const mk = u.csv.split(' | ')[0]; byMakeUn[mk] = (byMakeUn[mk] || 0) + 1; }
  console.log('unmatched groups by make:', JSON.stringify(byMakeUn));
  const failAgg = {};
  for (const u of unmatchedLog) {
    for (const [k, n] of Object.entries(u.fails || {})) failAgg[k] = (failAgg[k] || 0) + n;
  }
  console.log('gate failure totals:', JSON.stringify(failAgg));

  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
