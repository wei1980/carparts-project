/**
 * bilstein_dryrun.js — BILSTEIN 匯入 dry-run（不寫入 DB，只產生報告）
 *
 * 目的：在真的匯入前，先讓人看 50 筆的組裝結果：
 *   - 商品名稱（CSV 的 name 欄位品質不齊，需組裝）
 *   - 分類對應（subcategory → 避震器 / 短彈簧）
 *   - 價格換算（EUR → TWD）
 *   - 車型匹配率（BILSTEIN 的 Manufacturer/Model → DB 的 vehicle_variants）
 *
 * 用法：
 *   node scripts/bilstein_dryrun.js            # 前 50 筆
 *   node scripts/bilstein_dryrun.js --limit 200
 *   node scripts/bilstein_dryrun.js --offset 50 --limit 50
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();
const CSV = 'C:/Users/User/Desktop/商品資料庫/AI下載/BILSTEIN/Parts_BILSTEIN_V10_final.csv';

// 可調參數（dry-run 用預設值，實際匯入時再確認）
const EUR_TO_TWD = 35;        // 1 EUR ≈ 35 TWD
const MARKUP = 1.2;           // 零售加成
const WHOLESALE_RATIO = 0.9;  // 批發 = 零售 × 0.9
const STOCK = 0;              // 進貨價未知，先 0

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  const inline = args.find(a => a.startsWith(name + '='));
  return inline ? inline.split('=')[1] : def;
};
const LIMIT = parseInt(argVal('--limit', '50'), 10);
const OFFSET = parseInt(argVal('--offset', '0'), 10);
const OUT = argVal('--out', '');

// ── 品牌正規化（BILSTEIN 用 VW/Skoda，DB 用 Volkswagen/Skoda）──
const MAKE_ALIAS = {
  'vw': 'Volkswagen',
  'volkswagen': 'Volkswagen',
  'skoda': 'Skoda',
  'mercedes-benz': 'Mercedes-Benz',
  'mercedes benz': 'Mercedes-Benz',
  'mercedes': 'Mercedes-Benz',
  'bmw': 'BMW',
  'audi': 'Audi',
  'opel': 'Opel',
  'peugeot': 'Peugeot',
  'ford': 'Ford',
  'kia': 'Kia',
  'porsche': 'Porsche',
  'alfa romeo': 'Alfa Romeo',
  'land rover': 'Land Rover',
  'mini': 'Mini',
  'saab': 'Saab',
  'seat': 'SEAT',
};
const normMake = (s) => {
  const k = String(s || '').trim().toLowerCase();
  return MAKE_ALIAS[k] || (s ? s.trim() : '');
};

// ── 底盤碼抽取 ──
// BILSTEIN 的 Model 是 "Giulia (952)"，DB 是 model="Giulia 2.0 T" + generation="Type 952"。
// 直接比對 model 字串永遠碰不到（0% 命中）。
// 改：從括號抽底盤碼（952），再跟 DB 的 generation 比（"Type 952" 含 952）。
function chassisCodes(s) {
  const out = [];
  const str = String(s || '');
  // 括號內的：Giulia (952) / A3 (8P)
  for (const m of str.matchAll(/\(([^)]{2,12})\)/g)) out.push(m[1].trim().toUpperCase());
  // 沒有括號時，用空白分隔的短碼：A3 8P Sportback
  for (const m of str.matchAll(/([A-Z]{1,3}[0-9]{1,3}[A-Z]?)/g)) out.push(m[1].trim().toUpperCase());
  return out;
}
// DB 的 generation 正規化：Type 952 → 952；8X → 8X
function genCode(g) {
  return String(g || '').replace(/^Type\s*/i, '').trim().toUpperCase();
}

// 模型關鍵字（不含引擎/年份）：Giulia 2.0 T → giulia
function modelKeys(s) {
  return String(s || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\d+(\.\d+)?\s*(L|cc|cm3|liter|litre)/gi, ' ')
    .replace(/(TSI|TFSI|TDI|JTS|VVT|MK\d?|Mk\d|4MOTION|AWD| quattro|xDrive|2WD|4WD)/gi, ' ')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w.length >= 3).map(w => w.toLowerCase());
}

// ── 產品線：以 SKU 前兩碼為準（BILSTEIN 官方目錄的編號規則）──
// 實證來源：bilstein 官方 2014 application guide / bilstein-shop.com / autodoc
//   19-, 22- → B4（OE Replacement / Sport）
//   24-, 26-, 34-, 20-, 23- → B6 / B6 HD（Heavy Duty）
//   35- → B8
//   46- → B12 Pro-Kit（避震器 + 短彈簧 整套）
//   47- → B14 PSS
//   48- → B16 PSS9 / PSS10
//   49- → B16 DampTronic（電子式）
//   11- → Dust Protection Kit（防塵套）
//   14- → Deactivation Module（電子阻尼解除模組）
//   53- → Suspension Kit（其他整套）
//  其餘（12/15/16/17/21/25/27/28/29/33/41/44/89-）→ 依 name 判斷，未知標 B6 通用
const PREFIX_LINE = {
  '19': 'B4', '22': 'B4', '24': 'B4',
  '26': 'B6', '34': 'B6', '20': 'B6', '23': 'B6',
  '35': 'B8',
  '46': 'B12',
  '47': 'B14',
  '48': 'B16',
  '49': 'B16 DampTronic',
  '11': 'Dust Kit',
  '14': 'Damper Module',
  '53': 'Suspension Kit',
};
const LINE_ZH = {
  'B4': 'B4 原廠替換型',
  'B6': 'B6 運動型',
  'B8': 'B8 賽車型',
  'B12': 'B12 避震器',
  'B14': 'B14 可調避震器',
  'B16': 'B16 可調避震器',
  'B16 DampTronic': 'B16 電子可調',
  'Dust Kit': '防塵套',
  'Damper Module': '阻尼解除模組',
  'Suspension Kit': '全套避震懸吊',
  '': '避震器',
};
// 解析產品線（多來源，依序）：
//   1. name 明確寫 B4/B6/B8/B12/B14/B16 → 最可信
//   2. debug_note 的 SKU_Force(XX)
//   3. paired article number 指向的 SKU（同一產品線、不同軸）
//   4. SKU 前綴表
const FORCE_RE = /SKU_Force\(([^)]+)\)/;
const PAIRED_RE = /paired article number:\s*(\d\d-\d+)/;
function lineOf(row, skuIndex) {
  const name = String(row.name || '');
  const sku = String(row.sku || '');

  const fromName = (name.match(/(B1[0-9]|B[4-8])/) || [])[1] || '';
  if (fromName) return fromName.toUpperCase();

  const fromForce = (String(row.debug_note || '').match(FORCE_RE) || [])[1] || '';
  if (fromForce) return fromForce.toUpperCase();

  const paired = (name.match(PAIRED_RE) || [])[1] || '';
  if (paired && skuIndex.has(paired)) {
    const other = skuIndex.get(paired);
    const f = (String(other.debug_note || '').match(FORCE_RE) || [])[1]
           || (String(other.name || '').match(/(B1[0-9]|B[4-8])/) || [])[1] || '';
    if (f) return f.toUpperCase();
    const pfx = PREFIX_LINE[paired.slice(0, 2)];
    if (pfx) return pfx;
  }

  return PREFIX_LINE[sku.slice(0, 2)] || '';
}

// ── 產品線：從 name 抽 B4/B6/B8/B10/B12/B16/Performance ──
const LINE_RE = /\b(B4|B6|B8|B10|B12|B14|B16|B6C|B8\s?Performance(?:\s?Plus)?|Performance(?:\s?Plus)?|Sport|M Sport dampers?)\b/i;
const POSITION_RE = /\b(front|rear)\s+axle\b/i;
function productLine(name, subcategory) {
  const m = String(name).match(LINE_RE);
  let line = m ? m[1].replace(/\s+/g, ' ') : '';
  if (!line) {
    if (/Suspension Kit/i.test(subcategory)) line = 'Suspension Kit';
    else if (/B4|OE Replacement/i.test(name)) line = 'B4 OE Replacement';
    else line = '';
  }
  return line;
}
function position(name) {
  const m = String(name).match(POSITION_RE);
  if (!m) return '';
  return /^front/i.test(m[1]) ? '前' : '後';
}

// 位置（前/後）只顯示「有依據」的：
//   1. name 明確寫 Front Axle / Rear Axle
//   2. paired article number → 對方有寫位置 → 顛倒
// 刻意「不」用前綴猜：實測 4,180 個 SKU 只有 19% name 明確標位置、7% 是 paired、
// 其餘 72% 完全沒有資訊。用前綴猜會把大部分商品標錯
// （例：24-004657 是 Alfa Romeo Giulietta，CSV 沒寫前/後）。
// 寧可少顯示一個字，也不要標錯讓客戶買錯。
function positionOf(row, skuIndex, seen) {
  const visited = seen || new Set();
  const sku = String(row.sku || '');
  if (visited.has(sku)) return '';   // paired 可能互指（A→B→A），必須有防護
  visited.add(sku);

  // 1. name 明確寫 Front/Rear Axle
  const own = position(row.name);
  if (own) return own;
  // 2. debug_note 保留了 CSV 被逗號截斷前的完整 Fitting Position（覆蓋率 31%，優於 name 的 19%）
  const dn = String(row.debug_note || '');
  if (/Fitting Position:\s*Rear/i.test(dn)) return '後';
  if (/Fitting Position:\s*Front/i.test(dn)) return '前';
  // 3. paired article → 對方有寫位置 → 顛倒
  const paired = (String(row.name || '').match(PAIRED_RE) || [])[1] || '';
  if (paired && skuIndex.has(paired)) {
    const otherPos = positionOf(skuIndex.get(paired), skuIndex, visited);
    if (otherPos) return otherPos === '前' ? '後' : '前';
  }
  // 刻意不靠前綴猜：前綴與軸的相關性不穩（24- 後方佔 32%、35- 佔 79%），
  // 猜錯會讓客戶買錯。寧可不顯示。
  return '';
}

// ── 名稱組裝（中文）──
// 使用者要求：商品名稱要翻成中文，例：46-000071 → "Bilstein B12 避震器"
// 規則：Bilstein {產品線中文名} {位置} {品項}
//   46-000071 → Bilstein B12 避震器
//   19-169200 → Bilstein B4 原廠替代 避震器
//   24-128797 → Bilstein B6 運動型 前 避震器
//   11-270256 → Bilstein 防塵套
const ITEM_ZH = [
  [/^Dust Protection Kit/i, '防塵套'],
  [/^Deactivation Module/i, '阻尼解除模組'],
  // 「paired article number」= 前後成對的另一支，本身還是避震器，不是別的品項
  [/^paired article number/i, '避震器'],
  [/^Item is replaced by/i, '避震器'],
  [/^Item replaces/i, '避震器'],
  [/^Suspension Kit/i, '全套避震懸吊'],
  [/Shock Absorber/i, '避震器'],
];
function itemZh(name) {
  for (const [re, zh] of ITEM_ZH) if (re.test(name)) return zh;
  return '避震器';
}

function buildName(row, skuIndex) {
  const sku = String(row.sku || '').trim();
  const line = lineOf(row, skuIndex);
  const lineZh = LINE_ZH[line] || '避震器';
  const pos = positionOf(row, skuIndex);     // '前' / '後' / ''
  const item = itemZh(String(row.name || ''));   // '避震器' / '防塵套' / '全套避震懸吊'

  // 使用者指定格式（無多餘空白）：
  //   倍適登 Bilstein B4 原廠替換型後避震器
  //   倍適登 Bilstein B12 避震器
  // LINE_ZH 的值已含產品線代號（"B4 原廠替換型"），不要再補 line
  // B12 / 防塵套 / 阻尼模組 / 全套：LINE_ZH 自帶品項，直接回
  // LINE_ZH 已含品項的（B12/B14/B16 含「避震器」、防塵套、阻尼模組）→ 直接回，不再加品項
  if (lineZh.includes('避震器') || line === 'Dust Kit' || line === 'Damper Module') {
    return `倍適登 Bilstein ${lineZh}`;
  }
  // B4/B6/B8 等：產品線中文名 + 位置 + 品項，無空白串接
  return `倍適登 Bilstein ${lineZh}${pos}${item}`;
}

// ── 分類對應 ──
const SUBCAT_MAP = {
  'Shock Absorber': 13,           // 避震器
  'Suspension Kit, complete': 13, // 整套 → 避震器
  'Suspension Parts': 18,         // 其他懸吊件
};
const SUBCAT_LABEL = { 13: '避震器', 14: '短彈簧', 18: '其他' };

// ── 價格換算（進位到百元）──
function priceOf(eur) {
  const n = Number(String(eur).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return { msrp: 0, wholesale: 0 };
  const raw = n * EUR_TO_TWD * MARKUP;
  const msrp = Math.ceil(raw / 100) * 100;
  return { msrp, wholesale: Math.round(msrp * WHOLESALE_RATIO / 10) * 10 };
}

(async () => {
  console.log('BILSTEIN dry-run');
  console.log(`  CSV      : ${CSV}`);
  console.log(`  參數     : EUR→TWD ×${EUR_TO_TWD}, 加成 ×${MARKUP}, 批發 ×${WHOLESALE_RATIO}`);
  console.log(`  範圍     : offset ${OFFSET}, ${LIMIT} 筆\n`);

  if (!fs.existsSync(CSV)) {
    console.error('❌ 找不到 CSV');
    process.exit(1);
  }

  const rows = parse(fs.readFileSync(CSV, 'utf8'), {
    columns: true, skip_empty_lines: true, trim: true,
  });

  // 依 SKU 去重（取第一筆作為商品代表，車型合併）
  // sku → 代表列（paired article 解析要用 debug_note / name）
  const skuIndex = new Map();
  for (const r of rows) {
    const s = String(r.sku || '').trim();
    if (s && !skuIndex.has(s)) skuIndex.set(s, r);
  }

  const bySku = new Map();
  for (const r of rows) {
    const sku = String(r.sku || '').trim();
    if (!sku) continue;
    if (!bySku.has(sku)) bySku.set(sku, { row: r, vehicles: [] });
    // ⚠️ CSV 的 Model 欄位被逗號截斷（"A6 C5 (4B2, 4B4)" → "A6 C5 (4B2, 4"）。
    //    Model_Series 是完整值 → 一律以它為準，Model 只當 fallback。
    const series = String(r.Model_Series || '').trim();
    const modelRaw = String(r.Model || '').trim();
    const model = series || modelRaw;
    if (model) bySku.get(sku).vehicles.push({
      make: normMake(r.Manufacturer), model,
      series, from: String(r.From_to || '').trim(),
    });
  }
  const all = [...bySku.values()];
  console.log(`  CSV 總列: ${rows.length} | 唯一 SKU: ${all.length}\n`);

  const slice = all.slice(OFFSET, OFFSET + LIMIT);

  // DB 車型索引（用來算匹配率）
  const dbMakes = await prisma.vehicleVariant.findMany({
    select: { make: true }, distinct: ['make'],
  });
  const dbMakeSet = new Set(dbMakes.map(x => x.make.toLowerCase()));

  // 取 DB 車型樣本（每個 make 前 40 筆）
  // DB 車型：用 make 分組，比對時同時看「底盤碼」與「模型關鍵字」
  const dbVariants = await prisma.vehicleVariant.findMany({
    select: { id: true, make: true, model: true, generation: true },
  });
  const byMake = new Map();
  for (const v of dbVariants) {
    const mk = String(v.make).toLowerCase();
    if (!byMake.has(mk)) byMake.set(mk, []);
    byMake.get(mk).push({ ...v, gen: genCode(v.generation) });
  }

  const out = [];
  let matchedSkus = 0, totalPairs = 0, matchedPairs = 0;

  for (const { row, vehicles } of slice) {
    const subcatId = SUBCAT_MAP[String(row.subcategory || '').trim()] || null;
    const pr = priceOf(row.msrp_eur);
    const name = buildName(row, skuIndex);

    // 車型匹配：make 級 + 底盤碼級 + 模型關鍵字級
    const hits = [];
    for (const v of vehicles) {
      const mk = String(v.make).toLowerCase();
      if (!dbMakeSet.has(mk)) continue;
      const pool = byMake.get(mk) || [];
      const codes = chassisCodes(v.model);
      const keys = modelKeys(v.model);
      let chassisHit = 0, keyHit = 0;
      for (const cand of pool) {
        if (codes.length && codes.some(c => cand.gen && cand.gen.includes(c))) chassisHit++;
        if (keys.length) {
          const cm = String(cand.model).toLowerCase();
          const strong = keys.filter(k => k.length >= 4);
          if (strong.length && strong.every(k => cm.includes(k))) keyHit++;
        }
      }
      hits.push({
        make: v.make, model: v.model, codes,
        chassisMatched: chassisHit > 0,
        modelMatched: chassisHit > 0 || keyHit > 0,
        n: Math.max(chassisHit, keyHit),
      });
    }
    totalPairs += vehicles.length;
    const good = hits.filter(h => h.modelMatched);
    matchedPairs += good.length;
    if (hits.length > 0) matchedSkus++;

    // 每個 SKU 的完整車型清單（供人工核對）
    const vehicleList = vehicles.map(v => {
      const h = hits.find(x => x.make === v.make && x.model === v.model);
      const mark = h ? (h.modelMatched ? `✅${h.chassisMatched ? '(底盤碼)' : '(關鍵字)'}` : '❌') : '—';
      return `${v.make} ${v.model}${v.series && v.series !== v.model ? ` [${v.series}]` : ''} ${mark}`;
    });

    out.push({
      sku: row.sku,
      name,
      subcat: subcatId,
      subcatLabel: subcatId ? SUBCAT_LABEL[subcatId] : '❌ 未對應',
      eur: row.msrp_eur,
      msrp: pr.msrp,
      wholesale: pr.wholesale,
      img: row.image_file || '',
      imgUrl: String(row.image_url || '').slice(0, 120),
      imgOk: fs.existsSync(path.join(path.dirname(CSV), 'images', path.basename(String(row.image_file || '')))),
      vehicles: vehicles.length,
      makeMatched: hits.length,
      modelMatched: good.length,
      vehicleList,
      sample: good.slice(0, 2).map(g => `${g.make} ${g.model}`).join(' / '),
    });
  }

  // 輸出報告
  console.log('='.repeat(150));
  for (const o of out) {
    console.log(`#${o.sku.padEnd(14)} ${o.name.slice(0, 62).padEnd(62)}`);
    console.log(`    分類 ${o.subcatLabel.padEnd(5)} | EUR ${String(o.eur).padStart(7)} → 售 ${String(o.msrp).padStart(6)} 批 ${String(o.wholesale).padStart(6)} | 圖 ${o.imgOk ? '✅' : '❌'} | 車型 ${o.makeMatched}/${o.vehicles} make, ${o.modelMatched}/${o.vehicles} model`);
    if (o.sample) console.log(`    例: ${o.sample}`);
  }

  console.log('\n' + '='.repeat(150));
  const totalMake = out.reduce((s, o) => s + o.makeMatched, 0);
  const totalVeh = out.reduce((s, o) => s + o.vehicles, 0);
  console.log(`本次 ${out.length} 個 SKU`);
  console.log(`  分類對應成功 : ${out.filter(o => o.subcat).length}/${out.length}`);
  console.log(`  圖片存在     : ${out.filter(o => o.imgOk).length}/${out.length}`);
  console.log(`  有價格       : ${out.filter(o => o.msrp > 0).length}/${out.length}`);
  console.log(`  車型 make 命中: ${totalMake}/${totalVeh} (${(totalMake * 100 / (totalVeh || 1)).toFixed(1)}%)`);
  console.log(`  車型 model 命中: ${matchedPairs}/${totalPairs} (${(matchedPairs * 100 / (totalPairs || 1)).toFixed(1)}%)`);
  const noPrice = out.filter(o => !o.msrp);
  if (noPrice.length) console.log(`  ⚠️ 無價格的 SKU: ${noPrice.map(o => o.sku).join(', ')}`);
  const noImg = out.filter(o => !o.imgOk);
  if (noImg.length) console.log(`  ⚠️ 無圖片的 SKU: ${noImg.slice(0, 5).map(o => o.sku).join(', ')}`);

  // ── 輸出完整明細 CSV（含每個 SKU 的完整車型清單）──
  if (OUT) {
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const header = ['sku', 'name', 'brand', 'subcategory_id', 'subcategory_label', 'msrp_eur',
                    'msrp_twd', 'wholesale_twd', 'image_file', 'image_exists',
                    'vehicle_count', 'make_matched', 'model_matched', 'vehicles_detail'];
    const lines = [header.join(',')];
    for (const o of out) {
      lines.push([
        q(o.sku), q(o.name), q('BILSTEIN'), q(o.subcat ?? ''), q(o.subcatLabel),
        q(o.eur), q(o.msrp), q(o.wholesale), q(o.img), q(o.imgOk ? 'YES' : 'NO'),
        q(o.vehicles), q(o.makeMatched), q(o.modelMatched),
        q(o.vehicleList.join(' | ')),
      ].join(','));
    }
    fs.writeFileSync(OUT, '\ufeff' + lines.join('\r\n'), 'utf8');
    const abs = path.resolve(OUT);
    console.log(`\n📄 已輸出完整明細: ${abs}`);
    console.log(`   ${out.length} 筆 | ${(fs.statSync(abs).size / 1024).toFixed(0)} KB`);
  }

  await prisma.$disconnect();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });