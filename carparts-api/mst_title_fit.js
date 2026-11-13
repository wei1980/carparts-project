// MST 13 個缺失 SKU：從產品標題合成適配記錄 → 匹配器 → 補相容連結 + 修正 is_universal
// 乾跑：node mst_title_fit.js --dry；執行：node mst_title_fit.js --apply
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const deAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = s => deAccent(String(s)).toUpperCase().replace(/\s+/g, '');
const MAKE_MAP = { 'TOYOTA': 'Toyota', 'VOLKSWAGEN': 'Volkswagen' };
const normMake = m => MAKE_MAP[norm(m)] || deAccent(String(m || '').trim());
const TRIM_RE = /\s*(xDrive|AWD|4Matic|4MATIC|quattro|Competition|Touring|Convertible|Gran Coupe|Gran Turismo|Sport Line|Luxury Line|M Sport|Shooting Brake)\s*$/gi;
function cleanModel(m) {
  let s = deAccent(String(m || '').trim());
  s = s.replace(/\s*\([^)]*\)/g, '');
  const mm = s.match(/^(.*?)\s*[A-Z]{1,2}\d{1,3}$/);
  if (mm && mm[1].trim()) s = mm[1].trim();
  let prev;
  do { prev = s; s = s.replace(TRIM_RE, ''); } while (s !== prev);
  return s.trim();
}
function extractGenCode(m) {
  const pm = String(m || '').match(/\(([^)]*)\)/);
  if (!pm) return null;
  const gm = pm[1].match(/([A-Z]{1,2}\d{1,3})/);
  return gm ? gm[1] : null;
}
const BMW_SERIES = {
  '1SERIES': /^1\d{3}/, '2SERIES': /^2\d{3}/, '3SERIES': /^3\d{3}/,
  '4SERIES': /^4\d{3}/, '5SERIES': /^5\d{3}/, '6SERIES': /^6\d{3}/,
  '7SERIES': /^7\d{3}/, '8SERIES': /^8\d{3}/,
};
const VAG_MAP = {
  '1.0TSI': ['EA211 evo', 'EA211'], '1.2TSI': ['EA111'], '1.4TSI': ['EA111', 'EA211'],
  '1.5TSI': ['EA211 evo'], '1.6TSI': ['EA111'], '1.8TFSI': ['EA888'], '1.8TSI': ['EA888'],
  '2.0TFSI': ['EA888', 'EA113'], '2.0TSI': ['EA888', 'EA211 evo', 'EA211'],
  '2.5TSI': ['EA855', 'EA855 evo'], '3.0TSI': ['EA839', 'EA837'], '3.0TFSI': ['EA839', 'EA837'],
  '1.4TDI': ['EA288'], '1.6TDI': ['EA189', 'EA288'], '1.9TDI': ['EA188', 'EA189', 'EA288'],
  '2.0TDI': ['EA188', 'EA189', 'EA288'], '3.0TDI': ['EA897'],
  '1.6': ['EA113', 'EA211'], '1.8': ['EA888', 'EA113'], '2.0': ['EA888', 'EA211', 'EA288', 'EA113'],
  '3.2VR6': ['BUH', 'EA390'], '3.6VR6': ['BWS'], '2.0FSI': ['EA113'], '1.6FSI': ['EA113'],
};
function engineSignals(engine) {
  const e = deAccent(String(engine || '').trim()).toUpperCase();
  if (!e) return { family: null, vagKey: null, disp: null, tToken: null };
  const fam = e.match(/\b([BNSM]\d{2,3})\b/);
  const vagM = e.match(/(\d\.\d)\s?(TSI|TFSI|TDI|FSI|VR6)/);
  const disp = e.match(/(\d\.\d)/);
  const tTok = e.match(/\b([TD]\d|B\dR)\b/);
  return { family: fam ? fam[1] : null, vagKey: vagM ? vagM[1] + vagM[2] : null, disp: disp ? disp[1] : null, tToken: tTok ? tTok[1] : null };
}
function modelMatch(v, myModel, make, isBMW) {
  const nm = norm(v.model);
  const mk1 = norm(myModel);
  const mk2 = norm(make.split(' ')[0] + ' ' + myModel);
  if (mk1 && nm.startsWith(mk1)) return true;
  if (mk2 && mk2 !== mk1 && nm.startsWith(mk2)) return true;
  if (isBMW && ((BMW_SERIES[mk1] && BMW_SERIES[mk1].test(nm)) || (BMW_SERIES[mk2] && BMW_SERIES[mk2].test(nm)))) return true;
  const tok = s => deAccent(s).toUpperCase().split(/[^A-Z0-9.]+/).filter(Boolean);
  const mt = tok(myModel), dt = tok(v.model);
  if (mt.length && dt.length && mt[0] === dt[0] && mt.every(t => dt.includes(t))) return true;
  return false;
}

// ===== 從標題合成的適配記錄（标题 → Make/Model/Year/Engine）=====
const T = (SKU, Make, Model, Year, Engine) => ({ SKU, Make, Model, Year, Engine });
const synth = [
  // TY-GRY06B-1 / TY-GRY06R-1：MST 進氣套件 2020+ 豐田 GR Yaris 1.6
  ...[2020, 2021, 2022, 2023, 2024, 2025, 2026].flatMap(y => [
    T('TY-GRY06B-1', 'Toyota', 'GR Yaris', y, '1.6'),
    T('TY-GRY06R-1', 'Toyota', 'GR Yaris', y, '1.6'),
  ]),
  // BW-G90M5-S：MST 進氣套件 2024+ BMW G90 M5/ G99 M5 S68 4.4L
  ...[2024, 2025, 2026].map(y => T('BW-G90M5-S', 'BMW', 'M5', y, 'S68 4.4L')),
  // VW-MK706 / VW-MK707L：MST 進氣套件 2015 VW Golf MK7 1.4 TSI（同系 VW-MK706L myData 為 2014-2019）
  ...[2014, 2015, 2016, 2017, 2018, 2019].flatMap(y => [
    T('VW-MK706', 'Volkswagen', 'Golf', y, '1.4 TSI'),
    T('VW-MK707L', 'Volkswagen', 'Golf', y, '1.4 TSI'),
  ]),
  // BW-N1301：MST 進氣套件 BMW N13 1.6 F20/F21/F30/F31（DB myData Model 為車型名：116i/118i/120i F20、316i F30）
  ...[2011, 2012, 2013, 2014, 2015].map(y => T('BW-N1301', 'BMW', '116i', y, 'N13 1.6')),
  ...[2011, 2012, 2013, 2014, 2015].map(y => T('BW-N1301', 'BMW', '118i', y, 'N13 1.6')),
  ...[2015].map(y => T('BW-N1301', 'BMW', '120i', y, 'N13 1.6')),
  ...[2012, 2013, 2014, 2015].map(y => T('BW-N1301', 'BMW', '316i', y, 'N13 1.6')),
  // FO-MK309F：MST 香菇頭 Focus MK2/3/3.5/KUGA MK2
  ...Array.from({ length: 14 }, (_, i) => 2005 + i).map(y => T('FO-MK309F', 'Ford', 'Focus', y, '')),
  ...Array.from({ length: 6 }, (_, i) => 2013 + i).map(y => T('FO-MK309F', 'Ford', 'Kuga', y, '')),
  // FO-MK402：MST 高流量濾心片 2020+ 福特 Focus MK4 1.5 ST/KUGA 1.5
  ...[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => T('FO-MK402', 'Ford', 'Focus', y, '1.5')),
  ...[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => T('FO-MK402', 'Ford', 'Kuga', y, '1.5')),
  // BW-5809DP：MST 金屬觸媒當派 BMW B58 X3 X4 X5 X6 X7 40i (OPF)
  ...['X3', 'X4', 'X5', 'X6', 'X7'].flatMap(m =>
    Array.from({ length: 9 }, (_, i) => 2018 + i).map(y => T('BW-5809DP', 'BMW', m, y, 'B58'))),
];
// DB 缺口（DB 無此車型，僅修正 is_universal，不建連結）：
// TY-GRC05R-1/TY-GRC05B-1（GR Corolla）、FD-FI102/FD-FI7021（Fiesta MK7/MK7.5）
const DBGAP_SKUS = ['TY-GRC05R-1', 'TY-GRC05B-1', 'FD-FI102', 'FD-FI7021'];
const ALL13 = [...new Set(synth.map(d => d.SKU)), ...DBGAP_SKUS];

(async () => {
  // 13 項零件 ID
  const ph = ALL13.map((_, i) => '$' + (i + 1)).join(',');
  const parts = await prisma.$queryRawUnsafe(
    `SELECT id, sku, name, is_universal FROM parts WHERE sku = ANY(string_to_array($1, ','))`, ALL13.join(','));
  console.log('13 SKU 零件：');
  const partBySku = new Map();
  for (const p of parts) { partBySku.set(p.sku, p); console.log(`  ${p.id}｜${p.sku}｜${p.name}｜uni ${p.is_universal}`); }
  const notFound = ALL13.filter(s => !partBySku.has(s));
  if (notFound.length) { console.log('未找到零件：' + notFound.join(', ')); await prisma.$disconnect(); return; }

  // DB 變體（依 make）
  const makes = [...new Set(synth.map(d => normMake(d.Make)))];
  const ph2 = makes.map((_, i) => '$' + (i + 1)).join(',');
  const variants = await prisma.$queryRawUnsafe(
    `SELECT id, make, model, generation, engine_code, year_start, year_end FROM vehicle_variants WHERE make IN (${ph2})`, ...makes);
  const byMake = new Map();
  for (const v of variants) {
    const key = norm(v.make);
    if (!byMake.has(key)) byMake.set(key, []);
    byMake.get(key).push(v);
  }

  // 匹配（同 scratch_mst_match4.js 邏輯）
  const perSku = new Map();
  const stats = { matched: 0, exact: 0, ext: 0, dbGap: 0, engineReject: 0, fallback: 0 };
  const rejSamples = [];
  for (const d of synth) {
    const sku = d.SKU;
    const make = normMake(d.Make);
    const makeNorm = norm(make);
    const rawModel = deAccent(String(d.Model || '').trim());
    const genCode = extractGenCode(rawModel);
    let model = cleanModel(rawModel);
    if (!model && genCode) model = rawModel;
    const year = parseInt(d.Year);
    const { family, vagKey, disp, tToken } = engineSignals(d.Engine);
    const dbVariants = byMake.get(makeNorm);
    if (!dbVariants) { stats.dbGap++; continue; }
    if (!model || !year) { stats.dbGap++; continue; }
    const modelVariants = dbVariants.filter(v => {
      if (genCode) {
        const g = String(v.generation || '');
        const gHit = g === genCode || g.includes(genCode) || (genCode.length === 3 && g.includes(genCode.slice(0, 2)));
        if (!gHit) return false;
        let m = model;
        const mk = make.split(' ')[0].toUpperCase();
        if (m.toUpperCase().startsWith(mk + ' ')) m = m.slice(mk.length + 1);
        const tok = s => deAccent(s).toUpperCase().split(/[^A-Z0-9.]+/).filter(Boolean);
        const mt = tok(m), dt = tok(v.model);
        return mt.length > 0 && mt.every(t => dt.includes(t));
      }
      return modelMatch(v, model, make, makeNorm === 'BMW');
    });
    let cand = modelVariants.filter(v => year >= v.year_start && year <= v.year_end);
    let mode = 'exact';
    if (!cand.length) {
      const byGen = new Map();
      for (const v of modelVariants) {
        const g = String(v.generation || '?');
        if (!byGen.has(g)) byGen.set(g, { min: Infinity, max: -Infinity, list: [] });
        const info = byGen.get(g);
        info.min = Math.min(info.min, v.year_start);
        info.max = Math.max(info.max, v.year_end);
        info.list.push(v);
      }
      for (const info of byGen.values()) {
        if (year >= info.min - 2 && year <= info.max + 3) cand = cand.concat(info.list);
      }
      if (cand.length) mode = 'ext';
    }
    if (!cand.length) { stats.dbGap++; continue; }
    if (mode === 'exact') stats.exact++; else stats.ext++;
    let hit = [];
    const hasVag = !!(vagKey && VAG_MAP[vagKey]);
    if (hasVag || family) {
      if (hasVag) hit = cand.filter(v => VAG_MAP[vagKey].some(code => deAccent(String(v.engine_code || '')).toUpperCase().startsWith(code.toUpperCase())));
      if (!hit.length && family) hit = cand.filter(v => {
        const ec = deAccent(String(v.engine_code || '')).toUpperCase();
        return ec === family || ec.startsWith(family) || (family.length >= 3 && family.startsWith(ec));
      });
      if (!hit.length) { stats.engineReject++; rejSamples.push(`${sku}｜${d.Make} ${d.Model}｜${d.Year}｜${d.Engine}`); continue; }
      stats.matched++;
    } else {
      if (tToken) {
        const tRe = new RegExp('\\b' + tToken + '\\b', 'i');
        const dDigits2 = disp ? disp.replace('.', '') : null;
        hit = cand.filter(v => {
          if (!tRe.test(deAccent(v.model))) return false;
          if (dDigits2 && v.engine_code && !String(v.engine_code).toUpperCase().includes(dDigits2)) return false;
          return true;
        });
        if (hit.length) stats.matched++; else { stats.engineReject++; continue; }
      }
      if (!hit.length && disp) {
        const dRe = new RegExp('\\b' + disp.replace('.', '\\.'), 'i');
        const dDigits = disp.replace('.', '');
        hit = cand.filter(v => dRe.test(deAccent(v.model)) || (v.engine_code && (String(v.engine_code).toUpperCase().includes(dDigits) || String(v.engine_code).toUpperCase().includes(disp.toUpperCase()))));
      }
      if (hit.length) stats.matched++;
      else { hit = cand; stats.matched++; stats.fallback++; }
    }
    if (!perSku.has(sku)) perSku.set(sku, new Set());
    for (const v of hit) perSku.get(sku).add(v.id);
  }
  console.log(`\n匹配統計：${JSON.stringify(stats)}`);
  if (rejSamples.length) { console.log('引擎拒絕記錄：'); rejSamples.forEach(s => console.log('  ' + s)); }
  console.log('\n各 SKU 連結：');
  const linkRows = [];
  for (const [sku, ids] of [...perSku.entries()].sort()) {
    console.log(`  ${sku}：${ids.size} 變體`);
    for (const vid of ids) linkRows.push([partBySku.get(sku).id, vid]);
  }
  const totalLinks = linkRows.length;
  console.log(`\n總計：${perSku.size} SKU 有連結｜${totalLinks} 相容連結`);
  console.log('DB 缺口 SKU（不建連結）：' + DBGAP_SKUS.join(', '));

  if (!APPLY) {
    console.log('\n[乾跑] 未寫入 DB。加 --apply 套用。');
    await prisma.$disconnect();
    return;
  }
  // 套用：刪除舊連結（若有）→ 插入新連結 → 修正 is_universal
  const partIds13 = ALL13.map(s => partBySku.get(s).id);
  const ph3 = partIds13.map((_, i) => '$' + (i + 1)).join(',');
  const del = await prisma.$queryRawUnsafe(`DELETE FROM part_vehicle_compatibility WHERE part_id IN (${ph3})`, ...partIds13);
  console.log(`刪除舊連結 ${del.rowCount || 0}`);
  let ins = 0;
  for (const [pid, vid] of linkRows) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO part_vehicle_compatibility (part_id, vehicle_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM part_vehicle_compatibility WHERE part_id = $1 AND vehicle_id = $2)`, pid, vid);
    ins++;
  }
  const ph4 = ALL13.map((_, i) => '$' + (i + 1)).join(',');
  await prisma.$queryRawUnsafe(
    `UPDATE parts SET is_universal = false WHERE sku = ANY(string_to_array($1, ','))`, ALL13.join(','));
  console.log(`新增相容連結 ${ins}｜13 SKU is_universal=false 已修正`);
  await prisma.$disconnect();
})();
