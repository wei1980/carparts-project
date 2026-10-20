// 回填 brake_part_fitment.vehicle_id
//
// 為什麼需要：brake_part_fitment 已有「車型 × 碟規格」的完整資料，
// 但 vehicle_id 全是 NULL → 無法把煞車件連到本站車型庫，
// 也就無法讓「依碟規格反查車型」與「依車型查零件」運作。
//
// 這是整個跨廠牌對應迴圈的最後一環：
//   車型 → disc_spec（尺寸）→ brake_spec 群組 → 任何廠牌的同規格零件
//
// 用法：node scripts/backfill_brake_vehicle_ids.cjs [--apply]
//       不加 --apply 為 dry-run（只統計不寫入）
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
const APPLY = process.argv.includes('--apply');
console.log(`[安全閘] 目標資料庫：${dbName}｜模式：${APPLY ? 'APPLY' : 'DRY-RUN'}`);

const prisma = new PrismaClient({ datasources: { db: { url: EFFECTIVE_URL } } });

// ===== 車型名核心 =====
//
// 為什麼不能用 modelIdentity：那是為空氣清單設計的「去數字核心名」，
// 對煞車件會摧毀車型名本身：
//   EBC "A5 B10"            → "B10"   （車型名 A5 被當成數字刪掉，剩底盤碼）
//   EBC "A4 (B7)"           → "(B7)"
//   EBC "Golf V"            → "V"     （羅馬數字世代）
//   DB  "A5 Sedan 2.0 TFSI" → "SEDAN" （Sedan 變成識別碼）
//   DB  "M340i"             → "MI"
//
// 正確做法：抽出「車型名核心」——去掉底盤碼、車身樣式、引擎碼、perf 標記，
// 兩邊都會得到同一個核心（A5 / A4 / Golf / M3 / Passat / C）。
const BODY_STYLE = /\b(sedan|avant|sportback|sportwagon|hatchback|wagon|touring|combi|limousine|coupe|coupé|convertible|cabrio|roadster|spyder|van|crew|double|chassis)\b/gi;
const PERF_MARK = /\b(gti|gt|rs|amg|sti|sportiv|sport|performance|type[\s-]?r|n|quattro|4matic|xdrive|4motion|tdi|tfsi|tsi|fsi|gdi|hdi|cdi|jtd|multijet|dci|hybrid|4wd|4x4|aWD|fwd|rwd)\b/gi;
const ENGINE_TAIL = /\b\d{1,2}\.\d\s*(tsi|tfsi|tdi|fsi|gdi|hdi|cdi|jtd|multijet|dci|petrol|diesel|hybrid|electric)?\b/gi;
const POWER_TAIL = /\b\d{2,3}\s*(ps|kw|hp|bhp)\b/gi;

function modelNameCore(s) {
  let t = String(s || '').trim();
  if (!t) return '';
  // 1) 取「/」或「(底盤碼)」之前的部分
  t = t.split(/\s*\/\s*/)[0];
  t = t.replace(/\s*[（(][^）)]*[）)]/g, ' ');
  // 2) 去掉尾端的底盤碼（Alone 尾碼：字母+數字 或 純數字世代，如 B10 / 8P / 5 / V / VI）
  t = t.replace(/\s+\b([A-Z]{1,3}\d{1,3}[A-Z]?)\b\s*$/i, ' ');
  t = t.replace(/\s+\b(Mk\s?[IVX]{1,4})\b\s*$/i, ' ');
  t = t.replace(/\s+\b([IVX]{1,4})\b\s*$/, ' ');
  t = t.replace(/\s+\b(Type\s*\d{3})\b\s*$/i, ' ');
  // 3) 去掉車身樣式 / perf 標記 / 引擎 / 功率
  t = t.replace(BODY_STYLE, ' ').replace(PERF_MARK, ' ');
  t = t.replace(ENGINE_TAIL, ' ').replace(POWER_TAIL, ' ');
  // 4) 去掉尾端的孤立數字（排量）
  t = t.replace(/\s+\d{1,2}\.\d\s*$/, ' ');
  // 5) 清理
  t = t.replace(/[^A-Za-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = t.split(' ').filter(Boolean);
  if (!toks.length) return '';
  // 6) 只取首個 token 作為型號
  //    （取兩個會把 "911 CARRERA" 與 "911 TURBO" 判為不同；只取一個兩邊都得到 "911"）
  // 型號所在位置依命名慣例而異：
  //   BMW  系列寫法 "1 Series (E81) 116" → 型號 116 在尾端
  //   其他       "A5 B10" / "Passat B7"    → 型號在首個 token
  // 因此含 "Series" 時取尾端 token，其餘取首個。
  let core;
  if (/\bSERIES\b/i.test(t)) {
    core = toks[toks.length - 1];
  } else {
    core = toks[0];
  }
  // 「C-class」→ "C"（MB 車系）；BMW「3ER / 1ER」→ "3" / "1"（系列碼）
  core = core.replace(/-?CLASS$/i, '');
  core = core.replace(/^(\d)(ER)$/i, '$1');
  return core.toUpperCase();
}

// 兩核心是否指同一車型：完全相同，或（長度>=3 時）一方為另一方的前綴
// 短核心（1-2 字元，如 MB 的 "C"）只接受完全相同，避免 "A3" 誤配 "A30"
function coreMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  // 1 字元核心（MB 的 "C"）只接受完全相同；2 字元核心（"M3" / "A3"）允許前綴
  if (a.length < 2 || b.length < 2) return false;
  return a.startsWith(b) || b.startsWith(a);
}

// ===== 車型識別（沿用 import_ebc.js 的規則）=====
function modelIdentity(s) {
  return normModelCore(String(s || '').replace(/\([^)]*\)/g, ' ').replace(/[0-9]+/g, '').replace(/\s+/g, ' ').trim());
}
function brandModelNorm(make, model) {
  const mk = String(make || '').toLowerCase();
  const m = String(model || '');
  if (/volkswagen|vw/.test(mk)) return m.replace(/\b(passat|golf|polo|jetta|bora|transporter|sharan|eos|touran|phaeton|caravelle|multivan|cc)\b/gi, '').replace(/\s+/g, ' ').trim();
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
    const c = m[0];
    if (c.length < 2 || /^\d{4}$/.test(c)) continue;
    out.add(c);
  }
  return out;
}
const ROMAN_RE = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i;
const romanToNum = r => ({ I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 }[String(r).toUpperCase()] || 0);
function ebcChassis(r) {
  const m = String(r.model || '').match(/[(\[【「]([^)\]】」]+)[\)\]】」]/);
  if (m) return chassisCodes(m[1]);
  const g = String(r.generation || '').trim().toUpperCase();
  if (/^([A-Z]{1,3}\d{1,4}[A-Z]?|\d{1,4}[A-Z]{1,3})$/.test(g)) return chassisCodes(g);
  return new Set();
}
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
    let c = m[0];
    if (/^MK\d+$/.test(c)) c = 'G' + c.slice(2);
    else if (ROMAN_RE.test(c)) c = 'G' + romanToNum(c);
    if (c.length >= 2) out.add(c);
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

(async () => {
  const variants = await prisma.vehicleVariant.findMany({
    where: { is_approved: true },
    select: { id: true, make: true, model: true, generation: true, engine_code: true, year_start: true, year_end: true, specs: true },
  });
  const byMake = new Map();
  for (const v of variants) {
    const k = (v.make || '').toLowerCase();
    if (!byMake.has(k)) byMake.set(k, []);
    byMake.get(k).push({
      id: v.id, year_start: v.year_start, year_end: v.year_end,
      model: v.model,                       // ← 車型名核心比對需要（先前漏掉導致 coreMatch 永遠 false）
      identity: modelIdentity(v.model),
      brandNorm: brandModelNorm(v.make, v.model),
      chassisSet: chassisCodes(v.generation),
      genCodes: genCodesEBC(v.generation),
      engineNorm: normEngine(v.engine_code || ''),
      dispVal: v.specs?.displacement_cc ?? null,
      hpVal: v.specs?.horsepower_ps ?? null,
    });
  }
  console.log(`vehicle_variants：${variants.length}（${byMake.size} 品牌）`);

  // 讀取所有適配列（一次載入記憶體，避免 N+1）
  const fits = await prisma.brakePartFitment.findMany({
    where: { vehicle_id: null },
    select: {
      id: true, make: true, model: true, generation: true, engine: true,
      displacement_cc: true, bhp_ps: true, fuel: true,
      year_start: true, year_end: true, position: true,
      disc_diameter_mm: true, disc_thickness_mm: true, disc_style: true, caliper_make: true,
    },
  });
  console.log(`待回填適配列：${fits.length}`);

  // 依 (make, model, generation, engine, 年份) 分組 → 同一組只需比對一次
  const groups = new Map();
  for (const f of fits) {
    const key = [f.make, f.model, f.generation, f.engine, f.year_start, f.year_end].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  console.log(`不重複的車型設定組：${groups.size}`);

  const updates = [];      // { id, vehicle_id }
  let matched = 0, unmatched = 0;
  const missByMake = new Map();
  const missSamples = [];

  for (const [, rows] of groups) {
    const f = rows[0];
    const ys = f.year_start, ye = f.year_end;
    if (ys === null || ye === null) { unmatched += rows.length; continue; }
    const cands = byMake.get(String(f.make).toLowerCase()) || [];
    if (!cands.length) {
      unmatched += rows.length;
      missByMake.set(f.make, (missByMake.get(f.make) || 0) + rows.length);
      if (missSamples.length < 8) missSamples.push(`${f.make} ${f.model} — DB 無此廠牌`);
      continue;
    }
    const srcCore = modelNameCore(f.model);
    const srcBrandNorm = brandModelNorm(f.make, f.model);
    const srcId = srcBrandNorm || modelIdentity(f.model);
    const srcChassis = ebcChassis({ model: f.model, generation: f.generation });
    const hasChassis = srcChassis.size > 0;
    const srcGen = f.generation || '';
    const srcEng = parenStrip(f.engine);
    const srcDisp = f.displacement_cc;
    const srcHp = f.bhp_ps;

    const hits = [];
    for (const v of cands) {
      if (v.year_start > ye || v.year_end < ys) continue;
      if (hasChassis) {
        if (v.chassisSet.size === 0) continue;
        let hit = false;
        for (const c of srcChassis) if (v.chassisSet.has(c)) { hit = true; break; }
        if (!hit) continue;
      } else if (genIsMarker(srcGen) && !genGateEBC(genCodesEBC(srcGen), v.genCodes)) {
        continue;
      }
      const vCore = modelNameCore(v.model);
      if (coreMatch(srcCore, vCore)) { hits.push({ vid: v.id, sim: 1, overlap: 0 }); continue; }
      const vId = v.brandNorm || v.identity;
      const sim = identitySim(srcId, vId);
      if (sim < 0.8) continue;
      if (srcEng && !engineMatchEBC(srcEng, v.engineNorm)) continue;
      if (!isNaN(srcDisp) && v.dispVal != null && !dispMatch(srcDisp, v.dispVal)) continue;
      if (!isNaN(srcHp) && v.hpVal != null && !hpMatch(srcHp, v.hpVal)) continue;
      hits.push({ vid: v.id, sim, overlap: Math.min(ye, v.year_end) - Math.max(ys, v.year_start) + 1 });
    }
    if (!hits.length) {
      unmatched += rows.length;
      missByMake.set(f.make, (missByMake.get(f.make) || 0) + rows.length);
      if (missSamples.length < 8) missSamples.push(`${f.make} ${f.model} gen=${f.generation || '-'} — 條件過濾後無匹配`);
      continue;
    }
    // 最佳：相似度 → 年份重疊
    hits.sort((a, b) => (b.sim - a.sim) || (b.overlap - a.overlap));
    const best = hits[0];
    for (const r of rows) updates.push({ id: r.id, vehicle_id: best.vid });
    matched += rows.length;
  }

  console.log(`\n匹配結果：可回填 ${matched}｜無法回填 ${unmatched}（${(matched / fits.length * 100).toFixed(1)}%）`);
  console.log('無法回填依廠牌：');
  for (const [mk, c] of [...missByMake.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`   ${String(mk).padEnd(22)} ${c}`);
  }
  console.log('樣本：');
  missSamples.forEach(s => console.log('   ', s));

  // 影響：回填後煞車件可在車型頁出現
  const partsTouched = new Set(updates.map(u => u.id));
  const distinctVehicles = new Set(updates.map(u => u.vehicle_id));
  console.log(`\n影響：${partsTouched.size} 筆適配列 → ${distinctVehicles.size} 個車型變體`);

  if (!APPLY) {
    console.log('\n--- DRY-RUN（未寫入）---');
    await prisma.$disconnect();
    return;
  }

  // 寫入（分批）
  const CHUNK = 500;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await Promise.all(chunk.map(u =>
      prisma.brakePartFitment.update({ where: { id: u.id }, data: { vehicle_id: u.vehicle_id } })
    ));
  }
  const filled = await prisma.brakePartFitment.count({ where: { vehicle_id: { not: null } } });
  const total = await prisma.brakePartFitment.count();
  console.log(`\n回填完成：${filled} / ${total}（${(filled / total * 100).toFixed(1)}%）`);

  await prisma.$disconnect();
})().catch(async e => { console.error('ERR', e.message); await prisma.$disconnect(); process.exit(1); });
