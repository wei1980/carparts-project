// JXB 全站 — 階段 B：補映射 + 圖片下載 + CSV/JSON 產出
(async () => {
const fs = require('fs');
const path = require('path');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' };
const SRC = 'C:/Users/User/AppData/Local/hermes/cache/scratch/jxb_full_data.json';
const OUT_JSON = 'C:/carparts/carparts-api/media/Data/jxb_products.json';
const OUT_CSV = 'C:/carparts/carparts-api/media/Data/JXB_上架CSV.csv';
const IMG_DIR = 'C:/carparts/carparts-api/media/parts';
const RETAIL_TWD = 14800, WHOLESALE_TWD = 11800;

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
console.log('SKU 總數：', data.length);

// 補漏：Spare Bushings/Hardware Sets → 傳動｜其他
const DRIVETRAIN_OTHER = { id: 26, cat: '傳動', sub: '其他', en: 'Drivetrain/Other' };
let fixed = 0;
for (const r of data) {
  if (!r.sub && /Spare (Bushings|Hardware)/.test(r.names[0])) { r.sub = DRIVETRAIN_OTHER; fixed++; }
}
console.log('補映射 Spare Bushings/Hardware：', fixed);

const parts = data.filter(r => r.sub);
const excluded = data.filter(r => !r.sub);
console.log('可上架零件：', parts.length, '｜排除：', excluded.length, '（', excluded.map(r => r.sku).join(', '), '）');

// 品牌判斷
function brandOf(title) {
  if (/^Ringer Racing/i.test(title)) return 'Ringer Racing';
  if (/^Clutch Masters/i.test(title)) return 'Clutch Masters';
  if (/^Wavetrac/i.test(title)) return 'Wavetrac';
  if (/^034Motorsport|^034 /i.test(title)) return '034Motorsport';
  if (/^ARP/i.test(title)) return 'ARP';
  if (/^Red Line/i.test(title)) return 'Red Line';
  if (/^MOTUL/i.test(title)) return 'MOTUL';
  if (/^Schwaben/i.test(title)) return 'Schwaben';
  if (/^SPC /i.test(title)) return 'SPC';
  if (/^JRi/i.test(title)) return 'JRi Shocks';
  if (/^For 529 Innovations/i.test(title)) return '529 Innovations';
  if (/by Per4mance/i.test(title)) return 'Per4mance';
  return 'JXB Performance';
}

// ---------- 圖片下載 ----------
async function dlImg(url, dest) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2000) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return true;
  } catch (e) { return false; }
  finally { clearTimeout(t); }
}

let imgOk = 0, imgFail = 0, done = 0;
for (const r of parts) {
  r.brand = brandOf(r.names[0]);
  const ext = ((r.images[0] || '').match(/\.(png|jpe?g|webp)/i) || [])[1] || 'jpg';
  const fileSku = r.sku.replace(/\//g, '-');
  const dest = `${IMG_DIR}/${r.sub.en}/JXB/${fileSku}.${ext}`;
  r.imageLocal = '';
  if (r.images[0]) {
    const good = await dlImg(r.images[0], dest);
    if (good) { r.imageLocal = `media/parts/${r.sub.en}/JXB/${fileSku}.${ext}`; imgOk++; }
    else imgFail++;
  }
  done++;
  if (done % 50 === 0) console.log(`圖片 ${done}/${parts.length}｜成功 ${imgOk}｜失敗 ${imgFail}`);
}
console.log(`圖片下載：成功 ${imgOk}｜失敗 ${imgFail}`);

// ---------- 產出 JSON（完整） ----------
fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 1));
console.log('已寫入', OUT_JSON, `（${data.length} SKU）`);

// ---------- 產出 CSV ----------
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const header = ['sku', 'brand', 'name', 'db_category', 'db_subcategory', 'subcategory_id', 'retail_twd', 'wholesale_twd', 'usd_from', 'on_sale', 'stock', 'image_url', 'image_local', 'description', 'fitment', 'is_universal', 'product_url'];
const longName = r => r.names.reduce((a, b) => b.length > a.length ? b : a, '');
const longDesc = r => (r.descs && r.descs.length) ? r.descs.reduce((a, b) => b.length > a.length ? b : a, '') : '';
const rows = parts.map(r => [
  r.sku, r.brand, longName(r), r.sub.cat, r.sub.sub, r.sub.id,
  RETAIL_TWD, WHOLESALE_TWD, r.usd, r.sale ? '1' : '0',
  r.soldOut ? '0' : '1',
  r.images[0] || '', r.imageLocal || '', longDesc(r),
  (r.fitment || []).join('；'), '0',
  r.urls[0],
]);
const csv = [header.join(',')].concat(rows.map(r => r.map(csvCell).join(','))).join('\n');
fs.writeFileSync(OUT_CSV, '﻿' + csv, 'utf8');
console.log('已寫入', OUT_CSV, `（${rows.length} 項）`);

// 類別分布
const dist = {};
for (const r of parts) { const k = `${r.sub.cat}｜${r.sub.sub}`; dist[k] = (dist[k] || 0) + 1; }
console.log('類別分布：', JSON.stringify(dist));
const noFit = parts.filter(r => !r.fitment || !r.fitment.length);
console.log('無 FITMENT：', noFit.length, '項（油液/工具類，tags 代替）');
})();
