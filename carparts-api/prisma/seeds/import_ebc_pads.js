// EBC 來令片上架主腳本
// 來源：media/parts/Brake/pads/EBC/EBC_data/{EBC_UK.csv, EBC_Caliper.csv, EBC_price.xlsx}
// 用法:
//   node import_ebc_pads.js --analyze            只統計不寫入
//   node import_ebc_pads.js --apply              寫入（冪等，可重跑 upsert）
//   node import_ebc_pads.js --apply --only=uk    只跑 UK 來令片
//   node import_ebc_pads.js --apply --only=caliper 只跑卡鉗+卡鉗來令片
//
// 商業規則（用戶指定）:
//   價格 = ROUNDUP( MAX(USD成本*0.6*1.1, GBP成本) + 2300, -2 )   ← 解自 EBC_price.xlsx EBC sheet J 欄公式
//   無成本料號 → 建檔但 is_active=false（待補價啟用）
//   UK 來令片: 分前/後輪、名稱「EBC黃皮 前輪來令片」、說明含碟盤規格、不標車型
//   Caliper 來令片: 不分前後輪、名稱「EBC黃皮來令片 適用卡鉗型號」、與卡鉗建立關聯
//   卡鉗: 建到「改裝件>煞車系統>卡鉗」分類
//   相容關聯: EBC_UK.csv 車型對 DB 台規 variant 自動匹配（~55%），只建匹配到的
const fs = require('fs');
const path = require('path');
const XLSX = require('C:/carparts/carparts-api/node_modules/xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIR = path.join(__dirname, '../../media/parts/Brake/pads/EBC');
const DATA = path.join(DIR, 'EBC_data');
const IMG = '/media/parts/Brake/pads/EBC';
const MODE = process.argv.includes('--apply') ? 'apply' : 'analyze';
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
const OVERHEAD = 2300; // 營業費用（xlsx J2）

const MAKE_ALIAS = { 'MERCEDES-BENZ COMMERCIAL': 'Mercedes-Benz', 'VW': 'Volkswagen', 'BENZ': 'Mercedes-Benz', 'LAND ROVER': 'Land Rover', 'LANDROVER': 'Land Rover' };
const normMake = m => MAKE_ALIAS[m.trim().toUpperCase()] || m.trim();

// ── 價格庫 ──
function loadPriceDb() {
  const wb = XLSX.readFile(path.join(DATA, 'EBC_price.xlsx'));
  const db = XLSX.utils.sheet_to_json(wb.Sheets['資料庫'], { header: 1, defval: '' });
  const usd = new Map(), gbp = new Map();
  for (const r of db) {
    if (r[3] && r[4] !== '') usd.set(String(r[3]).trim(), Number(r[4]));   // D=ItemCode E=NEWRETAIL(美)
    if (r[6] && r[7] !== '') gbp.set(String(r[6]).trim(), Number(r[7]));   // G=Code H=UK Trade(英)
  }
  return { usd, gbp };
}

// 售價 = max(美成本*0.6*1.1, 英成本) + 2300 → 無條件進位到百位；兩者皆無 → null
function calcPrice(code, { usd, gbp }) {
  const u = usd.has(code) ? usd.get(code) * 0.6 * 1.1 : null;
  const g = gbp.has(code) ? gbp.get(code) : null;
  if (u == null && g == null) return null;
  const raw = Math.max(u || 0, g || 0) + OVERHEAD;
  return Math.ceil(raw / 100) * 100;
}

// ── 顏色系列 ──
const STUFF_SERIES = {
  'EBC Front Greenstuff 2000 Pads': { key: 'GREEN', cn: '綠皮', img: `${IMG}/EBC_Green.webp`, skuPrefix: 'EBC-GRN' },
  'EBC Front Redstuff Pads':        { key: 'RED',   cn: '紅皮', img: `${IMG}/EBC_Red.webp`,   skuPrefix: 'EBC-RED' },
  'EBC Front Yellowstuff Pads':     { key: 'YELLOW',cn: '黃皮', img: `${IMG}/EBC_Yellow.webp`,skuPrefix: 'EBC-YLW' },
  'EBC Front Bluestuff NDX Pads':   { key: 'BLUE',  cn: '藍皮', img: `${IMG}/EBC_Blue.webp`,  skuPrefix: 'EBC-BLU' },
  'EBC Rear Greenstuff 2000 Pads':  { key: 'GREEN', cn: '綠皮', img: `${IMG}/EBC_Green.webp`, skuPrefix: 'EBC-GRN' },
  'EBC Rear Redstuff Pads':         { key: 'RED',   cn: '紅皮', img: `${IMG}/EBC_Red.webp`,   skuPrefix: 'EBC-RED' },
  'EBC Rear Yellowstuff Pads':      { key: 'YELLOW',cn: '黃皮', img: `${IMG}/EBC_Yellow.webp`,skuPrefix: 'EBC-YLW' },
  'EBC Rear Bluestuff NDX Pads':    { key: 'BLUE',  cn: '藍皮', img: `${IMG}/EBC_Blue.webp`,  skuPrefix: 'EBC-BLU' },
};
const CALIPER_SERIES = [
  { col: 'EBC YellowStuff',  cn: '黃皮', img: `${IMG}/EBC_Yellow.webp`, skuPrefix: 'EBC-C-YLW' },
  { col: 'EBC BlueStuff',    cn: '藍皮', img: `${IMG}/EBC_Blue.webp`,   skuPrefix: 'EBC-C-BLU' },
  { col: 'EBC OrangeStuff',  cn: '橘皮', img: `${IMG}/EBC_Orange.jpg`,  skuPrefix: 'EBC-C-ORG' },
  { col: 'EBC RP1',          cn: 'RP1',  img: `${IMG}/EBC_RP1.webp`,    skuPrefix: 'EBC-C-RP1' },
  { col: 'EBC RPX',          cn: 'RPX',  img: `${IMG}/EBC_RPX.webp`,    skuPrefix: 'EBC-C-RPX' },
  { col: 'EBC SR11',         cn: 'SR11', img: `${IMG}/EBC_SR11.jpg`,    skuPrefix: 'EBC-C-SR11' },
  { col: 'EBC SR21',         cn: 'SR21', img: `${IMG}/EBC_SR21.webp`,   skuPrefix: 'EBC-C-SR21' },
];

// ── 分類確保 ──
async function ensureCategories() {
  // 來令片: 煞車>來令片 (id 9 已存在，仍以防禦式查詢)
  let brake = await prisma.categories.findFirst({ where: { name: '煞車' } });
  if (!brake) brake = await prisma.categories.create({ data: { name: '煞車', sort_order: 3, is_active: true } });
  let pads = await prisma.subcategories.findFirst({ where: { name: '來令片', category_id: brake.id } });
  if (!pads) pads = await prisma.subcategories.create({ data: { name: '來令片', category_id: brake.id, sort_order: 1, is_active: true } });

  // 卡鉗: 改裝件>煞車系統>卡鉗（Categories 無多層，採 頂層「改裝件」+ 子分類「煞車系統-卡鉗」）
  let mod = await prisma.categories.findFirst({ where: { name: '改裝件' } });
  if (!mod) {
    const maxSort = await prisma.categories.aggregate({ _max: { sort_order: true } });
    mod = await prisma.categories.create({ data: { name: '改裝件', sort_order: (maxSort._max.sort_order || 0) + 1, is_active: true } });
  }
  let caliper = await prisma.subcategories.findFirst({ where: { name: '煞車系統-卡鉗', category_id: mod.id } });
  if (!caliper) {
    const maxSort = await prisma.subcategories.aggregate({ where: { category_id: mod.id }, _max: { sort_order: true } });
    caliper = await prisma.subcategories.create({ data: { name: '煞車系統-卡鉗', category_id: mod.id, sort_order: (maxSort._max.sort_order || 0) + 1, is_active: true } });
  }
  return { pads, caliper };
}

// ── 車型匹配快取（UK csv → DB variant ids）──
async function buildVehicleMatcher() {
  const all = await prisma.vehicleVariant.findMany({
    where: { is_approved: true },
    select: { id: true, make: true, model: true, generation: true, year_start: true, year_end: true },
  });
  const byMake = new Map();
  for (const v of all) {
    const k = normMake(v.make).toUpperCase();
    if (!byMake.has(k)) byMake.set(k, []);
    byByMakePush(byMake, k, v);
  }
  function byByMakePush(m, k, v) { m.get(k).push(v); }

  function extractCodes(model, gen) {
    const codes = new Set();
    const src = (model + ' ' + (gen || '')).toUpperCase();
    for (const m of src.matchAll(/\b([A-Z])(\d{2,3})\b/g)) codes.add(m[1] + m[2]);
    for (const m of src.matchAll(/\bMK(\d(?:\.5)?)\b/g)) codes.add('MK' + m[1]);
    return [...codes];
  }

  // 回傳 { ids, matched: bool }
  return function matchVehicle(make, model, gen, year) {
    const list = byMake.get(normMake(make).toUpperCase()) || [];
    const ym = String(year).match(/^(\d{4})-(\d{4})$/);
    const y1 = ym ? +ym[1] : parseInt(year);
    const y2 = ym ? +ym[2] : parseInt(year);
    if (isNaN(y1) || isNaN(y2)) return { ids: [], matched: false };
    const codes = extractCodes(model, gen);
    const modelWords = model.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !/^\d+$/.test(w));
    const ids = [];
    for (const v of list) {
      if (!(v.year_start <= y2 && v.year_end >= y1)) continue;
      const vg = (v.generation || '').toUpperCase();
      const vm = v.model.toUpperCase();
      const ok = (codes.length && codes.some(c => vg.includes(c))) ||
                 (modelWords.length && modelWords.some(w => vm.includes(w)));
      if (ok) ids.push(v.id);
    }
    return { ids, matched: ids.length > 0 };
  };
}

// ══════════ 主流程 ══════════
(async () => {
  const priceDb = loadPriceDb();
  const { pads: padsCat, caliper: caliperCat } = await ensureCategories();
  const matchVehicle = await buildVehicleMatcher();
  const stats = { ukProducts: 0, ukActive: 0, ukInactive: 0, caliperProducts: 0, calipers: 0, caliperPads: 0, caliperPadActive: 0, compatLinks: 0, unmatchedCombos: 0, noPrice: 0 };
  const unmatchedList = [];

  // ═══ 1. UK 原廠卡鉗來令片（前/後輪分開）═══
  if (!ONLY || ONLY === 'uk') {
    const raw = fs.readFileSync(path.join(DATA, 'EBC_UK.csv'), 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    const hdr = lines[0].split(',');
    const colIdx = name => hdr.indexOf(name);
    const I = {
      make: colIdx('Make'), year: colIdx('Year'), model: colIdx('Model'), gen: colIdx('Generation'),
      fStyle: colIdx('Front Style'), fDia: colIdx('Front Diameter'), fThk: colIdx('Front Disc Thickness New'),
      rStyle: colIdx('Rear Style'), rDia: colIdx('Rear Diameter'), rThk: colIdx('Rear Disc Thickness New'),
    };
    const FRONT = ['EBC Front Greenstuff 2000 Pads', 'EBC Front Redstuff Pads', 'EBC Front Yellowstuff Pads', 'EBC Front Bluestuff NDX Pads'];
    const REAR = ['EBC Rear Greenstuff 2000 Pads', 'EBC Rear Redstuff Pads', 'EBC Rear Yellowstuff Pads', 'EBC Rear Bluestuff NDX Pads'];

    // code → { pos, seriesKey, discSpecs:Set, vehicles:Set }
    const products = new Map();
    for (const line of lines.slice(1)) {
      const c = line.split(',');
      const get = i => (c[i] || '').trim();
      const make = get(I.make), model = get(I.model), gen = get(I.gen), year = get(I.year);
      if (!make || !model) continue;

      for (const [cols, pos, cn] of [[FRONT, '前輪', '前'], [REAR, '後輪', '後']]) {
        for (const colName of cols) {
          const code = get(colIdx(colName));
          if (!code) continue;
          const s = STUFF_SERIES[colName];
          const key = code + '|' + pos;
          if (!products.has(key)) {
            products.set(key, { code, pos, cn, series: s, discSpecs: new Set(), vehicles: [] });
          }
          const p = products.get(key);
          const style = get(pos === '前輪' ? I.fStyle : I.rStyle);
          const dia = get(pos === '前輪' ? I.fDia : I.rDia);
          const thk = get(pos === '前輪' ? I.fThk : I.rThk);
          if (style || dia) p.discSpecs.add([style, dia && dia + 'mm', thk && `厚${thk}mm`].filter(Boolean).join(' '));
          p.vehicles.push({ make, model, gen, year });
        }
      }
    }
    console.log(`UK 唯一商品（code×前後）: ${products.size}`);

    if (MODE === 'apply') {
      for (const [key, p] of products) {
        stats.ukProducts++;
        const price = calcPrice(p.code, priceDb);
        const active = price != null;
        if (!active) stats.noPrice++;
        else stats.ukActive++;
        const sku = `${p.series.skuPrefix}-${p.code.replace(/[^A-Z0-9]/gi, '')}-${p.pos === '前輪' ? 'F' : 'R'}`;
        const name = `EBC${p.series.cn} ${p.pos}來令片`;
        const discText = [...p.discSpecs].filter(Boolean).slice(0, 5).join('；');
        const description = [
          `EBC ${p.series.cn}系列來令片（${p.pos}用）。`,
          p.series.key === 'GREEN' ? 'Greenstuff 2000 適合一般道路駕駛，低粉塵、冷車即有制動力。' :
          p.series.key === 'RED' ? 'Redstuff 適合大馬力房車，低粉塵、高摩擦係數。' :
          p.series.key === 'YELLOW' ? 'Yellowstuff 全域性能來令片，街道/山道兼用，工作溫度範圍廣。' :
          'Bluestuff NDX 賽道取向，高溫制動力優異。',
          discText ? `適用碟盤規格：${discText}。` : '',
          `料號：${p.code}`,
        ].filter(Boolean).join('\n');

        const part = await prisma.part.upsert({
          where: { sku },
          create: {
            sku, name, brand: 'EBC',
            subcategory_id: padsCat.id,
            image_url: p.series.img,
            description,
            msrp_price: price ?? 0,
            wholesale_price: price != null ? Math.ceil(price * 0.9 / 100) * 100 : 0,
            is_active: active,
          },
          update: {
            name, image_url: p.series.img, description,
            ...(price != null ? { msrp_price: price, wholesale_price: Math.ceil(price * 0.9 / 100) * 100 } : {}),
            ...(active ? { is_active: true } : {}),
          },
        });

        // 車型相容關聯（只建匹配到的）
        const seenVariants = new Set();
        for (const v of p.vehicles) {
          const { ids, matched } = matchVehicle(v.make, v.model, v.gen, v.year);
          if (!matched) { stats.unmatchedCombos++; if (unmatchedList.length < 500) unmatchedList.push(`${v.make} ${v.model} ${v.gen || ''} ${v.year}`); continue; }
          for (const vid of ids) {
            if (seenVariants.has(vid)) continue;
            seenVariants.add(vid);
            await prisma.partCompatibility.upsert({
              where: { part_id_vehicle_id: { part_id: part.id, vehicle_id: vid } },
              create: { part_id: part.id, vehicle_id: vid },
              update: {},
            });
            stats.compatLinks++;
          }
        }
      }
    } else {
      for (const [, p] of products) {
        stats.ukProducts++;
        const price = calcPrice(p.code, priceDb);
        if (price != null) stats.ukActive++; else { stats.noPrice++; stats.ukInactive++; }
        for (const v of p.vehicles) {
          const { matched } = matchVehicle(v.make, v.model, v.gen, v.year);
          if (matched) stats.compatLinks++; else stats.unmatchedCombos++;
        }
      }
    }
    console.log(`UK 完成: ${stats.ukProducts} 商品（有價 ${stats.ukActive} / 無價 ${stats.noPrice}）、相容連結 ${stats.compatLinks} 條、未匹配車型組合 ${stats.unmatchedCombos}`);
  }

  // ═══ 2. 改裝卡鉗 + 卡鉗來令片 ═══
  if (!ONLY || ONLY === 'caliper') {
    const cl = fs.readFileSync(path.join(DATA, 'EBC_Caliper.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim());
    const chdr = cl[0].split(',');
    const cidx = n => chdr.indexOf(n);

    // 2a. 卡鉗主檔（VehicleId, Make, Model, PadCode）→ 改裝件>煞車系統-卡鉗
    const calipers = new Map(); // key: make|model|padcode
    for (const line of cl.slice(1)) {
      const c = line.split(',');
      const make = (c[cidx('Make')] || '').trim(), model = (c[cidx('Model')] || '').trim();
      const padCode = (c[cidx('PadCode')] || '').trim();
      if (!make || !model) continue;
      const key = make + '|' + model + '|' + padCode;
      if (!calipers.has(key)) calipers.set(key, { make, model, padCode });
    }
    console.log(`改裝卡鉗: ${calipers.size}`);

    if (MODE === 'apply') {
      for (const [key, cp] of calipers) {
        stats.calipers++;
        const sku = `CAL-${cp.make.replace(/[^A-Z0-9]/gi, '')}-${cp.model.replace(/[^A-Z0-9]/gi, '')}-${cp.padCode.replace(/[^A-Z0-9]/gi, '') || 'NA'}`.slice(0, 60);
        const name = `${cp.make} ${cp.model.trim()}${cp.padCode ? `（${cp.padCode}）` : ''}`;
        const existing = await prisma.part.findUnique({ where: { sku } });
        const part = await prisma.part.upsert({
          where: { sku },
          create: {
            sku, name, brand: cp.make,
            subcategory_id: caliperCat.id,
            description: `改裝卡鉗。${cp.padCode ? `卡鉗型號：${cp.padCode}。` : ''}EBC 卡鉗專用來令片以此型號對應。`,
            is_universal: true,
            is_active: false, // 卡鉗本體非本批販售商品，建檔供來令片關聯（不上架）
          },
          update: { name, subcategory_id: caliperCat.id },
        });
        if (!existing) { /* new */ }
      }
    }

    // 2b. 卡鉗來令片（每個 code 一件，不分前後輪；名稱「EBC黃皮來令片 適用卡鉗型號」）
    const codeToCalipers = new Map(); // pad code → Set(caliper display)
    for (const [, cp] of calipers) {
      const display = `${cp.make} ${cp.model.trim()}${cp.padCode ? `（${cp.padCode}）` : ''}`;
      for (let i = 4; i <= 10; i++) {
        const code = (cl && '');
      }
    }
    // 重掃一次填 codeToCalipers
    for (const line of cl.slice(1)) {
      const c = line.split(',');
      const make = (c[cidx('Make')] || '').trim(), model = (c[cidx('Model')] || '').trim();
      const padCode = (c[cidx('PadCode')] || '').trim();
      const display = `${make} ${model.trim()}${padCode ? `（${padCode}）` : ''}`;
      for (const s of CALIPER_SERIES) {
        const code = (c[cidx(s.col)] || '').trim();
        if (!code) continue;
        if (!codeToCalipers.has(code)) codeToCalipers.set(code, new Set());
        codeToCalipers.get(code).add(display);
      }
    }
    console.log(`卡鉗來令片唯一 code: ${codeToCalipers.size}`);

    if (MODE === 'apply') {
      for (const [code, caliperSet] of codeToCalipers) {
        stats.caliperPads++;
        const series = CALIPER_SERIES.find(s => { const c = cl.find(l => l.split(',')[cidx(s.col)] === code); return c; }) || CALIPER_SERIES[0];
        // 找此 code 屬於哪個系列（掃欄位）
        let mySeries = null;
        for (const line of cl.slice(1)) {
          const c = line.split(',');
          for (const s of CALIPER_SERIES) {
            if ((c[cidx(s.col)] || '').trim() === code) { mySeries = s; break; }
          }
          if (mySeries) break;
        }
        if (!mySeries) continue;
        const price = calcPrice(code, priceDb);
        const active = price != null;
        if (active) stats.caliperPadActive++; else stats.noPrice++;
        const caliperText = [...caliperSet].slice(0, 8).join('、');
        const moreCount = caliperSet.size > 8 ? ` 等 ${caliperSet.size} 種卡鉗` : '';
        const sku = `${mySeries.skuPrefix}-${code.replace(/[^A-Z0-9]/gi, '')}`;
        const name = `EBC${mySeries.cn}來令片 適用卡鉗${[...caliperSet][0].split('（')[0].split(' ')[0] === '' ? '' : ''}`;
        // 名稱規則：EBC黃皮來令片 適用卡鉗型號 → 用第一個卡鉗型號太長，改用 pad code 對應的卡鉗型號清單第一個型號
        const firstName = [...caliperSet][0] || '';
        const displayName = `EBC${mySeries.cn}來令片 適用${firstName}`;
        const description = [
          `EBC ${mySeries.cn}系列卡鉗專用來令片（改裝卡鉗用，不分前後輪）。`,
          `適用卡鉗（${caliperSet.size} 種）：${caliperText}${moreCount}。`,
          `料號：${code}`,
        ].join('\n');

        const part = await prisma.part.upsert({
          where: { sku },
          create: {
            sku, name: displayName, brand: 'EBC',
            subcategory_id: padsCat.id,
            image_url: mySeries.img,
            description,
            msrp_price: price ?? 0,
            wholesale_price: price != null ? Math.ceil(price * 0.9 / 100) * 100 : 0,
            is_active: active,
          },
          update: {
            name: displayName, image_url: mySeries.img, description,
            ...(price != null ? { msrp_price: price, wholesale_price: Math.ceil(price * 0.9 / 100) * 100 } : {}),
            ...(active ? { is_active: true } : {}),
          },
        });
        stats.compatLinks += 0; // 卡鉗來令片↔卡鉗 關聯在下方
      }

      // 2c. 來令片 ↔ 卡鉗 關聯（PartCompatibility：pad part ↔ caliper part）
      const caliperParts = await prisma.part.findMany({
        where: { subcategory_id: caliperCat.id },
        select: { id: true, sku: true, name: true, description: true },
      });
      // 建立 padCode → caliper part id 對照（從卡鉗 sku/description）
      const padSkuToPart = new Map();
      for (const [code, caliperSet] of codeToCalipers) {
        // 找 pad part
        let mySeries = null;
        for (const line of cl.slice(1)) {
          const c = line.split(',');
          for (const s of CALIPER_SERIES) {
            if ((c[cidx(s.col)] || '').trim() === code) { mySeries = s; break; }
          }
          if (mySeries) break;
        }
        if (!mySeries) continue;
        const padSku = `${mySeries.skuPrefix}-${code.replace(/[^A-Z0-9]/gi, '')}`;
        padSkuToPart.set(code, { padSku, caliperSet });
      }
      for (const [code, { padSku, caliperSet }] of padSkuToPart) {
        const padPart = await prisma.part.findUnique({ where: { sku: padSku }, select: { id: true } });
        if (!padPart) continue;
        for (const display of caliperSet) {
          // display = "MAKE MODEL（padcode）" → 找卡鉗 part
          const m = display.match(/（(.+?)）/);
          const cpCode = m ? m[1] : '';
          const cp = [...calipers.values()].find(x => `${x.make} ${x.model.trim()}${x.padCode ? `（${x.padCode}）` : ''}` === display);
          if (!cp) continue;
          const calSku = `CAL-${cp.make.replace(/[^A-Z0-9]/gi, '')}-${cp.model.replace(/[^A-Z0-9]/gi, '')}-${cp.padCode.replace(/[^A-Z0-9]/gi, '') || 'NA'}`.slice(0, 60);
          const calPart = await prisma.part.findUnique({ where: { sku: calSku }, select: { id: true } });
          if (!calPart) continue;
          await prisma.partCompatibility.upsert({
            where: { part_id_vehicle_id: { part_id: padPart.id, vehicle_id: calPart.id } },
            create: { part_id: padPart.id, vehicle_id: calPart.id },
            update: {},
          });
        }
      }
    } else {
      for (const [code, caliperSet] of codeToCalipers) {
        stats.caliperPads++;
        const price = calcPrice(code, priceDb);
        if (price != null) stats.caliperPadActive++; else stats.noPrice++;
      }
    }
    console.log(`卡鉗完成: 卡鉗 ${stats.calipers}、卡鉗來令片 ${stats.caliperPads}（有價 ${stats.caliperPadActive}）`);
  }

  console.log('\n===== 統計 =====');
  console.log(JSON.stringify(stats, null, 2));
  if (MODE !== 'apply' && unmatchedList.length) {
    console.log('\n未匹配車型例（前 20）:');
    console.log([...new Set(unmatchedList)].slice(0, 20).join('\n'));
  }
  await prisma.$disconnect();
  process.exitCode = 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
