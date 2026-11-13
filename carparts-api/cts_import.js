// CTS Turbo 匯入管線：CTS.xlsx 產品 + fitment（xlsx 241 SKU + VPF CSV 408 SKU）→ parts + 相容連結
// 乾跑：node cts_import.js
// 執行：node cts_import.js --apply
const fs = require('fs');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// ================= 類別映射 =================
// xlsx 主分類/子分類配對錯亂 → 只用「子分類」名稱映射 DB subcategory_id
const SUB_MAP = {
  '渦輪': 19, '排氣管': 7, '進氣套件': 2, '渦輪管': 3, '洩壓閥': 4,
  '節氣門': 5, '觸媒': 8, '汽油幫浦': 27,
};
// subcategory_id → category 名稱（parts.category 字串）
const CAT_NAME = {
  1: '進氣', 2: '進氣', 3: '進氣', 4: '進氣', 5: '進氣', 6: '進氣',
  7: '排氣', 8: '排氣', 9: '煞車', 10: '煞車', 11: '煞車', 12: '煞車',
  13: '底盤', 14: '底盤', 15: '底盤', 16: '底盤', 17: '引擎', 18: '引擎',
  19: '引擎', 20: '引擎', 21: '冷卻', 22: '冷卻', 23: '傳動', 24: '傳動',
  25: '傳動', 26: '傳動', 27: '燃油', 28: '燃油',
};
// 「其他」子分類：依品名關鍵字（優先順序）
const OTHER_RULES = [
  [/中冷器|熱交換器/, 22],
  [/活塞/, 17],
  [/考耳/, 18],
  [/襯套|副樑/, 16],
  [/DSG|Haldex|換檔|傳動軸|小齒輪/, 26],
  [/消音管/, 7],
];
const OTHER_DEFAULT = 20; // 引擎｜其他

// ================= make 映射 =================
const MAKE_MAP = {
  'VOLKSWAGEN': 'Volkswagen', 'VW': 'Volkswagen', 'AUDI': 'Audi', 'BMW': 'BMW',
  'MERCEDES-BENZ': 'Mercedes-Benz', 'MINI': 'Mini', 'TESLA': 'Tesla', 'TOYOTA': 'Toyota',
  'NISSAN': 'Nissan', 'FORD': 'Ford', 'BENTLEY': 'Bentley', 'PORSCHE': 'Porsche', 'LAMBORGHINI': 'Lamborghini',
};

// ================= gen 別名（CTS gen → DB generation ILIKE patterns）====================
const GEN_ALIAS = {
  'Passat CC/CC (B7)': ['Typ 35'],
  'F91/F92/F93': ['G20'],   // 台灣 3 Series (G20 基礎)
  'A91': ['A90'],           // VPF Supra 2021+
};

// ================= model token 提取 =================
const SUFFIX = new Set(['tsi', 'tfsi', 'tdi', 'fsi', 'gti', 'cdi', 'hdi', 'dci', 'ecoboost', 'ti-vct', 'e-tec', 'skyactiv', 'hybrid', 'quattro', '4motion', '4matic', '4matic+', '4x4', 'awd', 'rwd', 'e-tron', 'phev', 'ev', 'v6', 'v8', 'v10', 'w12', 'jcw']);
const BODY = new Set(['sedan', 'coupe', 'touring', 'hatchback', 'sportback', 'avant', 'allroad', 'cabriolet', 'roadster', 'convertible', 'gran', 'turismo', 'gt', 'tourer', 'active', 'shooting', 'brake', 'wagon', 'van', 'limousine', '3-door', '5-door', '4-door', 'clubman', 'countryman', 'paceman', 'hardtop', 'cabrio']);
const DROP_FAMILY = new Set(['series', 'class', 'mini']);
const DOOR_DROP = new Set(['3d', '5d']);

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// 字母↔数字边界插入 \s*（rs4→rs\s*4, a180→a\s*180, 118i→118\s*i, 2.0t→2.0\s*t）
function flex(t) {
  t = escapeRegex(t);
  t = t.replace(/([a-zA-Z])(\d)/g, '$1\\s*$2');
  t = t.replace(/(\d)([a-zA-Z])/g, '$1\\s*$2');
  return t;
}
function buildRegex(token) {
  if (token === 'ttrs') return new RegExp('(?<![\\w])tt\\s*rs(?![\\w])', 'i');
  if (token === 'jcw') return new RegExp('(?<![\\w])john\\s*cooper\\s*works(?![\\w])', 'i');
  const pat = flex(token);
  if (/^\d+$/.test(token)) return new RegExp(`(?<![0-9])${pat}(?![0-9])`, 'i');
  return new RegExp(`(?<![\\w])${pat}(?![\\w])`, 'i');
}

// 依 make 提取 required tokens（全部須出現在 DB model）
function extractTokens(make, model) {
  const tokens = model.split(/\s+/).map(t => t.toLowerCase()).filter(Boolean);
  const req = [];
  if (make === 'Mercedes-Benz') {
    // DB 模型 = 引擎碼（A180/GLA200/C43 AMG）→ 只取數字 token + amg/gt
    for (const t of tokens) {
      if (t === 'amg' || t === 'gt') { req.push(t); continue; }
      if (/\d/.test(t)) req.push(t);
    }
  } else if (make === 'BMW') {
    // DB 模型 = 引擎+車身（320i Sedan）或 家族+引擎（X3 xDrive20i）→ 取數字 token + 車身 token
    for (const t of tokens) {
      if (/series$/.test(t)) continue;
      if (/\d/.test(t) && !DOOR_DROP.has(t)) req.push(t);
      else if (BODY.has(t)) req.push(t);
    }
  } else if (make === 'Mini') {
    // DB 模型 = Cooper/S/One 家族名 → 除 mini 外全取
    for (const t of tokens) if (t !== 'mini') req.push(t);
  } else if (make === 'Tesla') {
    // Model 3 / Model Y → model + 數字
    for (const t of tokens) if (t === 'model' || /\d/.test(t)) req.push(t);
  } else {
    // VW / Audi / Toyota：家族（首個數字 token 前）+ 引擎（數字 token 或 SUFFIX）
    const firstDigit = tokens.findIndex(t => /\d/.test(t));
    if (firstDigit === -1) {
      for (const t of tokens) if (!DROP_FAMILY.has(t)) req.push(t);
    } else {
      for (let i = 0; i < firstDigit; i++) if (!DROP_FAMILY.has(tokens[i])) req.push(tokens[i]);
      for (let i = firstDigit; i < tokens.length; i++) {
        const t = tokens[i];
        if (DOOR_DROP.has(t)) continue;
        if (/\d/.test(t) || SUFFIX.has(t)) req.push(t);
      }
    }
  }
  return req.map(buildRegex);
}

// ================= gen → ILIKE patterns =================
function genPatterns(model, gen) {
  if (!gen) return [];
  // Tesla 驅動型態不當 generation 閘
  if (['LR', 'LR RWD', 'SR/SR+ RWD', 'AWD', 'RWD', 'ALL'].includes(gen)) return [];
  const m = model.toLowerCase();
  // 車型依賴別名：Audi A5/S5/RS5 平台碼 B8/B9 → DB 8T/F5；Q5/SQ5 → 8R/FY
  if (/^(a5|s5|rs5)/.test(m)) {
    if (/^b8/i.test(gen)) return ['8T'];
    if (/^b9/i.test(gen)) return ['F5'];
  }
  if (/^(q5|sq5)/.test(m)) {
    if (/^b8/i.test(gen)) return ['8R'];
    if (/^b9/i.test(gen)) return ['FY'];
  }
  // CTS 資料用錯世代碼：EOS 只有一代（1F）、CC = Typ 35
  if (m === 'eos' && /^mk1/i.test(gen)) return ['1F'];
  if (m === 'cc' && /^mk1/i.test(gen)) return ['Typ 35'];
  if (GEN_ALIAS[gen]) return GEN_ALIAS[gen];
  const pm = gen.match(/^(.*?)\((.*)\)$/);
  let main = pm ? pm[1].trim() : gen;
  const paren = pm ? pm[2] : '';
  const pats = [];
  for (const seg of main.split(/[\s\/]+/)) if (seg) pats.push(seg);
  for (const c of paren.split(/[\s\/]+/)) if (c) pats.push(c);
  return pats;
}

// ================= 讀取資料 =================
async function loadProducts() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/User/Desktop/商品資料庫/Brand/CTS/CTS.xlsx');
  const ws = wb.getWorksheet('Sheet1');
  const products = new Map(); // sku → product
  const fitRows = [];         // xlsx fitment 列
  ws.eachRow((r, rn) => {
    if (rn === 1) return;
    const v = r.values.slice(1);
    const sku = v[0];
    if (!sku) return;
    if (!products.has(sku)) {
      products.set(sku, {
        sku, name: v[1], brand: v[2], cat: v[3], sub: v[4],
        msrp: Number(v[5]), wholesale: Number(v[6]), stock: Number(v[7]),
        desc: v[8], img: v[9],
      });
    }
    if (v[10] && v[11] && v[12] && v[14] != null) {
      fitRows.push({ sku, make: v[10], model: v[11], gen: v[12], year: Number(v[14]) });
    }
  });
  return { products, fitRows };
}

function loadVPF() {
  // CTS_Fitment.csv：SKU,MAKE>MODEL>YEAR>CHASSIS|...
  const text = fs.readFileSync('C:/Users/User/Desktop/商品資料庫/Brand/CTS/CTS_Fitment.csv', 'utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const out = [];
  for (const l of lines.slice(1)) {
    const i = l.indexOf(',');
    const sku = l.slice(0, i).trim();
    const terms = l.slice(i + 1).trim();
    if (!terms) continue;
    for (const t of terms.split('|')) {
      const parts = t.split('>');
      if (parts.length < 3) continue;
      const [make, model, year, chassis] = parts;
      out.push({ sku, make: make.trim(), model: model.trim(), gen: chassis ? chassis.trim() : '', year: Number(year) });
    }
  }
  return out;
}

// ================= 主流程 =================
(async () => {
  const { products, fitRows } = await loadProducts();
  const vpfRows = loadVPF();
  const xlsxFitSkus = new Set(fitRows.map(f => f.sku));
  const vpfOnly = vpfRows.filter(r => !xlsxFitSkus.has(r.sku));
  const allFit = [...fitRows, ...vpfOnly];
  console.log(`產品：${products.size} SKU｜xlsx fitment 列：${fitRows.length}｜VPF 補充列：${vpfOnly.length}｜總 fitment 列：${allFit.length}`);

  // 類別分配
  for (const p of products.values()) {
    let subId = SUB_MAP[p.sub];
    if (!subId && p.sub === '其他') {
      for (const [re, id] of OTHER_RULES) if (re.test(p.name)) { subId = id; break; }
      subId = subId || OTHER_DEFAULT;
    }
    p.subId = subId;
    p.category = CAT_NAME[subId];
  }
  const subDist = {};
  for (const p of products.values()) subDist[`${p.category}｜${p.sub}→${p.subId}`] = (subDist[`${p.category}｜${p.sub}→${p.subId}`] || 0) + 1;
  console.log('\n子類別分布（SKU 數）：');
  for (const [k, n] of Object.entries(subDist).sort((a, b) => b[1] - a[1])) console.log(`  ${k}：${n}`);

  // 載入 DB 變體
  const variants = await prisma.$queryRawUnsafe(
    `SELECT id, make, model, generation, year_start, year_end FROM vehicle_variants`
  );
  const variantsByMake = {};
  for (const v of variants) (variantsByMake[v.make] = variantsByMake[v.make] || []).push(v);
  console.log(`\nDB 變體：${variants.length}`);

  // 匹配
  const matchCache = new Map(); // make|model|gen|year → [ids]
  let matched = 0, zero = 0;
  const zeroSamples = new Map(); // key → count
  const linkCount = {}; // sku → Set
  for (const p of products.values()) linkCount[p.sku] = new Set();
  for (const f of allFit) {
    const dbMake = MAKE_MAP[f.make];
    if (!dbMake) { console.log('未知廠牌：', f.make); continue; }
    const key = `${dbMake}|${f.model}|${f.gen}|${f.year}`;
    if (!matchCache.has(key)) {
      const tokenRes = extractTokens(dbMake, f.model);
      const genPats = genPatterns(f.model, f.gen);
      const cand = variantsByMake[dbMake] || [];
      const ids = [];
      for (const v of cand) {
        if (f.year < v.year_start || f.year > v.year_end) continue;
        if (genPats.length && !genPats.some(p => new RegExp(escapeRegex(p), 'i').test(v.generation))) continue;
        if (!tokenRes.every(re => re.test(v.model))) continue;
        ids.push(v.id);
      }
      matchCache.set(key, ids);
      if (ids.length === 0) {
        zero++;
        const zk = `${f.make}>${f.model}>${f.gen}`;
        zeroSamples.set(zk, (zeroSamples.get(zk) || 0) + 1);
      }
    }
    const ids = matchCache.get(key);
    if (ids.length > 0) {
      matched++;
      for (const id of ids) linkCount[f.sku].add(id);
    }
  }
  console.log(`\nfitment 匹配：${matched}/${allFit.length}（${(100 * matched / allFit.length).toFixed(1)}%）｜零匹配列：${zero}`);
  console.log('\n零匹配 (make>model>gen) TOP 樣本：');
  for (const [k, n] of [...zeroSamples.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${n}× ${k}`);

  // 每 SKU 連結數分布
  const dist = {};
  let totalLinks = 0;
  for (const [sku, s] of Object.entries(linkCount)) {
    const n = s.size;
    dist[n === 0 ? '0' : n <= 5 ? '1-5' : n <= 20 ? '6-20' : n <= 100 ? '21-100' : '100+'] = (dist[n === 0 ? '0' : n <= 5 ? '1-5' : n <= 20 ? '6-20' : n <= 100 ? '21-100' : '100+'] || 0) + 1;
    totalLinks += n;
  }
  console.log('\n每 SKU 相容變體數分布：');
  for (const [k, n] of Object.entries(dist)) console.log(`  ${k}：${n} SKU`);
  console.log('總相容連結（去重）：', totalLinks);

  // 過度匹配檢查：連結數 > 100 的 SKU 樣本
  console.log('\n連結數 >100 的 SKU（過度匹配檢查）：');
  for (const [sku, s] of Object.entries(linkCount)) {
    if (s.size > 100) {
      const p = products.get(sku);
      console.log(`  ${sku}（${p.subId}）→ ${s.size} 變體｜品名：${p.name}`);
    }
  }

  // 跳過項（純檔案存在檢查：xlsx 無圖路徑的 SKU 其圖檔已由 CSV 下載）
  const noImg = [...products.values()].filter(p => !fs.existsSync(`C:/carparts/carparts-api/media/parts/Brand/CTS/${p.sku}.webp`));
  const lowPrice = [...products.values()].filter(p => p.msrp < 100);
  console.log(`\n無圖 SKU（${noImg.length}）：${noImg.map(p => p.sku).join(', ')}`);
  console.log(`msrp<100（${lowPrice.length}）：${lowPrice.map(p => `${p.sku}(${p.msrp})`).join(', ')}`);

  if (!APPLY) { console.log('\n=== 乾跑完成 ==='); await prisma.$disconnect(); return; }

  // ================= 執行匯入 =================
  const importable = [...products.values()].filter(p => fs.existsSync(`C:/carparts/carparts-api/media/parts/Brand/CTS/${p.sku}.webp`));
  console.log(`\n匯入零件：${importable.length}（${products.size - importable.length} 跳過）`);
  const partIds = {};
  for (const p of importable) {
    const isActive = p.msrp >= 100;
    const imgUrl = `/media/parts/Brand/CTS/${p.sku}.webp`;
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO parts (sku, name, brand, subcategory_id, category, image_url, description, msrp_price, wholesale_price, stock_qty, distributor_stock_qty, preorder_lead_time_days, is_active, is_universal)
       VALUES ($1, $2, 'CTS Turbo', $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, false)
       ON CONFLICT (sku) DO UPDATE SET name = $2, subcategory_id = $3, category = $4, image_url = $5, description = $6, msrp_price = $7, wholesale_price = $8, is_active = $10
       RETURNING id`,
      p.sku, p.name, p.subId, p.category, imgUrl, p.desc || '', p.msrp, p.wholesale, p.stock, isActive
    );
    partIds[p.sku] = r[0].id;
  }
  console.log('零件匯入完成');

  let links = 0;
  const linkRows = []; // [part_id, vehicle_id]
  for (const p of importable) {
    const pid = partIds[p.sku];
    for (const vid of linkCount[p.sku]) linkRows.push([pid, vid]);
  }
  console.log(`待寫入相容連結：${linkRows.length}`);
  const BATCH = 500;
  for (let i = 0; i < linkRows.length; i += BATCH) {
    const chunk = linkRows.slice(i, i + BATCH);
    const placeholders = chunk.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`).join(', ');
    await prisma.$queryRawUnsafe(
      `INSERT INTO part_vehicle_compatibility (part_id, vehicle_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      ...chunk.flat()
    );
    links += chunk.length;
  }
  console.log(`相容連結寫入：${links}`);
  await prisma.$disconnect();
  console.log('=== 完成 ===');
})();
