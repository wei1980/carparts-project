// EBC 來令片上架主腳本（v2）
// 來源：media/parts/Brake/pads/EBC/EBC_data/{EBC_UK.csv, EBC_Caliper.csv, EBC_price.xlsx}
// 用法:
//   node import_ebc_pads2.js --analyze              只統計不寫入
//   node import_ebc_pads2.js --apply                寫入（冪等 upsert，可重跑）
//   node import_ebc_pads2.js --apply --only=uk      只跑 UK 來令片
//   node import_ebc_pads2.js --apply --only=caliper 只跑卡鉗+卡鉗來令片
//
// 商業規則（用戶指定 + EBC_price.xlsx 公式解析）:
//   售價 = ROUNDUP( MAX( USD_NEWRETAIL*0.6*1.1*32, GBP_Trade*44 ) + 2300, -2 )
//     （L=N*0.6*1.1、L2=32 美元匯率；M=M2*O、M2=44 英鎊匯率；J2=2300 營業費用；ROUNDUP -2 進位百位）
//   無成本料號 → 建檔但 is_active=false（待補價啟用）
//   批發價 = 售價×0.9 進位百位（站方 CTS 同規則）
//   UK 來令片: 分前/後輪、名稱「EBC黃皮 前輪來令片」、說明含碟盤規格、不標車型
//   Caliper 來令片: 不分前後輪、名稱「EBC黃皮來令片 適用卡鉗型號」、PartCaliperFitment 關聯卡鉗
//   卡鉗: 建到「改裝件 > 煞車系統-卡鉗」分類（is_active=false，本體非販售品）
//   相容關聯: EBC_UK.csv 車型對 DB 台規 variant 自動匹配（~55%），只建匹配到的
const fs = require('fs');
const path = require('path');
const XLSX = require('C:/carparts/carparts-api/node_modules/xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DATA = path.join(__dirname, '../../media/parts/Brake/pads/EBC/EBC_data');
const IMG = '/media/parts/Brake/pads/EBC';
const MODE = process.argv.includes('--apply') ? 'apply' : 'analyze';
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
const OVERHEAD = 2300, USD_RATE = 32, GBP_RATE = 44;

const MAKE_ALIAS = { 'MERCEDES-BENZ COMMERCIAL': 'Mercedes-Benz', 'VW': 'Volkswagen', 'BENZ': 'Mercedes-Benz' };
const normMake = m => MAKE_ALIAS[m.trim().toUpperCase()] || m.trim();

// ═══ 台規來令片 override（2026-08-25）═══
// 官方 CSV 同一車型同一輪位可能列出多組料號（對應不同卡鉗/碟盤選配），但一台車同一輪位
// 實際只裝一種規格。此表限定台灣市場規格：命中的車型只允許 allowProfiles 清單的「型狀碼」
// 建立相容連結；同型狀的四系列姊妹料號（DP2 綠/DP3 紅/DP4 黃/DP5 藍）都放行，其他規格
// 仍正常建檔上架（賣給其他適用車），只是不連到該車型。
// 案例：Golf R Mk8 (CD) 台灣前輪=ZF-TRW 310mm 卡鉗 → 型狀 2448（黃皮 DP42448R）、
// 後輪=ATE → 型狀 2438（DP42438R）；CSV 另列 TRW 340mm 大碟 → 2127（DP42127R 等）
// 為歐洲選配大煞車套件（row19283），台規不採用。
const TW_PAD_OVERRIDE = [
  { make: 'VOLKSWAGEN', modelRe: /^GOLF R\b/, genRe: /\bMK8\b/, pos: '前輪', allowProfiles: ['2448'] },
  { make: 'VOLKSWAGEN', modelRe: /^GOLF R\b/, genRe: /\bMK8\b/, pos: '後輪', allowProfiles: ['2438'] },
];
let VMAP = new Map(); // variant_id → variant（override 查表用）
function twPadSuppressed(vehicleId, code, pos) {
  const v = VMAP.get(vehicleId);
  if (!v) return false;
  const mk = normMake(v.make).toUpperCase();
  const mdl = (v.model || '').toUpperCase();
  const gn = (v.generation || '').toUpperCase();
  const clean = String(code).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  // 料號結構：DP + 系列碼(2/3/4/5) + 型狀碼(4位)；取型狀碼判斷
  const pm = clean.match(/^DP\d(\d{4})/);
  return TW_PAD_OVERRIDE.some(r =>
    r.pos === pos && r.make === mk && r.modelRe.test(mdl) && r.genRe.test(gn) &&
    !(pm && r.allowProfiles.includes(pm[1])));
}

function loadPriceDb() {
  const wb = XLSX.readFile(path.join(DATA, 'EBC_price.xlsx'));
  const db = XLSX.utils.sheet_to_json(wb.Sheets['資料庫'], { header: 1, defval: '' });
  // 對照 xlsx 公式：
  //   N（美國批發）= VLOOKUP(料號, 資料庫!$D$1:$E$…) → D=ItemCode, E=NEWRETAIL（美金原值）
  //   O（英國批發）= VLOOKUP(料號, 資料庫!$A$1:$B$…) → A=Code,    B=UK Trade（英鎊原值）
  //   ⚠️ G/H 欄是另一份價目表，不是英鎊來源（2026-08-25 修正：原誤用 G/H 導致全站價格偏低）
  const usd = new Map(), gbp = new Map();
  for (const r of db) {
    if (r[3] && r[4] !== '') usd.set(String(r[3]).trim(), Number(r[4]));  // D/E
    if (r[0] && r[1] !== '') gbp.set(String(r[0]).trim(), Number(r[1])); // A/B ← 正確英鎊來源
  }
  return { usd, gbp };
}

function calcPrice(code, { usd, gbp }) {
  const u = usd.has(code) ? usd.get(code) * 0.6 * 1.1 * USD_RATE : null;
  const g = gbp.has(code) ? gbp.get(code) * GBP_RATE : null;
  if (u == null && g == null) return null;
  const raw = Math.max(u || 0, g || 0) + OVERHEAD;
  return Math.ceil(raw / 100) * 100;
}

const STUFF = [
  { col: 'EBC Front Greenstuff 2000 Pads', pos: '前輪', cn: '綠皮', key: 'GREEN',  img: `${IMG}/EBC_Green.webp`, pre: 'EBC-GRN' },
  { col: 'EBC Front Redstuff Pads',        pos: '前輪', cn: '紅皮', key: 'RED',    img: `${IMG}/EBC_Red.webp`,   pre: 'EBC-RED' },
  { col: 'EBC Front Yellowstuff Pads',     pos: '前輪', cn: '黃皮', key: 'YELLOW', img: `${IMG}/EBC_Yellow.webp`,pre: 'EBC-YLW' },
  { col: 'EBC Front Bluestuff NDX Pads',   pos: '前輪', cn: '藍皮', key: 'BLUE',   img: `${IMG}/EBC_Blue.webp`,  pre: 'EBC-BLU' },
  { col: 'EBC Rear Greenstuff 2000 Pads',  pos: '後輪', cn: '綠皮', key: 'GREEN',  img: `${IMG}/EBC_Green.webp`, pre: 'EBC-GRN' },
  { col: 'EBC Rear Redstuff Pads',         pos: '後輪', cn: '紅皮', key: 'RED',    img: `${IMG}/EBC_Red.webp`,   pre: 'EBC-RED' },
  { col: 'EBC Rear Yellowstuff Pads',      pos: '後輪', cn: '黃皮', key: 'YELLOW', img: `${IMG}/EBC_Yellow.webp`,pre: 'EBC-YLW' },
  { col: 'EBC Rear Bluestuff NDX Pads',    pos: '後輪', cn: '藍皮', key: 'BLUE',   img: `${IMG}/EBC_Blue.webp`,  pre: 'EBC-BLU' },
];
const SERIES_DESC = {
  GREEN: 'Greenstuff 2000 適合一般道路駕駛，低粉塵、冷車即有制動力。',
  RED: 'Redstuff 適合大馬力房車，低粉塵、高摩擦係數。',
  YELLOW: 'Yellowstuff 全域性能來令片，街道/山道兼用，工作溫度範圍廣。',
  BLUE: 'Bluestuff NDX 賽道取向，高溫制動力優異。',
};
const CALIPER_SERIES = [
  { col: 'EBC YellowStuff', cn: '黃皮', img: `${IMG}/EBC_Yellow.webp`, pre: 'EBC-CP-YLW' },
  { col: 'EBC BlueStuff',   cn: '藍皮', img: `${IMG}/EBC_Blue.webp`,   pre: 'EBC-CP-BLU' },
  { col: 'EBC OrangeStuff', cn: '橘皮', img: `${IMG}/EBC_Orange.jpg`,  pre: 'EBC-CP-ORG' },
  { col: 'EBC RP1',         cn: 'RP1',  img: `${IMG}/EBC_RP1.webp`,    pre: 'EBC-CP-RP1' },
  { col: 'EBC RPX',         cn: 'RPX',  img: `${IMG}/EBC_RPX.webp`,    pre: 'EBC-CP-RPX' },
  { col: 'EBC SR11',        cn: 'SR11', img: `${IMG}/EBC_SR11.jpg`,    pre: 'EBC-CP-SR11' },
  { col: 'EBC SR21',        cn: 'SR21', img: `${IMG}/EBC_SR21.webp`,   pre: 'EBC-CP-SR21' },
];

async function ensureCategories() {
  let brake = await prisma.categories.findFirst({ where: { name: '煞車' } });
  let pads = await prisma.subcategories.findFirst({ where: { name: '來令片', category_id: brake.id } });

  let mod = await prisma.categories.findFirst({ where: { name: '改裝件' } });
  if (!mod) {
    const mx = await prisma.categories.aggregate({ _max: { sort_order: true } });
    mod = await prisma.categories.create({ data: { name: '改裝件', sort_order: (mx._max.sort_order || 0) + 1, is_active: true } });
  }
  let cal = await prisma.subcategories.findFirst({ where: { name: '煞車系統-卡鉗', category_id: mod.id } });
  if (!cal) {
    const mx = await prisma.subcategories.aggregate({ where: { category_id: mod.id }, _max: { sort_order: true } });
    cal = await prisma.subcategories.create({ data: { name: '煞車系統-卡鉗', category_id: mod.id, sort_order: (mx._max.sort_order || 0) + 1, is_active: true } });
  }
  return { pads, cal };
}

async function buildVehicleMatcher() {
  const all = await prisma.vehicleVariant.findMany({
    where: { is_approved: true },
    select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true },
  });
  VMAP = new Map(all.map(v => [v.id, v]));
  const byMake = new Map();
  for (const v of all) {
    const k = normMake(v.make).toUpperCase();
    if (!byMake.has(k)) byMake.set(k, []);
    byMake.get(k).push(v);
  }
  // ── 分詞規則 ──
  // 識別詞：性能版本專屬，CSV 列若未出現就不得連結（防止 Golf→Golf GTI/R、A3→S3、C-Class→AMG）
  const IDENTITY = new Set(['R', 'GTI', 'GTD', 'GTE', 'RS', 'S3', 'AMG']);
  // 行銷/裝飾詞：兩側都剔除（Edition 50經典紀念款 ≡ Golf R）
  const MARKETING = new Set(['EDITION', 'LIMITED', 'EXCLUSIVE']);
  const BODY = new Set(['3D', '5D']);
  // 保護複合詞不被切開（R-Line 不是 R）
  const protect = s => String(s || '').replace(/R-LINE/gi, 'RLINE').replace(/N-LINE/gi, 'NLINE');
  const rawTokens = s => protect(s).toUpperCase().replace(/[^A-Z0-9. ]/g, ' ').split(/\s+/).filter(Boolean);
  const coreTokens = arr => arr
    .filter(w => !/^\d+$/.test(w))                    // 純數字（排氣量/BHP）
    .filter(w => !/^MK\d+(\.5)?$/.test(w))            // MK 世代碼（改走 generation 檢查）
    .filter(w => !BODY.has(w))
    .filter(w => !MARKETING.has(w));                  // 行銷後綴兩側剔除（Edition 50 ≡ Golf R）
  // 平台碼：B8 / G20 / W205 / XA50（字母開頭）與 Audi 式數字開頭 8Y / 8V（從列尾或 Generation 欄抽出）
  const isPlat = w => /^[A-Z]\d{1,3}[A-Z]?$/.test(w) || /^[A-Z]{2}\d+$/.test(w) || /^\d{1,2}[A-Z]$/.test(w);
  // 車體線詞：變體有、列沒提 → 不連（Golf Variant/Plus、Skoda Combi、Benz Estate 是 EBC 分開列的獨立車線）
  const BODYLINE = new Set(['PLUS', 'VARIANT', 'TOURING', 'SV', 'SPORTSVAN', 'ALLTRACK', 'SHOOTING', 'GRAN', 'TURISMO', 'GT', 'COMBI', 'ESTATE', 'COUPE', 'CABRIOLET']);
  // 列比變體多出的詞只能是非區隔性修飾
  const REMAIN_OK = /^(PERFORMANCE|PACKAGE|PACK|360S|TCR|4MOTION|QUATTRO|TSI|TDI|EVO|RLINE|NLINE|STYLE|HIGHLINE|COMFORTLINE)$/;
  return function match(make, model, gen, year) {
    const list = byMake.get(normMake(make).toUpperCase()) || [];
    // 年份解析：YYYY-YYYY / YYYY（單年）/ YYYY-（開放到現在）/ -YYYY（從早期開始）
    let y1, y2;
    const ys = String(year || '');
    const ym = ys.match(/^(\d{4})-(\d{4})$/);
    if (ym) { y1 = +ym[1]; y2 = +ym[2]; }
    else if (/^\d{4}-$/.test(ys)) { y1 = +ys.slice(0, 4); y2 = 9999; }
    else if (/^-\d{4}$/.test(ys)) { y1 = 0; y2 = +ys.slice(1); }
    else { y1 = parseInt(ys); y2 = parseInt(ys); }
    if (isNaN(y1) || isNaN(y2)) return [];
    // 世代碼集合：MK 碼取自 model+gen；平台碼取自 gen 欄 + model 尾端
    const genEnforce = new Set();
    const genStr = String(gen || '').toUpperCase();
    const srcAll = ((model || '') + ' ' + genStr);
    for (const m of srcAll.matchAll(/\bMK(\d(?:\.5)?)\b/g)) genEnforce.add('MK' + m[1]);
    for (const m of genStr.matchAll(/\b([A-Z]\d{1,3}[A-Z]?|[A-Z]{2}\d+|\d{1,2}[A-Z])\b/g)) genEnforce.add(m[1]);
    const raw = rawTokens(model);
    while (raw.length > 1 && isPlat(raw[raw.length - 1]) && !IDENTITY.has(raw[raw.length - 1])) genEnforce.add(raw.pop());
    // 尾碼出現在 Generation 欄字串中（如 Octavia NX + gen "Mk4 (NX)"）也視為世代指標
    if (raw.length > 1 && !IDENTITY.has(raw[raw.length - 1]) && genStr.includes(raw[raw.length - 1])) genEnforce.add(raw.pop());
    const rowCore = coreTokens(raw);
    if (!rowCore.length) return [];
    const rowSet = new Set(raw);
    const ids = [];
    for (const v of list) {
      if (!(v.year_start <= y2 && v.year_end >= y1)) continue;
      // 有世代碼時必須命中 variant.generation（跨世代防線）
      const vg = (v.generation || '').toUpperCase();
      if (genEnforce.size && ![...genEnforce].some(c => vg.includes(c))) continue;
      const vRaw = rawTokens(v.model);
      const vCore = coreTokens(vRaw);
      if (!vCore.length) continue;
      // 變體識別詞必須全部出現在 CSV 列（列較低階 → 不連）
      const vIdent = vCore.filter(w => IDENTITY.has(w));
      if (vIdent.some(w => !rowSet.has(w))) continue;
      // 變體的車體線詞若列未提及 → 不連（Golf 列不吃 Golf Variant）
      if (vCore.some(w => BODYLINE.has(w) && !rowSet.has(w))) continue;
      // 主匹配：位置對位置前綴
      const n = Math.min(rowCore.length, vCore.length);
      let ok = true;
      for (let i = 0; i < n; i++) if (rowCore[i] !== vCore[i]) { ok = false; break; }
      if (ok) {
        if (rowCore.length > vCore.length && rowCore.slice(vCore.length).some(w => !REMAIN_OK.test(w))) continue;
        ids.push(v.id);
        continue;
      }
      // 後備匹配（Benz 式命名）：rowCore 以連續區塊出現在 vCore 中（如 C180 ⊂ C-Class Sedan C180 AMG Line）
      if (vCore.length >= rowCore.length) {
        let hit = false;
        outer: for (let s = 0; s + rowCore.length <= vCore.length; s++) {
          for (let j = 0; j < rowCore.length; j++) if (vCore[s + j] !== rowCore[j]) continue outer;
          hit = true; break;
        }
        if (hit) ids.push(v.id);
      }
    }
    return ids;
  };
}

(async () => {
  const priceDb = loadPriceDb();
  const { pads: padsCat, cal: caliperCat } = await ensureCategories();
  const matchVehicle = await buildVehicleMatcher();
  const S = { ukProducts: 0, ukActive: 0, ukNoPrice: 0, ukCompat: 0, unmatched: 0, twOverride: 0,
              calipers: 0, cpProducts: 0, cpActive: 0, cpNoPrice: 0, cpFitment: 0 };
  const unmatchedSamples = [];

  // ═══ 1. UK 原廠卡鉗來令片（前/後輪分開）═══
  if (!ONLY || ONLY === 'uk') {
    const lines = fs.readFileSync(path.join(DATA, 'EBC_UK.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim());
    const hdr = lines[0].split(',');
    const ci = n => hdr.indexOf(n);
    const I = { make: ci('Make'), year: ci('Year'), model: ci('Model'), gen: ci('Generation'),
                fS: ci('Front Style'), fD: ci('Front Diameter'), fT: ci('Front Disc Thickness New'),
                rS: ci('Rear Style'), rD: ci('Rear Diameter'), rT: ci('Rear Disc Thickness New') };

    const products = new Map(); // code|pos → product
    for (const line of lines.slice(1)) {
      const c = line.split(',');
      const g = i => (c[i] || '').trim();
      const make = g(I.make), model = g(I.model), gen = g(I.gen), year = g(I.year);
      if (!make || !model) continue;
      for (const s of STUFF) {
        const code = g(ci(s.col));
        if (!code) continue;
        const key = code + '|' + s.pos;
        if (!products.has(key)) products.set(key, { code, s, discSpecs: new Set(), vehicles: [] });
        const p = products.get(key);
        const style = g(s.pos === '前輪' ? I.fS : I.rS), dia = g(s.pos === '前輪' ? I.fD : I.rD), thk = g(s.pos === '前輪' ? I.fT : I.rT);
        if (style || dia) p.discSpecs.add([style, dia && dia + 'mm', thk && `厚${thk}mm`].filter(Boolean).join(' '));
        p.vehicles.push({ make, model, gen, year });
      }
    }
    console.log(`UK 唯一商品（code×前後）: ${products.size}`);

    for (const [, p] of products) {
      S.ukProducts++;
      const price = calcPrice(p.code, priceDb);
      const active = price != null;
      if (!active) S.ukNoPrice++; else S.ukActive++;
      if (MODE !== 'apply') {
        for (const v of p.vehicles) {
          const idsAll = matchVehicle(v.make, v.model, v.gen, v.year);
          const ids = idsAll.filter(vid => !twPadSuppressed(vid, p.code, p.s.pos));
          S.twOverride += idsAll.length - ids.length;
          if (ids.length) S.ukCompat += ids.length; else { S.unmatched++; if (unmatchedSamples.length < 15) unmatchedSamples.push(`${v.make} ${v.model} ${v.gen || ''} ${v.year}`); }
        }
        continue;
      }
      const sku = `${p.s.pre}-${p.code.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${p.s.pos === '前輪' ? 'F' : 'R'}`;
      const name = `EBC${p.s.cn} ${p.s.pos}來令片`;
      const discText = [...p.discSpecs].filter(Boolean).slice(0, 6).join('；');
      const description = [
        `EBC ${p.s.cn}系列來令片（${p.s.pos}用）。`,
        SERIES_DESC[p.s.key],
        discText ? `適用碟盤規格：${discText}。` : '',
        `料號：${p.code}`,
      ].filter(Boolean).join('\n');

      const part = await prisma.part.upsert({
        where: { sku },
        create: {
          sku, name, brand: 'EBC', subcategory_id: padsCat.id, image_url: p.s.img,
          description, msrp_price: price ?? 0,
          wholesale_price: price != null ? Math.ceil(price * 0.9 / 100) * 100 : 0,
          is_active: active,
        },
        update: {
          name, image_url: p.s.img, description,
          ...(price != null ? { msrp_price: price, wholesale_price: Math.ceil(price * 0.9 / 100) * 100 } : {}),
          ...(active ? { is_active: true } : {}),
        },
      });

      const seen = new Set();
      for (const v of p.vehicles) {
        const ids = matchVehicle(v.make, v.model, v.gen, v.year);
        if (!ids.length) { S.unmatched++; if (unmatchedSamples.length < 15) unmatchedSamples.push(`${v.make} ${v.model} ${v.gen || ''} ${v.year}`); continue; }
        for (const vid of ids) {
          if (seen.has(vid)) continue;
          seen.add(vid);
          if (twPadSuppressed(vid, p.code, p.s.pos)) { S.twOverride++; continue; }
          await prisma.partCompatibility.upsert({
            where: { part_id_vehicle_id: { part_id: part.id, vehicle_id: vid } },
            create: { part_id: part.id, vehicle_id: vid },
            update: {},
          });
          S.ukCompat++;
        }
      }
    }
    console.log(`UK: ${S.ukProducts} 商品（有價 ${S.ukActive}/無價 ${S.ukNoPrice}）、相容 ${S.ukCompat} 條、未匹配組合 ${S.unmatched}`);
  }

  // ═══ 2. 改裝卡鉗 + 卡鉗來令片 ═══
  if (!ONLY || ONLY === 'caliper') {
    const cl = fs.readFileSync(path.join(DATA, 'EBC_Caliper.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim());
    const ch = cl[0].split(',');
    const ci = n => ch.indexOf(n);

    const calipers = new Map(); // display → {make, model, padCode}
    const codeToSeries = new Map(); // code → series
    const codeToCalipers = new Map(); // code → Set(display)
    for (const line of cl.slice(1)) {
      const c = line.split(',');
      const make = (c[ci('Make')] || '').trim(), model = (c[ci('Model')] || '').trim();
      const padCode = (c[ci('PadCode')] || '').trim();
      if (!make || !model) continue;
      const display = `${make} ${model.trim()}${padCode ? `（${padCode}）` : ''}`;
      calipers.set(display, { make, model, padCode });
      for (const s of CALIPER_SERIES) {
        const code = (c[ci(s.col)] || '').trim();
        if (!code) continue;
        codeToSeries.set(code, s);
        if (!codeToCalipers.has(code)) codeToCalipers.set(code, new Set());
        codeToCalipers.get(code).add(display);
      }
    }
    console.log(`改裝卡鉗: ${calipers.size}、卡鉗來令片 code: ${codeToSeries.size}`);

    // 2a. 卡鉗主檔（is_active=false，非販售品）
    const caliperSkuToId = new Map();
    if (MODE === 'apply') {
      for (const [display, cp] of calipers) {
        S.calipers++;
        const sku = `CAL-${cp.make.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${cp.model.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${(cp.padCode || 'NA').replace(/[^A-Z0-9]/gi, '').toUpperCase()}`.slice(0, 60);
        const name = `${cp.make} ${cp.model.trim()}${cp.padCode ? `（${cp.padCode}）` : ''}`;
        const part = await prisma.part.upsert({
          where: { sku },
          create: {
            sku, name, brand: cp.make, subcategory_id: caliperCat.id,
            description: `改裝卡鉗。${cp.padCode ? `卡鉗型號：${cp.padCode}。` : ''}EBC 卡鉗專用來令片以此型號對應。`,
            is_universal: true, is_active: false,
          },
          update: { name, subcategory_id: caliperCat.id, brand: cp.make },
        });
        caliperSkuToId.set(display, part.id);
      }
      console.log(`卡鉗主檔寫入: ${caliperSkuToId.size}`);
    }

    // 2b. 卡鉗來令片
    for (const [code, calSet] of codeToSeries && codeToCalipers) {
      const s = codeToSeries.get(code);
      S.cpProducts++;
      const price = calcPrice(code, priceDb);
      const active = price != null;
      if (active) S.cpActive++; else S.cpNoPrice++;
      if (MODE !== 'apply') continue;

      const sku = `${s.pre}-${code.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
      // 名稱：EBC黃皮來令片 適用卡鉗型號（型號取第一個卡鉗的 padCode 或型號名）
      const firstCal = [...calSet][0];
      const m = firstCal.match(/（(.+?)）/);
      const fitName = m ? m[1] : firstCal;
      const name = `EBC${s.cn}來令片 適用${fitName}`;
      const calList = [...calSet];
      const shown = calList.slice(0, 10).join('、');
      const description = [
        `EBC ${s.cn}系列卡鉗專用來令片（改裝卡鉗用，不分前後輪）。`,
        `適用卡鉗（共 ${calSet.size} 種）：${shown}${calSet.size > 10 ? ' 等' : ''}。`,
        `料號：${code}`,
      ].join('\n');

      const part = await prisma.part.upsert({
        where: { sku },
        create: {
          sku, name, brand: 'EBC', subcategory_id: padsCat.id, image_url: s.img,
          description, msrp_price: price ?? 0,
          wholesale_price: price != null ? Math.ceil(price * 0.9 / 100) * 100 : 0,
          is_active: active,
        },
        update: {
          name, image_url: s.img, description,
          ...(price != null ? { msrp_price: price, wholesale_price: Math.ceil(price * 0.9 / 100) * 100 } : {}),
          ...(active ? { is_active: true } : {}),
        },
      });

      // 2c. PartCaliperFitment 關聯
      for (const display of calSet) {
        const calId = caliperSkuToId.get(display);
        if (!calId) continue;
        await prisma.partCaliperFitment.upsert({
          where: { pad_id_caliper_id: { pad_id: part.id, caliper_id: calId } },
          create: { pad_id: part.id, caliper_id: calId },
          update: {},
        });
        S.cpFitment++;
      }
    }
    console.log(`卡鉗來令片: ${S.cpProducts}（有價 ${S.cpActive}/無價 ${S.cpNoPrice}）、fitment ${S.cpFitment} 條`);
  }

  console.log('\n===== 統計 =====');
  console.log(JSON.stringify(S, null, 2));
  if (MODE !== 'apply' && unmatchedSamples.length) {
    console.log('\n未匹配車型例（前 15）:');
    console.log(unmatchedSamples.join('\n'));
  }
  await prisma.$disconnect();
  process.exitCode = 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
