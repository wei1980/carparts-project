// EBC_UK.csv → 零件上傳規格 + 來令片車型關係表
// 輸入：media/Data/EBC_UK.csv（EBC 英規煞車來令片目錄，21,565 車型列）
// 輸出：
//   media/Data/EBC_零件上傳規格.csv   — Part 上傳用（import_v2_csv.js 相容欄位，description 備註碟盤大小）
//   media/Data/EBC_零件規格.json      — 每個 SKU 的完整 specs（compound/位置/碟盤尺寸/卡鉗/車型數）
//   media/Data/EBC_來令片車型關係表.csv — 長格式：一行 = 一 SKU × 一車型配置（含該車型碟盤尺寸）
const fs = require('fs');
const path = require('path');

// 來源檔：原始檔已從 media/Data 移至「已經上架」目錄，兩處都支援
const SRC_CANDIDATES = [
  path.join(__dirname, '..', 'media', 'Data', 'EBC_UK.csv'),
  'C:/Users/User/Desktop/商品資料庫/已經上架/EBC/EBC_UK.csv',
];
const SRC = SRC_CANDIDATES.find(p => fs.existsSync(p));
if (!SRC) {
  console.error('FATAL: 找不到 EBC_UK.csv，嘗試過：\n  ' + SRC_CANDIDATES.join('\n  '));
  process.exit(4);
}
const OUT = path.join(__dirname, '..', 'media', 'Data');

// ---- EBC 圖片對應（media/parts/Brake/pads/EBC） ----
const EBC_IMG_DIR = path.join(__dirname, '..', 'media', 'parts', 'Brake', 'pads', 'EBC');
const EBC_IMG_URL = '/media/parts/Brake/pads/EBC';
const COMPOUND_IMG = { // 配方 → 品牌圖（該目錄無逐 SKU 圖，依配方配圖）
  'Greenstuff 2000': 'EBC_Green.webp',
  'Redstuff': 'EBC_Red.webp',
  'Yellowstuff': 'EBC_Yellow.webp',
  'Bluestuff NDX': 'EBC_Blue.webp',
};
function resolveImage(sku, compound) {
  for (const ext of ['.webp', '.jpg']) {
    const f = sku + ext;
    if (fs.existsSync(path.join(EBC_IMG_DIR, f))) return `${EBC_IMG_URL}/${f}`;
  }
  return `${EBC_IMG_URL}/${COMPOUND_IMG[compound]}`;
}

// ---- 讀檔（無引號欄位，純 split） ----
const raw = fs.readFileSync(SRC, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());
const HDR = lines[0].split(',');

const PAD_COLS = [ // [欄位索引, 配方, 位置]
  [9, 'Greenstuff 2000', '前'], [10, 'Redstuff', '前'], [11, 'Yellowstuff', '前'], [12, 'Bluestuff NDX', '前'],
  [17, 'Greenstuff 2000', '後'], [18, 'Redstuff', '後'], [19, 'Yellowstuff', '後'], [20, 'Bluestuff NDX', '後'],
];
const FRONT = { cal: 8, style: 13, dia: 14, thick: 15 };
const REAR = { cal: 16, style: 21, dia: 22, thick: 23 };

// ---- 年份解析 ----
function parseYear(y) {
  y = (y || '').trim();
  if (!y) return { ys: null, ye: null, raw: y };
  let m = y.match(/^(\d{4})\s*[-–—]+\s*(\d{4})$/);
  if (m) return { ys: +m[1], ye: +m[2], raw: y };
  m = y.match(/^(\d{4})\s*[-–—]+\s*$/);
  if (m) return { ys: +m[1], ye: new Date().getFullYear(), raw: y }; // 開放式：至今年（2026）
  m = y.match(/^(\d{4})$/);
  if (m) return { ys: +m[1], ye: +m[1], raw: y };
  m = y.match(/^(\d{4})\s*[-–—]+\s*\1\s*[-–—]+\s*(\d{4})$/); // 2019-2019-2022 之類的筆誤
  if (m) return { ys: +m[1], ye: +m[2], raw: y + '（修正）' };
  m = y.match(/^(\d{4})\s*[-–—]+\s*[-–—]+\s*(\d{4})$/); // 2020--2022
  if (m) return { ys: +m[1], ye: +m[2], raw: y + '（修正）' };
  return { ys: null, ye: null, raw: y + '（未解析）' };
}

const FUEL_MAP = { 'hybrid': 'Hybrid', 'dual electric motors': 'Electric', 'electric motor': 'Electric' };
const normFuel = f => FUEL_MAP[(f || '').trim().toLowerCase()] || (f || '').trim();
const num = v => { const n = parseFloat((v || '').trim()); return Number.isFinite(n) ? n : null; };

// ---- 主處理 ----
const parts = new Map();  // sku → part 彙總
const relations = [];     // 關係表長格式
const yearIssues = [];
const rowKeys = new Set(); // 關係表去重鍵

for (let i = 1; i < lines.length; i++) {
  const c = lines[i].split(',');
  const make = (c[0] || '').trim();
  const model = (c[2] || '').trim();
  const gen = (c[3] || '').trim();
  const engine = (c[4] || '').trim();
  const disp = num(c[5]);
  const bhp = num(c[6]);
  const fuel = normFuel(c[7]);
  const yr = parseYear(c[1]);
  if (yr.raw.includes('未解析') || yr.raw.includes('修正')) yearIssues.push({ row: i, year: c[1], parsed: yr.raw });

  for (const [idx, compound, pos] of PAD_COLS) {
    const sku = (c[idx] || '').trim();
    if (!sku) continue;
    const isFront = pos === '前';
    const src = isFront ? FRONT : REAR;
    const dia = num(c[src.dia]);
    const thick = num(c[src.thick]);
    const style = (c[src.style] || '').trim() || null;
    const caliper = (c[src.cal] || '').trim() || null;

    // Part 彙總
    if (!parts.has(sku)) parts.set(sku, {
      sku, compound, positions: new Set(), discDia: new Set(), discThick: new Set(),
      styles: new Set(), caliper: new Set(), vehicles: new Set(),
    });
    const p = parts.get(sku);
    p.positions.add(pos);
    if (dia) p.discDia.add(dia);
    if (thick) p.discThick.add(thick);
    if (style) p.styles.add(style);
    if (caliper) p.caliper.add(caliper);
    p.vehicles.add(make + '|' + model + '|' + c[1]);

    // 關係表（去重）
    const key = [sku, make, model, gen, engine, c[1], pos].join('|');
    if (rowKeys.has(key)) continue;
    rowKeys.add(key);
    relations.push({
      sku, compound, position: pos,
      make, model, generation: gen, engine,
      displacement_cc: disp, bhp_ps: bhp, fuel,
      year_start: yr.ys, year_end: yr.ye, year_raw: c[1],
      disc_diameter_mm: dia, disc_thickness_mm: thick, disc_style: style, caliper_make: caliper,
    });
  }
}

// ---- Part 名稱與說明（備註碟盤大小） ----
const sortNum = a => [...a].sort((x, y) => x - y);
const partRows = [];
const partSpecs = [];
for (const p of parts.values()) {
  const posStr = p.positions.size === 2 ? '前/後' : [...p.positions][0];
  const name = `EBC ${p.compound} 來令片（${posStr}）`;
  const diaList = sortNum(p.discDia);
  const thickList = sortNum(p.discThick);
  const diaNote = diaList.length ? `適用碟盤直徑 ${diaList.join('／')}mm` : '碟盤尺寸依車型';
  const thickNote = thickList.length ? `、碟厚 ${thickList.join('／')}mm` : '';
  const calNote = p.caliper.size ? `（${[...p.caliper].join('／')} 卡鉗）` : '';
  const description = `EBC ${p.compound} 煞車來令片（${posStr}），${diaNote}${thickNote}${calNote}。`;
  const specs = {
    compound: p.compound,
    position: posStr,
    disc_diameter_mm: diaList,
    disc_thickness_mm: thickList,
    disc_style: [...p.styles],
    caliper_make: [...p.caliper],
    vehicle_count: p.vehicles.size,
  };
  partRows.push({
    sku: p.sku, brand: 'EBC', name, subcategory: '來令片', category: '煞車系統',
    msrp_twd: 0, wholesale_twd: 0, 'Own Stock': 0, 'Distributor Stock': 0,
    image_url: resolveImage(p.sku, p.compound), description, is_universal: 'FALSE', specs,
  });
  partSpecs.push({ sku: p.sku, ...specs });
}

// ---- 輸出 1：零件上傳規格 CSV ----
const csvEsc = v => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const upHeaders = ['SKU', 'Brand', 'Name', 'subcategory', 'category', 'msrp_twd', 'wholesale_twd', 'Own Stock', 'Distributor Stock', 'image_url', 'description', 'is_universal'];
const KEY_MAP = { SKU: 'sku', Brand: 'brand', Name: 'name' };
const upLines = [upHeaders.join(',')];
for (const r of partRows) upLines.push(upHeaders.map(h => csvEsc(r[KEY_MAP[h] || h])).join(','));
fs.writeFileSync(path.join(OUT, 'EBC_零件上傳規格.csv'), upLines.join('\r\n'), 'utf8');

// ---- 輸出 2：零件規格 JSON（specs 欄位用） ----
fs.writeFileSync(path.join(OUT, 'EBC_零件規格.json'), JSON.stringify(partSpecs, null, 1), 'utf8');

// ---- 輸出 3：來令片車型關係表 ----
const relHeaders = ['sku', 'compound', 'position', 'make', 'model', 'generation', 'engine', 'displacement_cc', 'bhp_ps', 'fuel', 'year_start', 'year_end', 'year_raw', 'disc_diameter_mm', 'disc_thickness_mm', 'disc_style', 'caliper_make'];
const relLines = [relHeaders.join(',')];
for (const r of relations) relLines.push(relHeaders.map(h => csvEsc(r[h])).join(','));
fs.writeFileSync(path.join(OUT, 'EBC_來令片車型關係表.csv'), relLines.join('\r\n'), 'utf8');

// ---- 報告 ----
const makes = new Set(relations.map(r => r.make));
const report = [
  'EBC_UK.csv 處理報告',
  '===================',
  `來源列數：${lines.length - 1}`,
  `唯一零件（SKU）：${parts.size}`,
  `關係表列數（去重後）：${relations.length}`,
  `涵蓋品牌數：${makes.size}`,
  `配方分布：${['Greenstuff 2000', 'Redstuff', 'Yellowstuff', 'Bluestuff NDX'].map(k => k + '=' + [...parts.values()].filter(p => p.compound === k).length).join(' ')}`,
  `前輪 SKU：${[...parts.values()].filter(p => p.positions.has('前') && !p.positions.has('後')).length}｜後輪：${[...parts.values()].filter(p => p.positions.has('後') && !p.positions.has('前')).length}｜前後通用：${[...parts.values()].filter(p => p.positions.size === 2).length}`,
  `年份未解析/修正：${yearIssues.length} 列`,
  ...yearIssues.slice(0, 10).map(x => `  列${x.row}: "${x.year}" → ${x.parsed}`),
];
fs.writeFileSync(path.join(OUT, 'EBC_匯入報告.txt'), report.join('\n'), 'utf8');
console.log(report.join('\n'));
