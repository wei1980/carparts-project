// 跨品牌隔熱毯去重：同一台車只保留一個隔熱毯（名稱最符合車型者）
// 範圍：Funk Motorsport（全部 SKU）+ CTS Turbo CTS-TB-*（CTS-EXH-TB 是排氣管，不算毯）
// 規則同 funk_dedup.js：完整車型名 +6、家族詞 +4、世代 +3、車廠 +2；錯車型/車廠 −4。
// 用法：node blanket_dedup_crossbrand.js [--apply]（預設乾跑）
const { PrismaClient } = require('@prisma/client');
const { familyTokens, norm, MAKE_ALIASES, EXTRA_MAKES } = require('./funk_dedup');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const compile = needle => {
  const n = norm(needle).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  if (!n) return null;
  try { return new RegExp('\\b' + n + '\\b', 'i'); } catch (e) { return null; }
};

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

(async () => {
  if (!APPLY) console.log('== 乾跑模式（不加 --apply 不寫入 DB）==');

  const blankets = await prisma.$queryRaw`
    SELECT p.id, p.sku, p.name, p.brand,
           (SELECT COUNT(*)::int FROM part_vehicle_compatibility pvc WHERE pvc.part_id = p.id) AS links
    FROM parts p
    WHERE p.brand = 'Funk Motorsport' OR p.sku ILIKE 'CTS-TB-%'
    ORDER BY p.brand, p.id;
  `;
  const partById = new Map(blankets.map(p => [p.id, p]));

  const links = await prisma.$queryRaw`
    SELECT pvc.vehicle_id, pvc.part_id, v.make, v.model, v.generation
    FROM part_vehicle_compatibility pvc
    JOIN parts p ON p.id = pvc.part_id
    JOIN vehicle_variants v ON v.id = pvc.vehicle_id
    WHERE p.brand = 'Funk Motorsport' OR p.sku ILIKE 'CTS-TB-%'
    ORDER BY pvc.vehicle_id, pvc.part_id;
  `;
  const byVehicle = new Map();
  for (const l of links) {
    let v = byVehicle.get(l.vehicle_id);
    if (!v) { v = { make: l.make, model: l.model, generation: l.generation, parts: [] }; byVehicle.set(l.vehicle_id, v); }
    v.parts.push(l.part_id);
  }

  // 家族索引與車廠索引（同 funk_dedup.js）
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
    return { mk, res: [r.make, ...(MAKE_ALIASES[mk] || [])].map(compile).filter(Boolean) };
  });
  for (const ex of EXTRA_MAKES) allMakeRes.push({ mk: ex, res: [compile(ex)].filter(Boolean) });

  let multiVehicles = 0, removeCount = 0;
  const removals = [];
  const decisions = [];
  const keptByPart = new Map();

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
      return { pid, sku: p.sku, name: p.name, brand: p.brand, score: s.score, why: s.why, links: p.links };
    });
    scored.sort((a, b) => b.score - a.score || b.links - a.links || a.pid - b.pid);
    const keep = scored[0];
    keptByPart.set(keep.pid, (keptByPart.get(keep.pid) || 0) + 1);
    for (const s of scored.slice(1)) { removals.push({ vehicle_id: vid, part_id: s.pid }); removeCount++; }
    decisions.push({
      vehicle: `${v.make} ${v.model} ${v.generation}`.trim(),
      keep: { sku: keep.sku, name: keep.name, brand: keep.brand, score: keep.score, why: keep.why.join('+') || '—' },
      drop: scored.slice(1).map(s => ({ sku: s.sku, name: s.name, brand: s.brand, score: s.score, why: s.why.join('+') || '—' })),
    });
  }

  const zeroLinkParts = blankets.filter(p => !keptByPart.has(p.id));

  console.log(`隔熱毯零件：${blankets.length} SKU（FUNK ${blankets.filter(b => b.brand === 'Funk Motorsport').length} + CTS ${blankets.filter(b => b.brand !== 'Funk Motorsport').length}）`);
  console.log(`車型：${byVehicle.size} 台有多品牌毯連結；多毯車型 ${multiVehicles} 台，移除 ${removeCount} 條`);
  console.log(`移除後：CTS-TB-B-03 剩 ${(partById.get([...partById.values()].find(p => p.sku === 'CTS-TB-B-03')?.id) || {}).links - removals.filter(r => r.part_id === [...partById.values()].find(p => p.sku === 'CTS-TB-B-03')?.id).length} 連結`);
  if (zeroLinkParts.length) console.log('零相容下架候選：' + zeroLinkParts.map(p => p.sku).join(', '));

  console.log('\n== 決策（前 15 台）==');
  for (const d of decisions.slice(0, 15)) {
    console.log(`■ ${d.vehicle}`);
    console.log(`  ✅ 保留 ${d.keep.brand} ${d.keep.sku}「${d.keep.name}」（${d.keep.score} 分：${d.keep.why}）`);
    for (const x of d.drop) console.log(`  ❌ 移除 ${x.brand} ${x.sku}「${x.name}」（${x.score} 分：${x.why}）`);
  }
  const scoreHist = {};
  for (const d of decisions) {
    const key = d.keep.brand;
    scoreHist[key] = (scoreHist[key] || 0) + 1;
  }
  console.log('\n保留者品牌分布：' + JSON.stringify(scoreHist));

  if (APPLY && removals.length) {
    for (let i = 0; i < removals.length; i += 500) {
      const batch = removals.slice(i, i + 500);
      const values = batch.map(r => `(${r.part_id},${r.vehicle_id})`).join(',');
      await prisma.$executeRawUnsafe(`DELETE FROM part_vehicle_compatibility WHERE (part_id, vehicle_id) IN (${values})`);
    }
    console.log(`\n已移除 ${removals.length} 條跨品牌重複毯連結`);
  }
  await prisma.$disconnect();
})();
