// prisma/seeds/import_kw_suspensions.js — KW Suspensions 避震器/短彈簧 匯入器（可重跑 upsert）
// 用法：node prisma/seeds/import_kw_suspensions.js [--apply]
//   預設 --dry：只統計匹配率不寫入；--apply 才實際寫入
// 資料來源：Dropbox/公司資料/車大師/資料庫/parts_upload_KW.csv（4560 列、2469 SKU、主分類全為「底盤」）
// 子分類分流：CSV 全填「避震器」，但「KW 高低可調短彈簧」152 列依品名改掛「短彈簧」（id 14）
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const CSV_PATH = 'C:/Users/User/Dropbox/公司資料/車大師/資料庫/parts_upload_KW.csv';
const BRAND = 'KW Suspensions';
const WHOLESALE_RATIO = 0.8; // 批發價缺漏 → 建議售價 × 0.8（改此常數重跑即可全批調整）

const SUB_SHOCK = '避震器';   // subcategories.id 13（底盤）
const SUB_SPRING = '短彈簧';  // subcategories.id 14（底盤）

// ---------- CSV 解析（處理引號內換行/逗號） ----------
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ',') { row.push(f); f = ''; }
      else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
      else f += ch;
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

// ---------- 年份解析（YYYY | YYYY-YYYY | YYYY- | -YYYY | -MM/YY） ----------
function parseYears(s) {
  const t = (s || '').trim();
  if (!t) return { ys: null, ye: null };
  let m;
  if ((m = t.match(/^(\d{4})-(\d{4})$/))) return { ys: +m[1], ye: +m[2] };
  if ((m = t.match(/^(\d{4})-/))) return { ys: +m[1], ye: null };
  if ((m = t.match(/^-(\d{2})\/(\d{2})$/))) return { ys: null, ye: 2000 + +m[2] };
  if ((m = t.match(/^-(\d{4})$/))) return { ys: null, ye: +m[1] };
  if ((m = t.match(/^(\d{4})$/))) return { ys: +m[1], ye: +m[1] };
  return { ys: null, ye: null };
}

// ---------- 車型字串解析 ----------
const ROMAN = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8' };
// 平台碼別名：KW 歐規平台碼 → 本站 DB generation 命名（VW 用 Mk 系列）
const PLAT_ALIAS = {
  '1J': ['Mk4'], '1K': ['Mk5', 'Mk6'], '1KM': ['Mk6', 'Mk7'], '5K': ['Mk7'], '5KM': ['Mk7.5'],
  'AU': ['Mk8'], 'CD': ['Mk8'], 'BW': ['Mk2'],
};

function parseVehicleField(raw) {
  // 去除全形括號內容（說明/行銷註記），保留前段
  const head = raw.split('（')[0];
  const bases = [];
  const codes = [];
  // ASCII 括號群組 → 平台碼候選
  const parenRe = /\(([^)]*)\)/g; let m;
  const headNoParen = head.replace(parenRe, (_, inner) => {
    inner.split(/[,/]/).forEach(x => {
      const c = x.trim().toUpperCase();
      if (/^[A-Z]?\d{1,2}[A-Z]?$/.test(c) && c.length <= 4) codes.push(c);
      else if (/^[A-Z]\d[A-Z]$/.test(c)) codes.push(c);
    });
    return ' ';
  });
  // 基礎車型名（逗號分隔；去羅馬數字與衍生詞）
  headNoParen.split(',').forEach(tok => {
    let t = tok.trim();
    if (!t) return;
    // "Golf VI" → base Golf + 代碼 Mk6
    const rm = t.match(/\b([IVX]+)\b\s*$/);
    if (rm && ROMAN[rm[1]]) {
      const n = ROMAN[rm[1]];
      t = t.replace(rm[0], '').trim();
      if (/^(golf|polo|jetta|scirocco|touran)$/i.test(t)) codes.push('Mk' + n);
    }
    t = t.replace(/\b(variant|alltrack|cross)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (t) bases.push(t);
  });
  return { bases, codes: [...new Set(codes)] };
}

async function main() {
  console.log(`== KW 匯入器（${APPLY ? 'APPLY 寫入模式' : 'DRY 只讀模式'}）==`);
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  const header = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const data = rows.slice(1).filter(r => r.length >= header.length && r[idx['SKU']]?.trim());
  console.log('CSV 資料列:', data.length);

  // 分類 lookup
  const cat = await prisma.categories.findFirst({ where: { name: '底盤' } });
  const subs = await prisma.subcategories.findMany({ where: { category_id: cat.id } });
  const subMap = Object.fromEntries(subs.map(s => [s.name.trim(), s.id]));
  const SUB_SHOCK_ID = subMap[SUB_SHOCK], SUB_SPRING_ID = subMap[SUB_SPRING];
  if (!SUB_SHOCK_ID || !SUB_SPRING_ID) throw new Error('找不到底盤的避震器/短彈簧子分類');
  console.log('分類: 底盤(id %d) 避震器=%d 短彈簧=%d', cat.id, SUB_SHOCK_ID, SUB_SPRING_ID);

  // ---- 1) Parts upsert 資料組裝（唯一 SKU）----
  const skuRows = new Map();
  for (const r of data) {
    const sku = r[idx['SKU']].trim();
    if (!skuRows.has(sku)) skuRows.set(sku, r);
  }
  console.log('唯一 SKU:', skuRows.size);
  const springSkus = new Set();
  for (const [sku, r] of skuRows) {
    if ((r[idx['品名']] || '').includes('短彈簧')) springSkus.add(sku);
  }
  console.log('短彈簧 SKU:', springSkus.size, '/ 避震器 SKU:', skuRows.size - springSkus.size);

  // ---- 2) 車型快取（make → variants）----
  // generation 可能是「8P (Mk2)」/「Mk7」/「F20」混合格式 → 抽前導碼正規化
  const genKeysOf = g => {
    const s = String(g || '').toUpperCase().trim();
    if (!s) return [];
    const keys = [s];
    const m = s.match(/^([A-Z]?\d{1,2}[A-Z]?)\b/) || s.match(/^(MK[\d.]+)\b/);
    if (m && m[1] !== s) keys.push(m[1]);
    return keys;
  };
  const csvMakes = [...new Set(data.map(r => r[idx['廠牌']].trim()).filter(Boolean))];
  const variantCache = {}; // make → [{id, model, genKeys, ys, ye}]
  const genSets = {};      // make → Set(所有 generation 鍵)：過濾 KW 內部碼誤配
  for (const mk of csvMakes) {
    const vs = await prisma.vehicleVariant.findMany({
      where: { make: { equals: mk, mode: 'insensitive' } },
      select: { id: true, model: true, generation: true, year_start: true, year_end: true },
    });
    variantCache[mk] = vs.map(v => ({ id: v.id, model: v.model || '', genKeys: genKeysOf(v.generation), ys: v.year_start ?? 1900, ye: v.year_end ?? 2100 }));
    genSets[mk] = new Set(variantCache[mk].flatMap(v => v.genKeys));
  }

  // ---- 3) 相容匹配 v2：有效平台碼優先，名字輔助，年份收斂 ----
  const pairSet = new Set(); // sku:variantId
  const stats = { rows: 0, matched: 0, empty: 0, byCodeOnly: 0, byNameCode: 0, byNameOnly: 0, unmatchedByMake: {}, samples: [] };
  for (const r of data) {
    stats.rows++;
    const sku = r[idx['SKU']].trim();
    const make = r[idx['廠牌']].trim();
    const vfRaw = r[idx['車型']] || '';
    const { ys, ye } = parseYears(r[idx['年份']]);
    if (!skuRows.has(sku)) continue;
    if (!make || !vfRaw.trim()) { stats.empty++; continue; }

    const pool = variantCache[make] || [];
    const gens = genSets[make] || new Set();
    const vf = parseVehicleField(vfRaw);

    // BMW 系列號：「3er / 3-series」→ 3 → DB model 前綴「3-Series」
    let seriesPrefix = null;
    const sm = vfRaw.match(/\b(\d)\s*(?:er\b|-\s*series|series)/i);
    if (sm) seriesPrefix = `${sm[1]}-Series`;

    // 名字候選
    let nameCands = [];
    if (seriesPrefix) {
      nameCands = pool.filter(v => (v.model || '').toLowerCase().startsWith(seriesPrefix.toLowerCase()));
    }
    if (!nameCands.length) {
      for (const base of vf.bases) {
        const b = base.toLowerCase();
        const hit = pool.filter(v => {
          const m = (v.model || '').toLowerCase();
          return m === b || m.startsWith(b + ' ');
        });
        if (hit.length) { nameCands = nameCands.concat(hit); break; } // 第一個有命中的 base 即可
      }
    }
    // 有效平台碼（只認 DB 該廠牌真的存在的 generation）
    const validCodes = vf.codes.filter(c => gens.has(c));
    let cand = [];
    if (validCodes.length) {
      const allowed = new Set(validCodes.flatMap(c => [c, ...(PLAT_ALIAS[c] || []).map(x => x.toUpperCase())]));
      const codeCands = pool.filter(v => v.genKeys.some(k => allowed.has(k)));
      if (nameCands.length) {
        const inter = nameCands.filter(v => v.genKeys.some(k => allowed.has(k)));
        cand = inter.length ? inter : codeCands; // 名字∩碼；交集空（如 RS3 vs A3 trim 名）→ 純碼
        if (inter.length) stats.byNameCode++; else stats.byCodeOnly++;
      } else {
        cand = codeCands; stats.byCodeOnly++;
      }
    } else {
      cand = nameCands; if (cand.length) stats.byNameOnly++;
    }

    // 年份過濾（只收斂不清零：過濾後為空就保留原候選）
    if (ys !== null || ye !== null) {
      const yHit = cand.filter(v => {
        if (ys !== null && ye !== null) return !(ye < v.ys || ys > v.ye);
        if (ys !== null) return ys <= v.ye;
        return v.ys <= (ye ?? 2100);
      });
      if (yHit.length) cand = yHit;
    }

    if (cand.length) {
      stats.matched++;
      cand.forEach(v => pairSet.add(`${sku}:${v.id}`));
    } else {
      stats.unmatchedByMake[make] = (stats.unmatchedByMake[make] || 0) + 1;
      if (stats.samples.length < 15) stats.samples.push(`${sku} [${make}] ${vfRaw.slice(0, 60)} 年份:${ys}-${ye}`);
    }
  }
  console.log('--- 匹配統計 ---');
  console.log(`列數 ${stats.rows}，成功 ${stats.matched}，無匹配 ${data.length - stats.matched - stats.empty}，空欄 ${stats.empty}`);
  console.log(`策略分布: 名字×碼 ${stats.byNameCode} / 純碼 ${stats.byCodeOnly} / 純名 ${stats.byNameOnly}`);
  console.log('配對數(part:vehicle):', pairSet.size);
  console.log('未匹配 Top 廠牌:', JSON.stringify(Object.fromEntries(Object.entries(stats.unmatchedByMake).sort((a, b) => b[1] - a[1]).slice(0, 8))));
  console.log('未匹配樣本:');
  stats.samples.forEach(s => console.log('  ', s));

  if (!APPLY) {
    console.log('\n(DRY 完成——確認匹配率後加 --apply 執行寫入)');
    await prisma.$disconnect();
    return;
  }

  // ---- 4) 寫入 Parts ----
  let created = 0, updated = 0;
  const skuToId = {};
  for (const [sku, r] of skuRows) {
    const name = r[idx['品名']].trim();
    const msrp = parseInt(String(r[idx['建議售價']] || '0').replace(/[^\d]/g, '')) || 0;
    const wspRaw = String(r[idx['車廠批發僬']] || r[idx['車廠批發價']] || '').trim();
    const wholesale = wspRaw ? (parseInt(wspRaw.replace(/[^\d]/g, '')) || Math.round(msrp * WHOLESALE_RATIO)) : Math.round(msrp * WHOLESALE_RATIO);
    const stock = parseInt(r[idx['庫存數量']] || '0') || 0;
    const desc = (r[idx['商品說明']] || '').trim() || null;
    const subId = springSkus.has(sku) ? SUB_SPRING_ID : SUB_SHOCK_ID;
    const ex = await prisma.part.findUnique({ where: { sku } });
    if (ex) {
      await prisma.part.update({
        where: { sku },
        data: { name, brand: BRAND, subcategory_id: subId, category: '底盤', msrp_price: msrp, wholesale_price: wholesale, stock_qty: stock, description: desc },
      });
      updated++;
    } else {
      const p = await prisma.part.create({
        data: { sku, name, brand: BRAND, subcategory_id: subId, category: '底盤', msrp_price: msrp, wholesale_price: wholesale, stock_qty: stock, description: desc },
      });
      skuToId[sku] = p.id;
      created++;
    }
  }
  // 補齊既有品的 id
  const allParts = await prisma.part.findMany({ where: { sku: { in: [...skuRows.keys()] } }, select: { id: true, sku: true } });
  allParts.forEach(p => { skuToId[p.sku] = p.id; });

  // ---- 5) 寫入相容連結（createMany skipDuplicates 幂等）----
  const pairs = [...pairSet].map(k => { const [sku, vid] = k.split(':'); return { part_id: skuToId[sku], vehicle_id: +vid }; }).filter(x => x.part_id);
  let compatCreated = 0;
  for (let i = 0; i < pairs.length; i += 1000) {
    const chunk = pairs.slice(i, i + 1000);
    const res = await prisma.partCompatibility.createMany({ data: chunk, skipDuplicates: true });
    compatCreated += res.count;
  }
  console.log(`\n== 寫入完成 ==`);
  console.log(`Parts 新增 ${created} / 更新 ${updated}；相容連結新增 ${compatCreated}（總配對 ${pairs.length}）`);

  const kwCount = await prisma.part.count({ where: { brand: BRAND } });
  const shockCnt = await prisma.part.count({ where: { brand: BRAND, subcategory_id: SUB_SHOCK_ID } });
  const springCnt = await prisma.part.count({ where: { brand: BRAND, subcategory_id: SUB_SPRING_ID } });
  const compatCnt = await prisma.partCompatibility.count({ where: { part: { brand: BRAND } } });
  console.log(`DB 現況：KW 商品 ${kwCount}（避震器 ${shockCnt}／短彈簧 ${springCnt}）、KW 相容連結 ${compatCnt}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
