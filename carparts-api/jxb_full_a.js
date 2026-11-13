// JXB 全站 302 項 — 階段 A：SKU 合併 + 子類別映射 + 詳情頁 FITMENT
(async () => {
const fs = require('fs');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'Accept': 'text/html' };
const SRC = 'C:/Users/User/AppData/Local/hermes/cache/scratch/jxb_all_products.json';
const OUT = 'C:/Users/User/AppData/Local/hermes/cache/scratch/jxb_full_data.json';

const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));
console.log('原始商品：', all.length);

const CAT = {
  DRIVESHAFT: { id: 25, cat: '傳動', sub: '傳動軸', en: 'Drivetrain/Driveshaft' },
  DIFFERENTIAL: { id: 24, cat: '傳動', sub: '差速器', en: 'Drivetrain/Differential' },
  CLUTCH: { id: 23, cat: '傳動', sub: '離合器', en: 'Drivetrain/Clutch' },
  DRIVETRAIN_OTHER: { id: 26, cat: '傳動', sub: '其他', en: 'Drivetrain/Other' },
  CHASSIS_OTHER: { id: 16, cat: '底盤', sub: '其他', en: 'Chassis/Other' },
  ENGINE_OTHER: { id: 20, cat: '引擎', sub: '其他', en: 'Engine/Other' },
  BRAKE_OTHER: { id: 12, cat: '煞車', sub: '煞車套件', en: 'Brake/Kit' },
  EXHAUST_OTHER: { id: 7, cat: '排氣', sub: '排氣管', en: 'Exhaust/Pipe' },
};

function mapSub(name) {
  const n = name;
  if (/Stickers?|T-Shirt|Snapback|Beanie|Hoodie|Party Tee|Die Cut|Transfer Sticker/i.test(n)) return null;
  if (/Fuel System Cleaner|CV-2 Grease|Ice Racing Studs/i.test(n)) return null;
  if (/High Pressure Fuel Pump Tool|Pump for 1 qt/i.test(n)) return null;
  if (/Exhaust Valve/i.test(n)) return CAT.EXHAUST_OTHER;
  if (/Spherical/.test(n)) return CAT.CHASSIS_OTHER;
  if (/Center Support Bearing|Spacer Kit|Mounting Sleeve Kit|Upgraded Rear Axles/.test(n)) return CAT.DRIVESHAFT;
  if (/Differential|Limited Slip|4-Pinion|WaveTrac/i.test(n)) return CAT.DIFFERENTIAL;
  if (/Clutch|Flywheel|Slave Cylinder/i.test(n)) return CAT.CLUTCH;
  if (/Shifter|Short Throw|Linkage|Shift Clamp|Mounting Plate|Gated|Stabilizer Rod|Transmission Mount|Trans Mount/i.test(n)) return CAT.DRIVETRAIN_OTHER;
  if (/Strut Mounts|Spring Perches|Control Arm|Toe Link|Knuckle|Shock Mounts|Tunnel Brace|Rebuild Kits/i.test(n)) return CAT.CHASSIS_OTHER;
  if (/Engine Mount|High Pressure Fuel Pump|Cylinder on Demand|Crank Pulley|Motor Oil/i.test(n)) return CAT.ENGINE_OTHER;
  if (/Gear Oil|Shockproof/i.test(n)) return CAT.DRIVETRAIN_OTHER;
  if (/Brake Fluid|Bleeder/i.test(n)) return CAT.BRAKE_OTHER;
  return null;
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function skuOf(p) {
  const pm = p.title.match(/\(([A-Z0-9][A-Z0-9\/.]+)\)\s*$/);
  if (pm) return pm[1];
  if (p.variants && p.variants[0] && p.variants[0].sku) return String(p.variants[0].sku).replace(/-(FK|AUR|AURORA)$/, '').split('&')[0].trim();
  return (p.urlSlug || 'PRODUCT').toUpperCase().replace(/-/g, '').slice(0, 30);
}

// ---------- 合併 ----------
const merged = new Map();
for (const p of all) {
  const sku = skuOf(p);
  const sub = mapSub(p.title);
  const imgs = [p.mainImage && p.mainImage.assetUrl].concat((p.images || []).map(x => x.assetUrl)).filter(Boolean);
  const desc = p.description ? stripTags(p.description) : '';
  const rec = {
    sku, sub,
    names: [p.title],
    images: imgs,
    usd: p.fromPrice ? parseFloat(p.fromPrice.value) : (p.variants && p.variants[0] ? parseFloat(p.variants[0].price.value) : 0),
    urls: ['https://www.jxbperformance.com' + (p.fullUrl || '/' + p.urlSlug)],
    tags: p.tags || [],
    descs: desc ? [desc] : [],
    variantSkus: (p.variants || []).map(v => v.sku).filter(Boolean),
    soldOut: !!p.soldOut,
    sale: !!p.onSale,
  };
  const cur = merged.get(sku);
  if (!cur) { merged.set(sku, rec); continue; }
  cur.names.push(p.title);
  cur.images.push(...imgs);
  cur.usd = Math.min(cur.usd, rec.usd);
  cur.urls.push(rec.urls[0]);
  cur.tags.push(...(p.tags || []));
  if (desc) cur.descs.push(desc);
  cur.variantSkus.push(...rec.variantSkus);
  cur.soldOut = cur.soldOut || rec.soldOut;
  cur.sale = cur.sale || rec.sale;
}
console.log('合併後 SKU：', merged.size);

// ---------- 詳情頁 FITMENT ----------
async function fetchTimeout(url, ms = 25000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await (await fetch(url, { headers: UA, signal: ctl.signal })).text(); }
  finally { clearTimeout(t); }
}

let ok = 0, fail = 0, fitCount = 0, done = 0;
for (const [sku, rec] of merged) {
  const fitSet = new Set();
  for (const u of [...new Set(rec.urls)]) {
    try {
      const html = await fetchTimeout(u);
      const h1 = html.indexOf('<h1');
      let end = html.length;
      for (const fm of ['<footer', 'id="footer"', 'class="footer', 'data-footer']) {
        const i = html.indexOf(fm, h1 >= 0 ? h1 : 0);
        if (i > 0 && i < end) end = i;
      }
      const content = html.slice(h1 >= 0 ? h1 : 0, Math.min(end, (h1 >= 0 ? h1 : 0) + 80000));
      const fb = content.indexOf('>FITMENT<');
      if (fb >= 0) {
        const ulM = content.slice(fb, fb + 12000).match(/<ul data-rte-list="default">([\s\S]*?)<\/ul>/);
        if (ulM) for (const x of ulM[1].matchAll(/<p[^>]*>([^<]+)<\/p>/g)) fitSet.add(x[1].trim());
      }
      ok++;
    } catch (e) { fail++; }
  }
  if (fitSet.size) { rec.fitment = [...fitSet]; fitCount++; }
  done++;
  if (done % 40 === 0) {
    fs.writeFileSync(OUT, JSON.stringify([...merged.values()], null, 1));
    console.log(`checkpoint ${done}/${merged.size}｜頁面成功 ${ok}｜失敗 ${fail}｜FITMENT ${fitCount}`);
  }
}
console.log(`詳情頁：成功 ${ok}｜失敗 ${fail}｜有 FITMENT 的 SKU：${fitCount}`);

const unmapped = [...merged.values()].filter(r => !r.sub);
console.log('未映射（排除於 CSV）：', unmapped.length, '項 —', unmapped.map(r => r.sku).join(', '));
const noImg = [...merged.values()].filter(r => r.sub && !r.images.length);
console.log('缺圖片：', noImg.length, '項');

fs.writeFileSync(OUT, JSON.stringify([...merged.values()], null, 1));
console.log('已寫入', OUT, `（${merged.size} SKU）`);
})();
