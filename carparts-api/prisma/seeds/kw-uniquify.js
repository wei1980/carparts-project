// prisma/seeds/kw-uniquify.js — KW 相容連結台規唯一化：一台車 × 一個型號線 = 一個料號
// 用法：node prisma/seeds/kw-uniquify.js [--apply]
//   預設 --dry 只報告；--apply 才 wipe+重建 KW 相容連結
// 規則：
//   1) 依品名分 9 條型號線（V1~V4/Clubsport/Street Comfort/DDC ECU/DDC Plug&Play/短彈簧）
//   2) 每組 (vehicle, line) 若多個 SKU：先用 CSV 括號內車體形式（四門/五門/敞篷/雙門）對應 DB model 關鍵字消歧，
//      再用年份覆蓋收斂；仍無法唯一 → 全組不連，寫入 kw_manual_review.csv 待人工裁決
//   3) 所有候選都有車體資訊但都不符該車 → 全組不連（本來就不適配）
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const CSV_PATH = 'C:/Users/User/Dropbox/公司資料/車大師/資料庫/parts_upload_KW.csv';
const BRAND = 'KW Suspensions';

function lineOf(name) {
  const n = name || '';
  if (n.includes('短彈簧')) return '高低可調短彈簧';
  if (n.includes('Clubsport')) return 'Clubsport';
  if (n.includes('Street Comfort')) return 'Street Comfort';
  if (n.includes('DDC ECU')) return 'DDC ECU';
  if (n.includes('Plug & Play') || n.includes('Plug &Play')) return 'DDC Plug&Play';
  const v = n.match(/KW\s+(V[1-4])/);
  return v ? v[1] : null;
}

function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else {
      if (ch === '"') q = true;
      else if (ch === ',') { row.push(f); f = ''; }
      else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
      else f += ch;
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function parseYears(s) {
  const t = (s || '').trim(); if (!t) return { ys: null, ye: null };
  let m;
  if ((m = t.match(/^(\d{4})-(\d{4})$/))) return { ys: +m[1], ye: +m[2] };
  if ((m = t.match(/^(\d{4})-/))) return { ys: +m[1], ye: null };
  if ((m = t.match(/^-(\d{2})\/(\d{2})$/))) return { ys: null, ye: 2000 + +m[2] };
  if ((m = t.match(/^-(\d{4})$/))) return { ys: null, ye: +m[1] };
  if ((m = t.match(/^(\d{4})$/))) return { ys: +m[1], ye: +m[1] };
  return { ys: null, ye: null };
}

const ROMAN = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8' };
const PLAT_ALIAS = { '1J': ['MK4'], '1K': ['MK5', 'MK6'], '1KM': ['MK6', 'MK7'], '5K': ['MK7'], '5KM': ['MK7.5'], 'AU': ['MK8'], 'CD': ['MK8'], 'BW': ['MK2'] };

function parseVehicleField(raw) {
  const head = raw.split('（')[0];
  const bases = [], codes = [];
  const parenRe = /\(([^)]*)\)/g; let m;
  const headNoParen = head.replace(parenRe, (_, inner) => {
    inner.split(/[,/]/).forEach(x => {
      const c = x.trim().toUpperCase();
      if (/^[A-Z]?\d{1,2}[A-Z]?$/.test(c) && c.length <= 4) codes.push(c);
      else if (/^[A-Z]\d[A-Z]$/.test(c)) codes.push(c);
    });
    return ' ';
  });
  headNoParen.split(',').forEach(tok => {
    let t = tok.trim();
    if (!t) return;
    const rm = t.match(/\b([IVX]+)\b\s*$/);
    if (rm && ROMAN[rm[1]]) {
      const n = ROMAN[rm[1]];
      t = t.replace(rm[0], '').trim();
      if (/^(golf|polo|jetta|scirocco|touran)$/i.test(t)) codes.push('MK' + n);
    }
    t = t.replace(/\b(variant|alltrack|cross)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (t) bases.push(t);
  });
  return { bases, codes: [...new Set(codes)] };
}

// 車體形式限定詞：CSV 用語 → DB model 關鍵字
const BODY_RULES = [
  [/四門|Lim\.|Limousine|Stufenheck|Saloon|\bSedan/i, ['sedan', 'saloon']],
  [/五門|Avant|Kombi|Touring|Variant|Sportbreak|Estate|\bWagon|Caravan|Combi/i, ['sportback', 'avant', 'touring', 'variant', 'wagon', 'estate', 'sportbreak', 'combi', 'hatchback']],
  [/敞篷|Cabrio|Convertible|Roadster|DHC/i, ['cabrio', 'cabriolet', 'convertible', 'roadster']],
  [/雙門|Coup[eé]/i, ['coupe']],
];
function csvBodyTokens(rawField) {
  const keys = new Set();
  for (const [re, dbs] of BODY_RULES) if (re.test(rawField)) dbs.forEach(d => keys.add(d));
  return keys;
}
function dbBodyKeys(model) {
  const m = (model || '').toLowerCase();
  const keys = new Set();
  for (const [, dbs] of BODY_RULES) dbs.forEach(d => { if (m.includes(d)) keys.add(d); });
  return keys;
}

const genKeysOf = g => {
  const s = String(g || '').toUpperCase().trim();
  if (!s) return [];
  const keys = [s];
  const m = s.match(/^([A-Z]?\d{1,2}[A-Z]?)\b/) || s.match(/^(MK[\d.]+)\b/);
  if (m && m[1] !== s) keys.push(m[1]);
  return keys;
};

(async () => {
  console.log(`== KW 台規唯一化（${APPLY ? 'APPLY' : 'DRY'}）==`);
  // ---- 讀 CSV ----
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  const header = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const data = rows.slice(1).filter(r => r.length >= header.length && r[idx['SKU']]?.trim());

  // ---- Parts lookup（sku → id/name/line）----
  const kwParts = await prisma.part.findMany({ where: { brand: BRAND }, select: { id: true, sku: true, name: true } });
  const skuInfo = {};
  kwParts.forEach(p => { skuInfo[p.sku] = p; });

  // ---- Variants 快取 ----
  const csvMakes = [...new Set(data.map(r => r[idx['廠牌']].trim()).filter(Boolean))];
  const variantCache = {}, genSets = {}, vehById = {};
  for (const mk of csvMakes) {
    const vs = await prisma.vehicleVariant.findMany({
      where: { make: { equals: mk, mode: 'insensitive' } },
      select: { id: true, model: true, generation: true, year_start: true, year_end: true },
    });
    variantCache[mk] = vs.map(v => ({ id: v.id, model: v.model || '', genKeys: genKeysOf(v.generation), ys: v.year_start ?? 1900, ye: v.year_end ?? 2100 }));
    genSets[mk] = new Set(variantCache[mk].flatMap(v => v.genKeys));
    variantCache[mk].forEach(v => { vehById[v.id] = v; });
  }

  // ---- 匹配（含車體/年份標記）→ 收集 (vehicle,line) 候選 ----
  const candMap = new Map(); // key: vehId|line → Map(skuId → {sku, hasBody, bodyMatch, hasYear, yearCover})
  let matchedRows = 0;
  for (const r of data) {
    const sku = r[idx['SKU']].trim();
    const make = r[idx['廠牌']].trim();
    const vfRaw = r[idx['車型']] || '';
    const info = skuInfo[sku];
    if (!info || !make || !vfRaw.trim()) continue;
    const line = lineOf(info.name);
    if (!line) continue;
    const { ys, ye } = parseYears(r[idx['年份']]);
    const pool = variantCache[make] || [];
    const gens = genSets[make] || new Set();
    const vf = parseVehicleField(vfRaw);

    let seriesPrefix = null;
    const sm = vfRaw.match(/\b(\d)\s*(?:er\b|-\s*series|series)/i);
    if (sm) seriesPrefix = `${sm[1]}-Series`;
    let nameCands = [];
    if (seriesPrefix) nameCands = pool.filter(v => v.model.toLowerCase().startsWith(seriesPrefix.toLowerCase()));
    if (!nameCands.length) {
      for (const base of vf.bases) {
        const b = base.toLowerCase();
        const hit = pool.filter(v => v.model.toLowerCase() === b || v.model.toLowerCase().startsWith(b + ' '));
        if (hit.length) { nameCands = nameCands.concat(hit); break; }
      }
    }
    const validCodes = vf.codes.filter(c => gens.has(c));
    let cand = [];
    if (validCodes.length) {
      const allowed = new Set(validCodes.flatMap(c => [c, ...(PLAT_ALIAS[c] || []).map(x => x.toUpperCase())]));
      const codeCands = pool.filter(v => v.genKeys.some(k => allowed.has(k)));
      if (nameCands.length) {
        const inter = nameCands.filter(v => v.genKeys.some(k => allowed.has(k)));
        cand = inter.length ? inter : codeCands;
      } else cand = codeCands;
    } else cand = nameCands;
    if (!cand.length) continue;

    const bodyCsv = csvBodyTokens(vfRaw);
    const hasYear = ys !== null || ye !== null;
    for (const v of cand) {
      // 年份過濾（列有年份時）
      if (hasYear) {
        let cover;
        if (ys !== null && ye !== null) cover = !(ye < v.ys || ys > v.ye);
        else if (ys !== null) cover = ys <= v.ye;
        else cover = v.ys <= (ye ?? 2100);
        if (!cover) continue; // 列年份明確不含此車 → 此列對此車不算候選
      }
      matchedRows++;
      const k = `${v.id}|${line}`;
      if (!candMap.has(k)) candMap.set(k, new Map());
      const m = candMap.get(k);
      const dbKeys = dbBodyKeys(v.model);
      const hasBody = bodyCsv.size > 0;
      const bodyMatch = hasBody && dbKeys.size > 0 && [...bodyCsv].some(d => dbKeys.has(d));
      const ex = m.get(info.id);
      const yearCover = !hasYear ? false : (ys !== null && ye !== null ? !(ye < v.ys || ys > v.ye) : ys !== null ? ys <= v.ye : v.ys <= (ye ?? 2100));
      // 驅動方式訊號：CSV 列同時標 2WD+4WD 視為無約束
      const has4 = /4WD|quattro|AWD|四輪驅動|全輪驅動/i.test(vfRaw);
      const has2 = /(?:^|[^0-9])2WD|前輪驅動/i.test(vfRaw);
      const drive = has4 && has2 ? null : has4 ? '4wd' : has2 ? '2wd' : null;
      if (!ex) m.set(info.id, { sku, hasBody, bodyMatch, hasYear, yearCover, drive });
      else { // 同一 SKU 多列：合併取最強訊號
        ex.bodyMatch = ex.bodyMatch || bodyMatch;
        ex.yearCover = ex.yearCover || yearCover;
        ex.hasYear = ex.hasYear || hasYear;
        if (ex.drive === undefined || ex.drive === null) ex.drive = drive; // 有明確標記就保留
      }
    }
  }
  console.log('匹配列次(含車體/年份標記):', matchedRows);
  console.log('(vehicle,line) 配對總數:', candMap.size);

  // ---- 唯一化裁決 ----
  const winners = []; // {part_id, vehicle_id}
  let single = 0, resolvedByBody = 0, resolvedByYear = 0;
  const ambiguous = [], noFit = [];
  for (const [k, m] of candMap) {
    const [vidStr, line] = k.split('|');
    const vid = +vidStr;
    const cands = [...m.values()];
    if (cands.length === 1) { single++; winners.push({ part_id: Object.values(skuInfo).find(p => p.sku === cands[0].sku)?.id, vehicle_id: vid }); continue; }
    let f = cands;
    const anyBodyMatch = f.some(c => c.bodyMatch);
    const anyHasBody = f.some(c => c.hasBody);
    if (anyBodyMatch) f = f.filter(c => c.bodyMatch);           // 有車體命中者優先
    else if (anyHasBody) { noFit.push({ vid, line, cands }); continue; } // 全有車體資訊但皆不符 → 不適配

    // 驅動方式消歧：DB model 含 quattro/4motion/xdrive 等 → 取 4WD 候選；反之取 2WD 候選（有分化才收斂）
    if (f.length > 1) {
      const vehM = (vehById[vid]?.model || '').toLowerCase();
      const vehIs4 = /quattro|4motion|4matic|xdrive|\bawd\b|4wd/.test(vehM);
      const marked4 = f.filter(c => c.drive === '4wd');
      const marked2 = f.filter(c => c.drive === '2wd');
      let pick = [];
      if (vehIs4 && marked4.length && marked4.length < f.length) pick = marked4;
      else if (!vehIs4 && marked2.length && marked4.length && marked2.length < f.length) pick = marked2;
      if (pick.length) f = pick;
    }

    if (f.length > 1) {
      const anyCover = f.some(c => c.yearCover);
      if (anyCover) { const g = f.filter(c => c.yearCover); if (g.length < f.length) f = g; }
    }
    if (f.length === 1) {
      resolvedByBody++;
      winners.push({ part_id: Object.values(skuInfo).find(p => p.sku === f[0].sku)?.id, vehicle_id: vid });
    } else {
      ambiguous.push({ vid, line, cands: f });
    }
  }
  console.log('\n--- 裁決統計 ---');
  console.log(`單候選直接保留: ${single}`);
  console.log(`多候選成功消歧(車體/年份): ${resolvedByBody}`);
  console.log(`無法唯一 → 全組不連待人工: ${ambiguous.length} 組`);
  console.log(`車體皆不符 → 不連: ${noFit.length} 組`);
  console.log(`唯一化後連結數: ${winners.filter(w => w.part_id).length}`);

  // 未匹配樣本輸出
  const vehLabel = vid => { const v = vehById[vid]; return v ? `${v.model}` : '#' + vid; };
  console.log('\n=== 待人工樣本（前10）===');
  ambiguous.slice(0, 10).forEach(a => console.log(`[${a.line}] ${vehLabel(a.vid)} ← ${a.cands.map(c => c.sku).join(', ')}`));

  if (!APPLY) { console.log('\n(DRY 完成——加 --apply 執行 wipe+重建)'); await prisma.$disconnect(); return; }

  // ---- 寫入：wipe KW 全部相容 → 重建 winners ----
  const del = await prisma.partCompatibility.deleteMany({ where: { part: { brand: BRAND } } });
  console.log('\n已刪除舊 KW 相容:', del.count);
  const pairs = winners.filter(w => w.part_id).map(w => ({ part_id: w.part_id, vehicle_id: w.vehicle_id }));
  let ins = 0;
  for (let i = 0; i < pairs.length; i += 1000) {
    const res = await prisma.partCompatibility.createMany({ data: pairs.slice(i, i + 1000), skipDuplicates: true });
    ins += res.count;
  }
  console.log('重建連結:', ins);

  // ---- 人工裁決清單 CSV ----
  const csvLines = ['車輛ID,廠牌,車型,世代,型號線,候選SKU'];
  for (const a of ambiguous) {
    const v = vehById[a.vid];
    csvLines.push([a.vid, '', `"${v?.model || ''}"`, `"${v?.genKeys?.join('/') || ''}"`, a.line, `"${a.cands.map(c => c.sku).join(', ')}"`].join(','));
  }
  fs.writeFileSync(path.join(__dirname, 'kw_manual_review.csv'), '\uFEFF' + csvLines.join('\n'));
  console.log('人工裁決清單已寫入 prisma/seeds/kw_manual_review.csv（', ambiguous.length, '組 ）');

  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
