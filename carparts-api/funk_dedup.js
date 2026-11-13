// FUNK 同車多隔熱毯去重
// 問題：供應商把同一引擎族的所有車型列在每個尺寸變體的 fitment 中，導致同一台車連結
//       多個名稱不同的隔熱毯（如 Golf GTI Mk6 同時連結 Scirocco / Passat / Golf R 的 K04 毯）。
// 規則：每台車只保留「名稱最符合車型」的一個 SKU：
//       完整車型名稱吻合 +6、車型家族詞 +4、世代/車體代碼 +3、車廠 +2；
//       名稱提到同車廠其他車型 −4、提到其他車廠 −4。同分時依現有連結數、part_id 決定。
// 用法：node funk_dedup.js [--apply]（預設乾跑）；module.exports.runDedup 供 funk_import.js 呼叫
const { PrismaClient } = require('@prisma/client');

const MAKE_ALIASES = {
  'volkswagen': ['vw', 'volkswagon'],
  'mercedes-benz': ['mercedes', 'benz'],
  'ds automobiles': ['ds'],
  'land rover': ['range rover'],
};
// DB vehicle_variants 沒有這些廠牌，但供應商品名常見（用於「其他車廠」扣分）
const EXTRA_MAKES = ['seat', 'cupra', 'mclaren'];

const norm = s => (s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const compile = needle => {
  const n = norm(needle).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  if (!n) return null;
  try { return new RegExp('\\b' + n + '\\b', 'i'); } catch (e) { return null; }
};

// 車型家族詞：
//  - 第一 token（純數字時：≥3 位數直接用如 208/911；否則與第二 token 組合如 "1 series"）
//  - 其餘含數字且非純數字/非小數的 token（s1/s3/rs3/r8/xdrive40i… 性能版或規格識別詞）
//  不含純引擎/裝飾詞（tsi/tdi/gti/line/edition…）避免跨車型誤判
function familyTokens(model) {
  const toks = norm(model).trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const fams = new Set();
  const t0 = toks[0];
  if (/^\d+$/.test(t0)) {
    if (t0.length >= 3) fams.add(t0);
    else if (toks.length > 1) fams.add(t0 + ' ' + toks[1]);
  } else {
    fams.add(t0);
  }
  for (const t of toks.slice(1)) {
    if (!/\d/.test(t)) continue;
    if (/^\d+(\.\d+)?$/.test(t)) continue;
    if (t.length < 2) continue;
    fams.add(t);
  }
  return [...fams];
}

function genTokens(generation) {
  if (!generation) return [];
  const out = new Set();
  for (const raw of String(generation).split(/\s+/)) {
    for (const t of raw.replace(/[()]/g, ' ').split(/[\s/]+/)) {
      const c = t.trim();
      if (c.length >= 2 && /[a-z0-9]/i.test(c)) out.add(c);
    }
  }
  return [...out];
}

function scorePart(name, veh, famRes, allMakeRes) {
  let score = 0; const why = [];
  if (veh.makeRes.some(r => r.test(name))) { score += 2; why.push('車廠'); }
  if (veh.modelFullRe && veh.modelFullRe.test(name)) { score += 6; why.push('完整車型'); }
  else if (veh.famRes.some(r => r.test(name))) { score += 4; why.push('車型家族'); }
  if (veh.genRes.some(r => r.test(name))) { score += 3; why.push('世代'); }
  for (const fr of famRes) {
    if (veh.famSet.has(fr.fam)) continue;
    if (fr.re.test(name)) { score -= 4; why.push('其他車型:' + fr.fam); }
  }
  for (const mr of allMakeRes) {
    if (mr.mk === veh.mk) continue;
    if (mr.res.some(r => r.test(name))) { score -= 4; why.push('其他車廠:' + mr.mk); }
  }
  return { score, why };
}

async function runDedup(prisma, apply) {
  const parts = await prisma.$queryRaw`
    SELECT p.id, p.sku, p.name,
           (SELECT COUNT(*)::int FROM part_vehicle_compatibility pvc WHERE pvc.part_id = p.id) AS links
    FROM parts p WHERE p.brand = 'Funk Motorsport' ORDER BY p.id;
  `;
  const partById = new Map(parts.map(p => [p.id, p]));

  const links = await prisma.$queryRaw`
    SELECT pvc.vehicle_id, pvc.part_id, v.make, v.model, v.generation
    FROM part_vehicle_compatibility pvc
    JOIN parts p ON p.id = pvc.part_id
    JOIN vehicle_variants v ON v.id = pvc.vehicle_id
    WHERE p.brand = 'Funk Motorsport'
    ORDER BY pvc.vehicle_id, pvc.part_id;
  `;

  const byVehicle = new Map();
  for (const l of links) {
    let v = byVehicle.get(l.vehicle_id);
    if (!v) { v = { make: l.make, model: l.model, generation: l.generation, parts: [] }; byVehicle.set(l.vehicle_id, v); }
    v.parts.push(l.part_id);
  }

  // 家族索引：各車廠所有車型家族詞的聯集（「名稱提到其他車型」扣分用）
  const allModels = await prisma.$queryRaw`SELECT DISTINCT make, model FROM vehicle_variants`;
  const famResByMake = {};
  for (const m of allModels) {
    const mk = norm(m.make);
    famResByMake[mk] = famResByMake[mk] || new Map();
    for (const fam of familyTokens(m.model)) {
      if (!famResByMake[mk].has(fam)) {
        const re = compile(fam);
        if (re) famResByMake[mk].set(fam, { fam, re });
      }
    }
  }

  const allMakesRows = await prisma.$queryRaw`SELECT DISTINCT make FROM vehicle_variants`;
  const allMakeRes = allMakesRows.map(r => {
    const mk = norm(r.make);
    const toks = [r.make, ...(MAKE_ALIASES[mk] || [])];
    return { mk, res: toks.map(compile).filter(Boolean) };
  });
  for (const ex of EXTRA_MAKES) {
    allMakeRes.push({ mk: ex, res: [compile(ex)].filter(Boolean) });
  }

  let multiVehicles = 0, removeCount = 0;
  const removals = [];
  const keptByPart = new Map();
  const samples = [];
  const focusDecisions = [];
  const focusSeen = new Set();
  const scoreHist = {};

  for (const [vid, v] of byVehicle) {
    const mk = norm(v.make);
    const fams = familyTokens(v.model);
    const veh = {
      mk,
      makeRes: [v.make, ...(MAKE_ALIASES[mk] || [])].map(compile).filter(Boolean),
      modelFull: norm(v.model),
      famSet: new Set(fams),
      famRes: fams.map(f => compile(f)).filter(Boolean),
      genRes: genTokens(v.generation).map(compile).filter(Boolean),
    };
    veh.modelFullRe = compile(veh.modelFull);
    const famRes = famResByMake[mk] ? [...famResByMake[mk].values()] : [];

    if (v.parts.length < 2) { keptByPart.set(v.parts[0], (keptByPart.get(v.parts[0]) || 0) + 1); continue; }
    multiVehicles++;
    const scored = v.parts.map(pid => {
      const p = partById.get(pid);
      const s = scorePart(norm(p.name), veh, famRes, allMakeRes);
      return { pid, sku: p.sku, name: p.name, score: s.score, why: s.why, links: p.links };
    });
    scored.sort((a, b) => b.score - a.score || b.links - a.links || a.pid - b.pid);
    const keep = scored[0];
    keptByPart.set(keep.pid, (keptByPart.get(keep.pid) || 0) + 1);
    for (const s of scored.slice(1)) { removals.push({ vehicle_id: vid, part_id: s.pid }); removeCount++; }

    const bucket = keep.score >= 6 ? '≥6(完整車型)' : keep.score >= 4 ? '4-5(家族)' : keep.score >= 2 ? '2-3(車廠)' : keep.score >= 0 ? '0-1' : '<0';
    scoreHist[bucket] = (scoreHist[bucket] || 0) + 1;

    const decision = {
      vehicle: `${v.make} ${v.model} ${v.generation}`.trim(),
      keep: { sku: keep.sku, name: keep.name, score: keep.score, why: keep.why.join('+') || '—' },
      drop: scored.slice(1).map(s => ({ sku: s.sku, name: s.name, score: s.score, why: s.why.join('+') || '—' })),
    };
    if (samples.length < 25) samples.push(decision);
    const mNorm = norm(v.model);
    const gNorm = norm(v.generation || '');
    const focusKey = mNorm.includes('golf gti') && gNorm.includes('mk6') ? 'golf-gti-mk6'
      : mNorm.includes('a1 sportback s1') ? 'audi-a1-s1'
      : mNorm.includes('a3 sportback 1.8 tfsi') ? 'audi-a3-8p' : null;
    if (focusKey && !focusSeen.has(focusKey)) { focusSeen.add(focusKey); focusDecisions.push(decision); }
  }

  const zeroLinkParts = parts.filter(p => !keptByPart.has(p.id));
  const keptParts = parts.filter(p => keptByPart.has(p.id)).map(p => ({ ...p, kept: keptByPart.get(p.id) }));

  const report = {
    totalLinksBefore: links.length,
    vehiclesWithFunk: byVehicle.size,
    multiVehicles,
    removals: removeCount,
    totalLinksAfter: byVehicle.size,
    partsBefore: parts.length,
    partsKept: parts.length - zeroLinkParts.length,
    zeroLinkParts,
    keptParts,
    scoreHist,
    samples,
    focusDecisions,
    removalsList: removals,
  };

  if (apply && removals.length) {
    for (let i = 0; i < removals.length; i += 500) {
      const batch = removals.slice(i, i + 500);
      const values = batch.map(r => `(${r.part_id},${r.vehicle_id})`).join(',');
      await prisma.$executeRawUnsafe(`DELETE FROM part_vehicle_compatibility WHERE (part_id, vehicle_id) IN (${values})`);
    }
  }
  if (apply && zeroLinkParts.length) {
    for (const p of zeroLinkParts) {
      await prisma.$executeRawUnsafe(`UPDATE parts SET is_active = false WHERE id = $1 AND brand = 'Funk Motorsport'`, p.id);
    }
  }
  return report;
}

if (require.main === module) (async () => {
  const prisma = new PrismaClient();
  const apply = process.argv.includes('--apply');
  if (!apply) console.log('== 乾跑模式（不加 --apply 不寫入 DB）==');
  const r = await runDedup(prisma, apply);
  console.log(`FUNK 相容連結：${r.totalLinksBefore} → ${r.totalLinksAfter}（每車 1 條）`);
  console.log(`同車多毯車型：${r.multiVehicles} 台，移除多餘連結 ${r.removals} 條`);
  console.log(`SKU：${r.partsBefore} → 保留上架 ${r.partsKept}，下架 ${r.zeroLinkParts.length}（去重後零相容）`);
  console.log('勝者分數分布：' + JSON.stringify(r.scoreHist));
  if (r.zeroLinkParts.length) console.log('下架清單：' + r.zeroLinkParts.map(p => p.sku).join(', '));
  if (apply) {
    // 套用後驗證：每車最多 1 條 FUNK 連結
    const chk = await prisma.$queryRaw`
      SELECT MAX(c)::int AS max_per_vehicle, COUNT(*)::int AS vehicles FROM (
        SELECT vehicle_id, COUNT(*) c FROM part_vehicle_compatibility pvc
        JOIN parts p ON p.id = pvc.part_id WHERE p.brand = 'Funk Motorsport' GROUP BY vehicle_id
      ) t;
    `;
    console.log('套用後驗證：' + JSON.stringify(chk[0]));
  }
  console.log('\n== 焦點案例：Golf GTI Mk6（使用者回報的車型）==');
  for (const d of r.focusDecisions) {
    console.log(`■ ${d.vehicle}`);
    console.log(`  ✅ 保留 ${d.keep.sku}「${d.keep.name}」（${d.keep.score} 分：${d.keep.why}）`);
    for (const x of d.drop) console.log(`  ❌ 移除 ${x.sku}「${x.name}」（${x.score} 分：${x.why}）`);
  }
  console.log('\n== 保留上架 SKU（去重後仍有相容）==');
  for (const p of r.keptParts) console.log(`  ${p.sku}「${p.name}」 原 ${p.links} 連結 → 保留 ${p.kept}`);
  console.log('\n== 決策抽樣（前 25 台，每台列最佳+次佳 4 筆）==');
  for (const d of r.samples) {
    console.log(`■ ${d.vehicle}`);
    console.log(`  ✅ ${d.keep.sku}「${d.keep.name}」（${d.keep.score}：${d.keep.why}）`);
    for (const x of d.drop.slice(0, 4)) console.log(`  ❌ ${x.sku}「${x.name}」（${x.score}：${x.why}）`);
    if (d.drop.length > 4) console.log(`  … 另有 ${d.drop.length - 4} 筆移除`);
  }
  await prisma.$disconnect();
})();

module.exports = { runDedup, familyTokens, norm, MAKE_ALIASES, EXTRA_MAKES };
