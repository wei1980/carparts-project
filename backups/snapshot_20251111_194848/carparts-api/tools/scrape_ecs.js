/* tools/scrape_ecs.js
 * 從 ECS Tuning 產品頁擷取「事實性欄位」→ parts.csv / compatibilities.csv
 * - 尊重 robots.txt（不允許就跳過）
 * - 限速 1 req/sec
 * - 只抓事實欄位（SKU、品牌、分類、USD 價格、相容車型簡表）
 * - 輸出多一欄 msrp_usd，方便 importParts.js 自動換算台幣
 *
 * 用法：
 *   node tools/scrape_ecs.js urls.txt
 *   // urls.txt 每行一個 ECS 產品頁 URL
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const cheerio = require('cheerio');
const Bottleneck = require('bottleneck');
const robotsParser = require('robots-parser');
const { createObjectCsvWriter } = require('csv-writer');

const UA = 'CarpartsBot/1.0 (+contact: your-email@example.com)';
const RATE_MIN_TIME_MS = 1000; // 1 req/sec
const SITE = 'https://www.ecstuning.com';

const outParts = path.resolve('./data/parts_scraped.csv');
const outCompat = path.resolve('./data/compatibilities_scraped.csv');

const partsWriter = createObjectCsvWriter({
  path: outParts,
  header: [
    { id: 'sku', title: 'sku' },
    { id: 'name', title: 'name' },
    { id: 'category', title: 'category' },
    { id: 'brand', title: 'brand' },
    { id: 'msrp_usd', title: 'msrp_usd' },         // 新增：USD 售價（交給匯入器換算台幣）
    { id: 'msrp_twd', title: 'msrp_twd' },         // 可留空
    { id: 'wholesale_twd', title: 'wholesale_twd' },
    { id: 'currency', title: 'currency' },         // USD
    { id: 'weight_kg', title: 'weight_kg' },
    { id: 'vat_included', title: 'vat_included' },
    { id: 'stock_qty', title: 'stock_qty' },
    { id: 'description', title: 'description' },   // 只留短描述 + source_url
    { id: 'image_url', title: 'image_url' }        // 建議後續換成自有圖/CDN
  ],
});

const compatWriter = createObjectCsvWriter({
  path: outCompat,
  header: [
    { id: 'sku', title: 'sku' },
    { id: 'make', title: 'make' },
    { id: 'model', title: 'model' },               // 你目前 model=原model+variant_name 的合併名稱
    { id: 'generation_name', title: 'generation_name' },
    { id: 'year_from', title: 'year_from' },       // ECS 多不列年式 → 先留空
    { id: 'year_to', title: 'year_to' },
    { id: 'engine_code', title: 'engine_code' },
    { id: 'note', title: 'note' },
  ],
});

const limiter = new Bottleneck({ minTime: RATE_MIN_TIME_MS });

// 讀 URL 清單
const listFile = process.argv[2];
if (!listFile) {
  console.error('請提供網址清單：node tools/scrape_ecs.js urls.txt');
  process.exit(1);
}
const urls = fs.readFileSync(listFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

// robots 檢查
const robotsCache = new Map();
async function canFetch(url) {
  try {
    const u = new URL(url);
    const origin = `${u.protocol}//${u.host}`;
    if (!robotsCache.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      const res = await axios.get(robotsUrl, { headers: { 'User-Agent': UA }, timeout: 10000 });
      robotsCache.set(origin, robotsParser(robotsUrl, res.data));
    }
    return robotsCache.get(origin).isAllowed(url, UA);
  } catch {
    return false; // 取不到 robots 時保守起見不抓
  }
}

function abs(url, base = SITE) {
  try { return new URL(url, base).toString(); } catch { return url; }
}

// 你的 models 命名，如果不是「平台+子車型」，在這裡調整
function mapModelName(make, platform, submodel) {
  return [platform, submodel].filter(Boolean).join(' ').trim();
}

// 解析頁面
function extractECS(html, pageUrl) {
  const $ = cheerio.load(html);
  const pageText = $.root().text();

  // 名稱
  const title = $('h1').first().text().trim();

  // 品牌（找 "Brand" 標籤右側）
  let brand = '';
  $('*').each((_, el) => {
    const t = $(el).text().trim();
    if (/^Brand$/i.test(t)) {
      const imgAlt = $(el).next().find('img[alt]').attr('alt') || $(el).next().text().trim();
      if (imgAlt) brand = imgAlt.replace(/Image:\s*/i, '').trim();
    }
  });

  // Mfg Part / ES#
  let mfgPartPrimary = '';
  let esNumber = '';
  const mfgMatch = pageText.match(/Mfg Part #\s*([\d\-.\s]+)/i);
  if (mfgMatch) {
    const firstToken = mfgMatch[1].split(/\s+/).find(s => /\d{6,}/.test(s));
    if (firstToken) mfgPartPrimary = firstToken.replace(/[^\d]/g, '');
  }
  const esMatch = pageText.match(/ECS Part #\s*ES#?(\d+)/i);
  if (esMatch) esNumber = `ES#${esMatch[1]}`;

  const sku = mfgPartPrimary ? `ECSTUNING-${mfgPartPrimary}` : (esNumber || `ECSTUNING-${Date.now()}`);

  // 麵包屑 → 分類
  const crumbs = $('.breadcrumb a, nav.breadcrumb a').map((_, el) => $(el).text().trim()).get();
  const category = crumbs.slice(-2).join('/') || 'Uncategorized';

  // 圖片（先存原站 URL 作審核）
  const imgSrc = $('img').filter((_, el) => /product|gallery/i.test($(el).attr('class') || '')).first().attr('src')
             || $('img').first().attr('src') || '';
  const image_url = imgSrc ? abs(imgSrc, SITE) : '';

  // 售價（USD）—— 盡量找第一個像價格的字串（$123.45）
  function pickPrice() {
    // 常見位置：價格元件、"Our Price"、"List Price"
    const cand = [
      $('[itemprop="price"]').attr('content'),
      $('.price, .product-price, .pricing, .price__amount').first().text(),
      pageText.match(/Our Price[:\s]*\$?\s*([\d,]+(\.\d{2})?)/i)?.[1],
      pageText.match(/List Price[:\s]*\$?\s*([\d,]+(\.\d{2})?)/i)?.[1],
    ].filter(Boolean);
    for (const c of cand) {
      const num = String(c).replace(/[^0-9.]/g, '');
      if (num && !isNaN(Number(num))) return Number(num);
    }
    return null;
  }
  const msrp_usd = pickPrice();

  // 描述：短句 + 來源
  const short = $('.short-description, .product-summary').first().text().trim().slice(0, 200);
  const description = `${short ? short + ' ' : ''}(source: ${pageUrl})`;

  // 相容車型（This Part Fits...）
  const compats = [];
  const fitHeader = $('*').filter((_, el) => /This Part Fits the Following Vehicles/i.test($(el).text().trim())).first();
  let compatText = '';
  if (fitHeader.length) {
    let blk = fitHeader.parent();
    for (let i = 0; i < 5 && blk && blk.length; i++) { compatText += ' ' + blk.text(); blk = blk.next(); }
  } else {
    compatText = pageText;
  }
  const lines = compatText.split(/\r?\n/).map(s => s.trim()).filter(s => s && /[A-Za-z]/.test(s));
  for (const ln of lines) {
    // 例：BMW F30 328i xDrive N20 2.0L ...
    if (!/\b[BNMS][A-Z0-9]{1,4}\b/.test(ln) || !/\b\d\.\dL\b/i.test(ln)) continue;
    const tokens = ln.split(/\s+/);
    const make = tokens[0];
    const platform = tokens[1];
    const engIdx = tokens.findIndex(t => /^[A-Z0-9]{2,5}$/.test(t) && /[A-Z]/.test(t));
    const dispIdx = tokens.findIndex(t => /^\d\.\dL$/i.test(t));
    if (engIdx === -1 || dispIdx === -1 || dispIdx < engIdx) continue;
    const submodel = tokens.slice(2, engIdx).join(' ');
    const engine_code = tokens[engIdx];
    const modelName = mapModelName(make, platform, submodel);
    compats.push({
      make,
      model: modelName,
      generation_name: platform,
      year_from: '',
      year_to: '',
      engine_code,
      note: 'from ECS fitment; year unknown'
    });
  }

  const part = {
    sku,
    name: title,
    category,
    brand,
    msrp_usd: msrp_usd != null ? msrp_usd.toFixed(2) : '',
    msrp_twd: '',
    wholesale_twd: '',
    currency: 'USD',
    weight_kg: '',
    vat_included: true,
    stock_qty: '',
    description,
    image_url,
  };

  return { part, compats };
}

async function main() {
  const parts = [];
  const compat = [];

  for (const url of urls) {
    const allowed = await canFetch(url);
    if (!allowed) { console.warn(`跳過（robots 不允許或無法取得）：${url}`); continue; }

    try {
      const res = await limiter.schedule(() =>
        axios.get(url, {
          headers: { 'User-Agent': UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' },
          timeout: 20000,
        })
      );
      const { part, compats } = extractECS(res.data, url);
      if (!part.sku || !part.name) { console.warn(`略過（缺 sku 或 name）：${url}`); continue; }
      parts.push(part);
      for (const c of compats) compat.push({ sku: part.sku, ...c });
      console.log(`OK: ${part.sku} ← ${url}，fitments: ${compats.length}, msrp_usd=${part.msrp_usd || 'N/A'}`);
    } catch (e) {
      console.error(`失敗：${url} → ${e.message}`);
    }
  }

  if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
  await partsWriter.writeRecords(parts);
  await compatWriter.writeRecords(compat);

  console.log('\n輸出完成：');
  console.log('  parts →', outParts);
  console.log('  compat →', outCompat);
  console.log('\n接著可執行： node prisma/importParts.js ./data/parts_scraped.csv ./data/compatibilities_scraped.csv');
}

main().catch(err => { console.error(err); process.exit(1); });
