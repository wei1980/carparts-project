// JXB 完整上架管線：零件匯入 + fitment → vehicle_variants 相容匹配
// 用法：node jxb_import.js（乾跑）｜node jxb_import.js --apply（執行）
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// ============ fitment 解析 ============
const MAKE_MAP = {
  'VW': 'Volkswagen', 'VOLKSWAGEN': 'Volkswagen', 'AUDI': 'Audi', 'SEAT': 'Seat',
  'SKODA': 'Skoda', 'PORSCHE': 'Porsche', 'INFINITI': 'Infiniti', 'CUPRA': 'Cupra',
  'RAM': 'Ram', 'DODGE': 'Dodge', 'BMW': 'BMW', 'MERCEDES': 'Mercedes',
  'TOYOTA': 'Toyota', 'SUBARU': 'Subaru', 'NISSAN': 'Nissan', 'TESLA': 'Tesla',
};
// 車型 token（長者優先，避免 "Golf" 先吃掉 "Golf R"）
const MODEL_TOKENS = [
  'Ram 2500', 'Ram 3500', 'Golf R', 'Golf GTI', 'Golf Variant', 'SportWagen',
  'TT RS', 'TTS', 'TTRS', 'R32', 'UrS4', 'UrS6', 'Alltrack', 'allroad',
  'Golf', 'Jetta', 'Bora', 'Passat', 'CC', 'Arteon', 'Taos', 'Tharu', 'Atlas',
  'Tiguan', 'Touareg', 'Scirocco', 'Transporter', 'Caravelle', 'Multivan', 'A3', 'S3', 'RS3', 'A4', 'S4', 'RS4', 'A5',
  'S5', 'RS5', 'Q5', 'SQ5', 'Q7', 'SQ7', 'Q8', 'SQ8', 'RSQ8', 'A6', 'S6', 'RS6',
  'A7', 'S7', 'RS7', 'A8', 'S8', 'TT', 'RS Q8', 'Superb', 'Octavia', 'Yeti', 'Formentor',
  'Leon', 'Ateca', 'Macan', 'Cayenne', 'Panamera', '911', 'Q50', 'Q60', 'Q70',
  '100', '200', '5000', 'Rapide', 'Vantage', 'DB11', 'Ghibli', 'Quattroporte',
];
const GEN_WORD = { '1st': 'Mk1', '2nd': 'Mk2', '3rd': 'Mk3', '4th': 'Mk4', '5th': 'Mk5', 'first': 'Mk1', 'second': 'Mk2', 'third': 'Mk3', 'fourth': 'Mk4' };
// 底盤碼別名（JXB 慣稱 → DB generation 命名，依車型條件）
const CHASSIS_ALIAS = [
  { models: ['Q5', 'SQ5'], from: ['B8', 'B9'], to: '8R', toFY: 'FY' }, // Q5 1st=B8→8R, 2nd=B9→FY
  { models: ['Superb'], from: ['B6'], to: 'Mk2' },
  { models: ['Superb'], from: ['B8'], to: 'Mk3' },
  { models: ['Cayenne'], from: ['955', '957'], to: '9PA' },
];

function parseFitment(raw) {
  const s = raw.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const r = { chassis: new Set(), makes: new Set(), models: new Set(), awd: false, y0: null, y1: null };
  // 年份
  const yr = s.match(/\((\d{4})\s*[-–]\s*(\d{4})\)/) || s.match(/\b(\d{4})\s*[-–]\s*(\d{4})\b/);
  if (yr) { r.y0 = +yr[1]; r.y1 = +yr[2]; }
  const yp = s.match(/\((\d{4})\+\)/) || s.match(/\b(\d{4})\+/);
  if (yp && r.y0 == null) r.y0 = +yp[1];
  // AWD
  if (/\b(4Motion|quattro|AWD)\b/i.test(s)) r.awd = true;
  // 品牌
  for (const m of Object.keys(MAKE_MAP)) {
    if (new RegExp(`\\b${m}\\b`, 'i').test(s)) r.makes.add(MAKE_MAP[m]);
  }
  // 世代字（Third/Fourth gen）→ MkN
  for (const [w, mk] of Object.entries(GEN_WORD)) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(s)) r.chassis.add(mk);
  }
  // 底盤碼（負向預查避免變速箱碼 0B5/0A3 被誤抓）
  const ch = s.matchAll(/(?<![A-Za-z0-9])(Mk\d|Typ\s*\d\w?|T\d|B\d|C\d|D\d|8V|8Y|8S|8P|8L|5F|5N|7P|4L|95B|955|957|961|970|CA1|CD1|CG5|KL1|KL8|G1)(?![A-Za-z0-9])/g);
  for (const m of ch) {
    const raw = m[1].toUpperCase().replace(/\s/g, '');
    r.chassis.add(raw);
    if (raw.startsWith('TYP')) r.chassis.add(raw.slice(3)); // "Typ 4M" → 4M（DB generation 命名）
  }
  // 車型 token（長者優先）
  let rest = s;
  for (const t of MODEL_TOKENS) {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(rest)) { r.models.add(t); rest = rest.replace(re, ' '); }
  }
  // 底盤碼別名（依車型上下文）
  const modelArr = [...r.models];
  for (const rule of CHASSIS_ALIAS) {
    if (!rule.models.some(m => modelArr.includes(m))) continue;
    const hit = rule.from.some(c => r.chassis.has(c));
    if (hit) {
      if (rule.toFY && r.chassis.has('B9')) r.chassis.add(rule.toFY); // B9→FY
      if (rule.to && [...r.chassis].some(c => rule.from.includes(c) && c !== 'B9')) r.chassis.add(rule.to);
    }
  }
  return r;
}

// 跨行合併：無車型的元素（純底盤盤碼/條件行）與後續元素合併
function parseFitmentList(list) {
  const fits = [];
  let cur = null;
  let anyModels = false;
  for (const raw of list) {
    const p = parseFitment(raw);
    const hasModels = p.models.size > 0;
    const hasAnchor = p.chassis.size > 0 || p.makes.size > 0;
    if (!hasModels && !hasAnchor) continue; // 純條件行（年份/除外說明）
    if (!hasModels) { // 純底盤碼行 → 累積
      if (!cur) cur = { chassis: new Set(), makes: new Set(), models: new Set(), awd: false, y0: null, y1: null };
      p.chassis.forEach(c => cur.chassis.add(c));
      p.makes.forEach(m => cur.makes.add(m));
      if (p.awd) cur.awd = true;
      if (p.y0 != null) cur.y0 = cur.y0 == null ? p.y0 : Math.min(cur.y0, p.y0);
      if (p.y1 != null) cur.y1 = cur.y1 == null ? p.y1 : Math.max(cur.y1, p.y1);
    } else if (hasAnchor) { // 自带底盤碼/品牌 → 獨立 fitment
      if (cur) { fits.push(cur); cur = null; }
      anyModels = true;
      fits.push(p);
    } else { // 僅車型 → 併入 current
      if (!cur) cur = { chassis: new Set(), makes: new Set(), models: new Set(), awd: false, y0: null, y1: null };
      p.models.forEach(m => cur.models.add(m));
      if (p.awd) cur.awd = true;
      anyModels = true;
      fits.push(cur); // 封存（cur 保留 chassis/makes 供下一個純車型行沿用）
      cur = { chassis: new Set(cur.chassis), makes: new Set(cur.makes), models: new Set(), awd: cur.awd, y0: cur.y0, y1: cur.y1 };
    }
  }
  if (cur && (!anyModels || cur.models.size > 0)) fits.push(cur);
  // 過濾：無底盤碼、無車型、無品牌者（純年份）丢弃
  return fits.filter(f => f.chassis.size || f.models.size || f.makes.size);
}

// ============ 變體匹配 ============
function variantMatches(v, f) {
  // 安全安全閘：僅品牌、無車型無底盤碼者過於模糊（未識別 token 的殘餘字串）→ 不匹配
  if (f.makes.size && !f.models.size && !f.chassis.size) return false;
  if (f.makes.size && !f.makes.has(v.make)) return false;
  if (f.models.size) {
    const m = (v.model || '').toLowerCase(), vn = (v.variant_name || '').toLowerCase();
    const mn = m.replace(/\s/g, ''), vnn = vn.replace(/\s/g, '');
    let hit = false;
    for (const t of f.models) {
      const tl = t.toLowerCase();
      if (t.includes(' ')) {
        // 雙字 token："%A B%" 或 "A... B"（B 須為詞尾，排除 R-Line）
        const [a, b] = tl.split(' ');
        const re = new RegExp(`\\b${a}[^\\-]* ${b}(?!\\-)`, 'i');
        if (m.includes(tl) || vn.includes(tl) || re.test(m) || re.test(vn)) { hit = true; break; }
      } else {
        if (m.includes(tl) || vn.includes(tl) || mn.includes(tl) || vnn.includes(tl)) { hit = true; break; }
      }
    }
    if (!hit) return false;
  }
  if (f.chassis.size) {
    const g = (v.generation || '').toLowerCase();
    let hit = false;
    for (const c of f.chassis) if (g.includes(c.toLowerCase())) { hit = true; break; }
    if (!hit) return false;
  }
  if (f.awd) {
    const drive = `${v.specs && v.specs.Drive || ''} ${v.drive_type || ''} ${v.model || ''}`;
    if (!/四驅|awd|quattro|4motion/i.test(drive)) return false;
  }
  if (f.y0 != null && (v.year_end || 0) < f.y0) return false;
  if (f.y1 != null && (v.year_start || 0) > f.y1) return false;
  return true;
}

// ============ 主流程 ============
(async () => {
const data = JSON.parse(fs.readFileSync('C:/carparts/carparts-api/media/Data/jxb_products.json', 'utf8'));
const parts = data.filter(r => r.sub);
console.log(`JXB 零件：${parts.length}（有 fitment：${parts.filter(r => r.fitment && r.fitment.length).length}）`);

// 既有 DB SKU
const dbParts = await prisma.$queryRawUnsafe(`SELECT sku, id, name, category FROM parts WHERE image_url LIKE '%/JXB/%'`);
const dbSkuMap = new Map(dbParts.map(p => [p.sku, p]));
console.log(`DB 既有 JXB：${dbParts.length} SKU｜category 樣本：${dbParts[0] ? dbParts[0].category : '(無)'}`);

// 載入 vehicle_variants
const variants = await prisma.$queryRawUnsafe(`SELECT id, make, model, generation, variant_name, year_start, year_end, specs, drive_type FROM vehicle_variants`);
console.log(`vehicle_variants：${variants.length} 筆`);

// 匹配
const newParts = [], linkRows = [];
let zeroMatch = [], totalLinks = 0;
const mk8Variants = variants.filter(v => (v.generation || '').toLowerCase().includes('mk8'));
const mk8HitParts = [];

for (const r of parts) {
  const isNew = !dbSkuMap.has(r.sku);
  if (isNew) newParts.push(r);
  // 相容匹配
  const fits = (r.fitment && r.fitment.length) ? parseFitmentList(r.fitment) : [];
  const vidSet = new Set();
  for (const f of fits) {
    for (const v of variants) {
      if (variantMatches(v, f)) vidSet.add(v.id);
    }
  }
  if (vidSet.size === 0 && fits.length > 0) zeroMatch.push(r.sku);
  if (vidSet.size > 0) {
    totalLinks += vidSet.size;
    for (const vid of vidSet) linkRows.push({ part_sku: r.sku, vehicle_id: vid });
    if ([...vidSet].some(vid => mk8Variants.some(mv => mv.id === vid))) mk8HitParts.push(r.sku);
  }
}

console.log(`\n=== 乾跑結果（${APPLY ? '--apply 已啟用' : '乾跑'}）===`);
console.log(`新零件待匯入：${newParts.length}｜既有：${dbParts.length}`);
console.log(`相容連結（去重前）：${linkRows.length} 條｜涵蓋零件：${new Set(linkRows.map(l => l.part_sku)).size} 個`);
console.log(`fitment 無法匹配任何變體的零件：${zeroMatch.length} 個`, zeroMatch.slice(0, 15).join(', '));
console.log(`匹配到 Golf Mk8 變體的零件：${mk8HitParts.length} 個`, mk8HitParts.join(', '));

// 抽樣審查（人工檢查匹配品質）
const sampleSkus = ['8V001A0', 'MQB03A0', 'B9002A0', 'C8001A0', '8V003A0'];
console.log('\n=== 抽樣匹配審查 ===');
for (const sku of sampleSkus) {
  const r = parts.find(x => x.sku === sku);
  if (!r) continue;
  const fits = parseFitmentList(r.fitment || []);
  const vids = new Set();
  for (const f of fits) for (const v of variants) if (variantMatches(v, f)) vids.add(v.id);
  const sampleVars = variants.filter(v => vids.has(v.id)).slice(0, 8);
  console.log(`\n${sku}｜${(r.names && r.names[0] || '').slice(0, 50)}｜fitment 組 ${fits.length}｜匹配 ${vids.size} 變體`);
  for (const f of fits.slice(0, 4)) {
    console.log(`   fitment: chassis=[${[...f.chassis].join(',')}] makes=[${[...f.makes].join(',')}] models=[${[...f.models].join(',')}] awd=${f.awd} ${f.y0 || ''}-${f.y1 || ''}`);
  }
  for (const v of sampleVars) console.log(`   → ${v.make}｜${v.model}｜${v.generation}｜${v.year_start}-${v.year_end}`);
}

if (!APPLY) {
  console.log('\n（乾跑 — 加 --apply 執行匯入）');
  await prisma.$disconnect();
  return;
}

// ============ 匯入 ============
// 1. 新零件
let insertedParts = 0;
for (const r of newParts) {
  const longName = r.names.reduce((a, b) => b.length > a.length ? b : a, '');
  const longDesc = (r.descs && r.descs.length) ? r.descs.reduce((a, b) => b.length > a.length ? b : a, '') : null;
  const res = await prisma.$queryRawUnsafe(
    `INSERT INTO parts (sku, name, brand, subcategory_id, category, image_url, description, msrp_price, wholesale_price, stock_qty, distributor_stock_qty, preorder_lead_time_days, is_active, is_universal)
     VALUES ($1, $2, 'JXB Performance', $3, $4, $5, $6, 14800, 11800, 0, $7, 21, true, false)
     ON CONFLICT (sku) DO NOTHING`,
    r.sku, longName, r.sub.id, r.sub.cat, r.imageLocal || null, longDesc, r.soldOut ? 0 : 1
  );
  if (res.rowCount > 0) insertedParts++;
}
console.log(`\n新零件匯入：${insertedParts}`);

// 2. 相容連結（sku → part_id）
const allJxb = await prisma.$queryRawUnsafe(`SELECT sku, id FROM parts WHERE image_url LIKE '%/JXB/%'`);
const skuToId = new Map(allJxb.map(p => [p.sku, p.id]));
let insertedLinks = 0;
for (const l of linkRows) {
  const pid = skuToId.get(l.part_sku);
  if (!pid) continue;
  const res = await prisma.$queryRawUnsafe(
    `INSERT INTO part_vehicle_compatibility (part_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    pid, l.vehicle_id
  );
  if (res.rowCount > 0) insertedLinks++;
}
console.log(`相容連結新增：${insertedLinks}（含既有零件補連結）`);

// 3. 驗證
const finalMk8 = await prisma.$queryRawUnsafe(
  `SELECT DISTINCT p.sku FROM parts p JOIN part_vehicle_compatibility c ON c.part_id = p.id
   WHERE p.image_url LIKE '%/JXB/%' AND c.vehicle_id = ANY(ARRAY[${mk8Variants.map(v => v.id).join(',')}]::int[])`
).catch(() => prisma.$queryRawUnsafe(
  `SELECT DISTINCT p.sku FROM parts p JOIN part_vehicle_compatibility c ON c.part_id = p.id
   WHERE p.image_url LIKE '%/JXB/%' AND c.vehicle_id IN (${mk8Variants.map(v => v.id).join(',')})`
));
console.log(`\n驗證：Golf Mk8 變體現有 JXB 零件：${finalMk8.length} 個`, finalMk8.map(p => p.sku).join(', '));

await prisma.$disconnect();
})();
