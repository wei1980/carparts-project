// MST 匯入管線：官網產品 + myData 適配 → parts + 相容連結
// 乾跑：node mst_import.js
// 執行：node mst_import.js --apply
// 規則：NT$99,999 新品跳過（待正確價格）；wholesale = msrp × 0.8；msrp >= 100 才上架
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const IMG_DIR = 'media/parts/Brand/MST';
const PLACEHOLDER_PRICE = 99999;

// ================= 類別映射 =================
// subcategory_id → parts.category 字串
const CAT_NAME = {
  1: '進氣', 2: '進氣', 3: '進氣', 4: '進氣', 5: '進氣', 6: '進氣',
  7: '排氣', 8: '排氣', 9: '煞車', 10: '煞車', 11: '煞車', 12: '煞車',
  13: '底盤', 14: '底盤', 15: '底盤', 16: '底盤', 17: '引擎', 18: '引擎',
  19: '引擎', 20: '引擎', 21: '冷卻', 22: '冷卻', 23: '傳動', 24: '傳動',
  25: '傳動', 26: '傳動', 27: '燃油', 28: '燃油',
};
// myData Product 欄位 → subcategory_id
const MY_PROD_MAP = {
  '進氣系統': 2, '摩托車進氣': 2, '渦輪進氣管': 3, '當派排氣管': 7,
};
// 標題關鍵字 → subcategory_id（優先順序）
const TITLE_RULES = [
  [/香菇頭|濾心|濾芯/, 1],
  [/進氣套件|進氣系統|進氣轉座|加大進氣管/, 2],
  [/渦輪進氣管/, 3],
  [/當派排氣管|排氣管/, 7],
];
const TITLE_DEFAULT = 2; // 進氣套件

// ================= 載入資料 =================
const products = JSON.parse(fs.readFileSync('scratch_mst_products.json').toString('utf8'));
const myData = JSON.parse(fs.readFileSync('scratch_mst_fitment.json').toString('utf8'));
const links = new Map(JSON.parse(fs.readFileSync('scratch_mst_links.json').toString('utf8')));

// myData 按 SKU 分組
const fitBySku = new Map();
for (const d of myData) {
  const sku = String(d.SKU || '').trim().toUpperCase();
  if (!fitBySku.has(sku)) fitBySku.set(sku, []);
  fitBySku.get(sku).push(d);
}

// SKU 去重（同 SKU 多商品取有 myData 者，否則第一筆）
const bySku = new Map();
for (const p of products) {
  const prev = bySku.get(p.sku);
  if (!prev) bySku.set(p.sku, p);
  else if (!prev.fit && fitBySku.has(p.sku)) bySku.set(p.sku, p);
}
for (const [sku, p] of bySku) p.fit = fitBySku.get(sku) || [];

// ================= 類別決定 =================
function decideCategory(p) {
  if (p.fit.length) {
    const prod = p.fit[0].Product;
    if (MY_PROD_MAP[prod]) return MY_PROD_MAP[prod];
  }
  for (const [re, sub] of TITLE_RULES) if (re.test(p.title)) return sub;
  return TITLE_DEFAULT;
}

// ================= 描述組成 =================
function composeDesc(p) {
  const parts = [p.title + '。'];
  if (p.fit.length) {
    const makes = [...new Set(p.fit.map(d => d.Make))];
    const models = [...new Set(p.fit.map(d => d.Model))];
    const engines = [...new Set(p.fit.map(d => d.Engine).filter(Boolean))];
    const years = p.fit.map(d => parseInt(d.Year)).filter(y => !isNaN(y));
    const notes = [...new Set(p.fit.map(d => d['Please Note']).filter(Boolean))];
    if (makes.length || models.length) {
      parts.push('適配車款：' + (makes.length === 1 && models.length ? makes[0] + ' ' : makes.join('、') + ' ') + models.join('、'));
    }
    if (years.length) {
      const yMin = Math.min(...years), yMax = Math.max(...years);
      parts.push(yMin === yMax ? `${yMin} 年` : `${yMin}-${yMax} 年`);
    }
    if (engines.length) parts.push('適用引擎：' + engines.join('、'));
    if (notes.length) parts.push('注意：' + notes.join('；'));
  } else {
    parts.push('（新品適配資料整理中，請洽客服確認適用車款）');
  }
  return parts.join(' ').slice(0, 600);
}

(async () => {
// ================= 乾跑檢查 =================
const catDist = new Map();
const issues = { noImg: [], placeholder: [], lowPrice: [], noFit: [] };
const importable = [];
for (const [sku, p] of bySku) {
  if (p.price >= PLACEHOLDER_PRICE) { issues.placeholder.push(`${sku}(NT$${p.price})`); continue; }
  if (p.price < 100) { issues.lowPrice.push(`${sku}(NT$${p.price})`); continue; }
  if (!fs.existsSync(IMG_DIR + '/' + sku + '.webp')) { issues.noImg.push(sku); continue; }
  const subId = decideCategory(p);
  p.subId = subId;
  p.category = CAT_NAME[subId];
  p.desc = composeDesc(p);
  p.wholesale = Math.round(p.price * 0.8);
  p.msrp = p.price;
  p.stock = 10;
  p.links = links.get(sku) || [];
  if (p.links.length === 0) issues.noFit.push(sku);
  catDist.set(subId, (catDist.get(subId) || 0) + 1);
  importable.push(p);
}
console.log('=== MST 乾跑 ===');
console.log(`商品 ${products.length}｜唯一 SKU ${bySku.size}｜可上架 ${importable.length}`);
console.log(`跳過：99,999 標價 ${issues.placeholder.length}（${issues.placeholder.join(', ')}）`);
console.log(`跳過：低價 ${issues.lowPrice.length}｜無圖 ${issues.noImg.length}`);
console.log(`\n類別分布：`);
[...catDist.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
  const names = { 1: '濾芯', 2: '進氣套件', 3: '渦輪管', 7: '排氣管' };
  console.log(`  ${n}｜subcat ${k}（${names[k] || '?'}/${CAT_NAME[k]}）`);
});
console.log(`\n無相容連結（${issues.noFit.length}）：${issues.noFit.join(', ')}`);
const linkCounts = importable.map(p => p.links.length);
console.log(`相容連結：總 ${linkCounts.reduce((a, b) => a + b, 0)}｜中位數 ${linkCounts.sort((a, b) => a - b)[Math.floor(linkCounts.length / 2)]}｜最多 ${Math.max(...linkCounts)}`);
console.log(`\n價格範圍：NT$${Math.min(...importable.map(p => p.msrp))}-${Math.max(...importable.map(p => p.msrp))}`);
console.log('\n描述樣本：');
for (const sku of ['BW-X306', 'BW-5809DP', 'OFI-89145OP', 'TY-AUS02']) {
  const p = importable.find(pp => pp.sku === sku);
  if (p) console.log(`  ${sku}：${p.desc}`);
}
console.log('連結數 >100 的 SKU（過度匹配檢查）：');
importable.filter(p => p.links.length > 100).forEach(p => console.log(`  ${p.sku} → ${p.links.length} 變體｜${p.title}`));

if (!APPLY) { console.log('\n=== 乾跑完成 ==='); await prisma.$disconnect(); return; }

// ================= 執行匯入 =================
console.log(`\n匯入零件：${importable.length}`);
const partIds = {};
for (const p of importable) {
  const imgUrl = `/media/parts/Brand/MST/${p.sku}.webp`;
  const isActive = p.msrp >= 100;
  const r = await prisma.$queryRawUnsafe(
    `INSERT INTO parts (sku, name, brand, subcategory_id, category, image_url, description, msrp_price, wholesale_price, stock_qty, distributor_stock_qty, preorder_lead_time_days, is_active, is_universal)
     VALUES ($1, $2, 'MST', $3, $4, $5, $6, $7, $8, $9, 0, 0, $10, false)
     ON CONFLICT (sku) DO UPDATE SET name = $2, subcategory_id = $3, category = $4, image_url = $5, description = $6, msrp_price = $7, wholesale_price = $8, is_active = $10
     RETURNING id`,
    p.sku, p.title, p.subId, p.category, imgUrl, p.desc, p.msrp, p.wholesale, p.stock, isActive
  );
  partIds[p.sku] = r[0].id;
}
console.log('零件匯入完成');

let linkTotal = 0;
const linkRows = [];
for (const p of importable) {
  const pid = partIds[p.sku];
  for (const vid of p.links) linkRows.push([pid, vid]);
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
  linkTotal += chunk.length;
}
console.log('相容連結寫入：' + linkTotal);
await prisma.$disconnect();
console.log('=== 完成 ===');
})();
