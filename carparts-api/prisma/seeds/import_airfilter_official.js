/**
 * Import air filter compatibility from official Big5 CSV.
 * Modeled after kw-uniquify.js: platform code priority, performance keyword must match,
 * year range parsing, plus engine/displacement/horsepower disambiguation.
 * 
 * Usage:
 *   node import_airfilter_official.js          // dry run
 *   node import_airfilter_official.js --apply  // wipe & rebuild
 *   node import_airfilter_official.js --trace=Golf Mk7
 *   node import_airfilter_official.js --only=KN
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// ==== CONFIG ====
const OFFICIAL_CSV = path.resolve(__dirname, '../../attachments/空濾車型關係表_20260805-2.csv');
const BRANDS = ['KN', 'BMC', 'Pipercross']; // filter brands to process
const SUBCATEGORY_NAME = '濾芯'; // subcategory name for filter
const MANUAL_CSV = path.resolve(__dirname, 'airfilter_manual_review.csv');
const MISSING_CSV = path.resolve(__dirname, 'airfilter_missing_skus.csv');

// ==== HELPERS ====
function readBig5CSV(filepath) {
  const buffer = fs.readFileSync(filepath);
  let content;
  try {
    content = buffer.toString('utf8');
  } catch (e) {
    const iconv = require('iconv-lite');
    content = iconv.decode(buffer, 'Big5');
  }
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    header.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i].trim() : ''; });
    return obj;
  });
  return { header, rows };
}

// Make alias normalization (Mini (BMW) -> Mini, etc.)
const MAKE_ALIASES = {
  'Mini (BMW)': 'Mini',
  // add more as needed
};
function normalizeMake(make) {
  return MAKE_ALIASES[make] || make;
}

// Platform code extraction (e.g., 8P, Mk7, F48, etc.) from model string
function extractPlatformCode(model) {
  if (!model) return null;
  const m = model.toUpperCase().match(/\b(8[PV]|\d{2}[A-Z]?|Mk\d|F\d\d|[A-Z]\d{2})\b/);
  return m ? m[0] : null;
}

// Performance keyword list (from KW matcher)
const PERF_KEYWORDS = ['GTI', 'R', 'GTD', 'TD', 'TSI', 'TFSi', 'TFSI', 'Sport', 'RS', 'S', 'Linea', 'Amg', 'M'];
function hasPerformanceKeyword(str) {
  if (!str) return false;
  const up = str.toUpperCase();
  return PERF_KEYWORDS.some(k => up.includes(k));
}

// Year range parsing: "MM/YY - MM/YY" or single year? In CSV Year is like "17-26"
function parseYearRange(yearStr) {
  if (!yearStr) return { start: null, end: null };
  const parts = yearStr.split('-').map(p => p.trim());
  if (parts.length !== 2) {
    // single year?
    const y = parseYear(parts[0]);
    return { start: y, end: y };
  }
  const start = parseYear(parts[0]);
  const end = parseYear(parts[1]);
  return { start, end };
}
function parseYear(yStr) {
  // supports YY or YYYY
  if (!yStr) return null;
  const m = yStr.match(/(\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[1], 10);
  if (yStr.length === 2) {
    // assume 1900+ if >=70 else 2000+
    y = y < 70 ? 2000 + y : 1900 + y;
  }
  return y;
}

// Disambiguation using specs JSON (displacement, horsepower)
function parseSpecs(specsJson) {
  if (!specsJson) return {};
  try {
    const specs = typeof specsJson === 'string' ? JSON.parse(specsJson) : specsJson;
    const disp = specs.displacement || specs.cc || null;
    const hp = specs.horsepower || specs.hp || null;
    // convert displacement to cc if needed
    let dispCc = null;
    if (typeof disp === 'string') {
      const m = disp.toLowerCase().match(/([\d.]+)\s*([lL])/);
      if (m) {
        dispCc = Math.round(parseFloat(m[1]) * 1000);
      } else {
        const m2 = disp.toLowerCase().match(/([\d]+)\s*cc/);
        if (m2) dispCc = parseInt(m2[1], 10);
        else dispCc = parseInt(disp, 10) || null;
      }
    } else if (typeof disp === 'number') {
      dispCc = disp;
    }
    let hpNum = null;
    if (typeof hp === 'string') {
      const m = hp.match(/^(\d+)/);
      if (m) hpNum = parseInt(m[1], 10);
    } else if (typeof hp === 'number') {
      hpNum = hp;
    }
    return { displacement: dispCc, horsepower: hpNum };
  } catch (e) {
    return {};
  }
}

// Main matching function for a single vehicle variant
async function matchAirFilterForVariant(variant, csvRows) {
  const makeNorm = normalizeMake(variant.make);
  const model = variant.model || '';
  const yearStart = variant.year_start;
  const yearEnd = variant.year_end;
  const specs = variant.specs || {};
  const specObj = parseSpecs(specs);
  const vehDisp = specObj.displacement;
  const vehHp = specObj.horsepower;
  const platformCode = extractPlatformCode(model);
  const perfRequired = hasPerformanceKeyword(model) ||
                       hasPerformanceKeyword((variant.engine_code || '').toString()) ||
                       hasPerformanceKeyword(vehHp ? vehHp.toString() : '');

  // gather candidates per brand
  const candidates = {}; // brand -> {partNumber: count}
  for (const row of csvRows) {
    const csvMake = normalizeMake(row.Makes || '');
    if (csvMake !== makeNorm) continue;
    const csvModel = row.Model || '';
    if (!csvModel || !model) continue;
    // simple containment both ways (could be more strict)
    if (!model.toUpperCase().includes(csvModel.toUpperCase()) && !csvModel.toUpperCase().includes(model.toUpperCase())) continue;
    // Generation optional: if CSV has generation, it should match variant.generation (if present)
    const csvGen = row.Generation || '';
    const vehGen = variant.generation || '';
    if (csvGen && vehGen && csvGen.toUpperCase() !== vehGen.toUpperCase()) continue;
    // Year range overlap
    const csvRange = parseYearRange(row.Year || '');
    if (!yearOverlap(csvRange, { start: yearStart, end: yearEnd })) continue;
    // Engine/displacement/horsepower disambiguation: compare CSV columns with variant specs
    const csvEngine = row.Engine || '';
    const csvDispStr = row.Displacement || '';
    const csvHpStr = row.Horsepower || '';
    // If CSV has engine, we could check keyword match? For simplicity, we require that if CSV has performance keyword, variant must also have it (or vice versa?) We'll use the perfRequired logic already.
    // Displacement comparison
    const csvDisp = parseSpecs({ displacement: csvDispStr }).displacement;
    const csvHp = parseSpecs({ horsepower: csvHpStr }).horsepower;
    if (csvDisp !== null && vehDisp !== null && Math.abs(csvDisp - vehDisp) > 150) continue;
    if (csvHp !== null && vehHp !== null && Math.abs(csvHp - vehHp) > 20) continue;
    // Engine string maybe contains performance keywords; we already checked perfRequired via csvPerf? We'll compute csvPerf from CSV row.
    const csvPerf = hasPerformanceKeyword(csvEngine) ||
                    hasPerformanceKeyword(csvDispStr) ||
                    hasPerformanceKeyword(csvHpStr);
    if (perfRequired && !csvPerf) continue;
    // For each brand, if part number present, add candidate
    for (const brand of BRANDS) {
      const part = row[brand] || '';
      if (!part) continue;
      if (!candidates[brand]) candidates[brand] = {};
      candidates[brand][part] = (candidates[brand][part] || 0) + 1;
    }
  }
  // Determine winner per brand: max count
  const result = {};
  for (const b of BRANDS) {
    const cand = candidates[b];
    if (!cand || Object.keys(cand).length === 0) {
      result[b] = null;
      continue;
    }
    let maxPart = null;
    let maxCount = -1;
    for (const [p, c] of Object.entries(cand)) {
      if (c > maxCount) {
        maxCount = c;
        maxPart = p;
      }
    }
    const ties = Object.entries(cand).filter(([_, c]) => c === maxCount);
    if (ties.length > 1) {
      result[b] = { tie: true, candidates: ties.map(([p]) => p), count: maxCount };
    } else {
      result[b] = { part: maxPart, count: maxCount };
    }
  }
  return result;
}
function yearOverlap(r1, r2) {
  if (!r1.start && !r1.end && !r2.start && !r2.end) return true;
  const aStart = r1.start !== null ? r1.start : -Infinity;
  const aEnd = r1.end !== null ? r1.end : Infinity;
  const bStart = r2.start !== null ? r2.start : -Infinity;
  const bEnd = r2.end !== null ? r2.end : Infinity;
  return !(aEnd < bStart || bEnd < aStart);
}

// ==== MAIN ====
(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const traceArg = args.find(a => a.startsWith('--trace='));
  const trace = traceArg ? traceArg.split('=')[1].toUpperCase() : null;
  const onlyArg = args.find(a => a.startsWith('--only='));
  const onlyBrand = onlyArg ? onlyArg.split('=')[1].toUpperCase() : null;

  console.log(`Loading official CSV from ${OFFICIAL_CSV}...`);
  const { rows: officialRows } = readBig5CSV(OFFICIAL_CSV);
  console.log(`Official rows: ${officialRows.length}`);

  // fetch vehicle variants
  const variants = await prisma.vehicleVariant.findMany({
    select: {
      id: true,
      make: true,
      model: true,
      generation: true,
      engine_code: true,
      variant_name: true,
      year_start: true,
      year_end: true,
      specs: true
    }
  });
  console.log(`Loaded ${variants.length} variants from DB.`);

  // fetch parts that are in filter subcategory and brands of interest
  const filterParts = await prisma.part.findMany({
    where: {
      brand: { in: BRANDS },
      subcategory: { name: SUBCATEGORY_NAME }
    },
    select: { id: true, sku: true, brand: true }
  });
  // map brand+sku -> part.id for quick lookup
  const partsMap = new Map();
  for (const p of filterParts) {
    partsMap.set(`${p.brand}|${p.sku}`, p.id);
  }
  console.log(`Found ${filterParts.length} filter parts for brands ${BRANDS.join(', ')}.`);

  const manualRows = [];
  const missingSet = new Set();
  const updateCounts = { KN: 0, BMC: 0, Pipercross: 0 };
  const wipeCounts = { KN: 0, BMC: 0, Pipercross: 0 };

  if (apply) {
    // wipe existing compatibility for filter subcategory for these brands
    const delResult = await prisma.partCompatibility.deleteMany({
      where: {
        part: {
          subcategory: { name: SUBCATEGORY_NAME },
          brand: { in: BRANDS }
        }
      }
    });
    console.log(`Wiped ${delResult.count} compatibility rows for brands ${BRANDS.join(', ')}.`);
    // Note: deleteMany returns count, not per brand. We'll just log total.
  }

  for (const v of variants) {
    if (onlyBrand && v.make.toUpperCase() !== onlyBrand) continue;
    const matchResult = await matchAirFilterForVariant(v, officialRows);
    // trace
    if (trace && (v.model.toUpperCase().includes(trace) || v.make.toUpperCase().includes(trace))) {
      console.log(`TRACE ${v.make} ${v.model} (${v.variantId}):`, JSON.stringify(matchResult, null, 2));
    }
    // process each brand
    for (const brand of BRANDS) {
      const res = matchResult[brand];
      if (!res) continue;
      if (res.tie) {
        manualRows.push({
          variantId: v.id,
          make: v.make,
          model: v.model,
          startYear: v.year_start,
          endYear: v.year_end,
          brand,
          candidates: res.candidates.join(';'),
          count: res.count
        });
        continue;
      }
      const partNumber = res.part; // this is the sku from CSV
      const partKey = `${brand}|${partNumber}`;
      const partId = partsMap.get(partKey);
      if (!partId) {
        missingSet.add(partKey);
        continue;
      }
      if (apply) {
        // Since we wiped all existing, we can just create
        await prisma.partCompatibility.upsert({
          where: {
            part_id_vehicle_id: {
              part_id: partId,
              vehicle_id: v.id
            }
          },
          update: {},
          create: {
            part_id: partId,
            vehicle_id: v.id
          }
        });
        updateCounts[brand] = (updateCounts[brand] || 0) + 1;
      }
    }
  }

  if (apply) {
    console.log('Update counts:', updateCounts);
  }

  // write manual review CSV
  const manualHeader = ['variantId','make','model','startYear','endYear','brand','candidates','count'];
  const manualContent = [manualHeader.join(',')];
  for (const r of manualRows) {
    manualContent.push([
      r.variantId,
      `"${r.make}"`,
      `"${r.model}"`,
      r.startYear,
      r.endYear,
      r.brand,
      `"${r.candidates}"`,
      r.count
    ].join(','));
  }
  fs.writeFileSync(MANUAL_CSV, manualContent.join('\n'), { encoding: 'utf8' });
  console.log(`Manual review CSV written: ${MANUAL_CSV} (${manualRows.length} rows)`);

  // write missing skus CSV
  const missingHeader = ['brand','partNumber'];
  const missingContent = [missingHeader.join(',')];
  for (const entry of missingSet) {
    const [brand, part] = entry.split('|');
    missingContent.push([brand, part].join(','));
  }
  fs.writeFileSync(MISSING_CSV, missingContent.join('\n'), { encoding: 'utf8' });
  console.log(`Missing SKUs CSV written: ${MISSING_CSV} (${missingSet.size} rows)`);

  await prisma.$disconnect();
})();