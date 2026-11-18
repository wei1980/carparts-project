/**
 * scrape_BILSTEIN_V11.js — BILSTEIN 目錄爬蟲（V11）
 *
 * V11 相比 V10 修掉的三個致命 bug：
 *
 * 1. **0 結果也標記 visited**（資料缺口元凶）
 *    V10：`visitedSet.add(vKey)` 無條件執行 → 抓到 0 筆的車型被永久跳過。
 *    實例：Toyota `Yaris (P21, PA1, PH1)` 的 `1.6 GR 4WD (GXPA16)`（BILSTEIN
 *    48-330862 B16 PSS10）在 V10 被抓到 0 筆、卻寫進 visited → 之後每次重跑
 *    都「⏭️ 已經下載過」→ 該料號永遠進不了資料庫。
 *    V11：只有 parts.length > 0 才寫入 visited；0 筆記進 failed_V11/ 供重試。
 *
 * 2. **visited 用完整 URL 當 key**
 *    V10：normalizeUrl 只清 10=（session token），但 12=（每頁筆數）在
 *    100/110 之間變動過，同一車型會產生兩個 key；不同車型也可能撞 URL。
 *    V11：一律以 URL 的 32=<vehicle id> 當唯一鍵 — catalog 的穩定識別。
 *
 * 3. **新版目錄結構解析不了**（本次新增）
 *    2026-10 之後的目錄把商品包成 row_type="artikel1" / "artikel2"：
 *      - SKU 藏在 <input id="artid#...#48-330862#..."> 的屬性裡
 *      - 名稱在下一個 artikel2 列的 <tr class="tr_bez">
 *      - 兩者不在同一個 <tr>，V10 的行內文字狀態機永遠湊不到一起
 *    V11 先跑 scrapeArticleRows()（針對新結構的确定性解析），
 *    抓到 0 筆才回退到 V10 的 scrapeCurrentPage()。
 *
 * 用法：
 *   node scrape_BILSTEIN_V11.js --brands Toyota --series "Yaris"
 *   node scrape_BILSTEIN_V11.js --brands Toyota --redo-failed
 *   node scrape_BILSTEIN_V11.js --brands Toyota --debug-empty
 */
const { chromium } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

const cliArgs = process.argv.slice(2);
const argOf = (name, dflt) => { const i = cliArgs.indexOf('--' + name); return i >= 0 ? cliArgs[i + 1] : dflt; };
const hasFlag = (name) => cliArgs.includes('--' + name);

const OUT = path.join(__dirname, argOf('out', 'Parts_V11.csv'));
const VISITED = path.join(__dirname, argOf('visited', 'visited_V11.txt'));
const MANIFEST = path.join(__dirname, argOf('manifest', 'manifest_V11.csv'));
const FAILED = path.join(__dirname, 'failed_V11');
const imagesDir = path.join(__dirname, 'images');
const debugDir = path.join(__dirname, 'debug_screenshots');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
if (!fs.existsSync(FAILED)) fs.mkdirSync(FAILED, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── 車型唯一鍵：URL 的 32=<vehicle id> ─────────────────────────────
function vehicleKey(href) {
  const m = String(href || '').match(/[?&]32=(\d+)/);
  if (m) return 'v' + m[1];
  return String(href || '').replace(/([?&])10=[A-Fa-f0-9]+(&|$)/g, '$1').replace(/&&/g, '&');
}

const loadSet = (file) => {
  if (!fs.existsSync(file)) return new Set();
  return new Set(fs.readFileSync(file, 'utf8').split('\n').map(s => s.trim()).filter(Boolean));
};

const visitedSet = loadSet(VISITED);
const failedSet = loadSet(path.join(FAILED, 'all.txt'));
console.log(`📂 visited: ${visitedSet.size} 筆 | failed: ${failedSet.size} 筆`);

const downloadedSet = new Set(fs.readdirSync(imagesDir));
console.log(`🖼️  images: ${downloadedSet.size} 張`);

const manifest = new Map();
if (fs.existsSync(MANIFEST)) {
  const lines = fs.readFileSync(MANIFEST, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = (lines[0] || '').split(',');
  for (const l of lines.slice(1)) {
    const cells = l.split(',');
    const o = {};
    head.forEach((h, i) => { o[h.trim()] = (cells[i] || '').trim(); });
    if (o.vehicle_id) manifest.set(o.vehicle_id, o);
  }
  console.log(`📋 manifest 既有: ${manifest.size} 筆`);
}

const csvWriter = createCsvWriter({
  path: OUT,
  header: [
    { id: 'sku', title: 'sku' }, { id: 'name', title: 'name' },
    { id: 'brand', title: 'brand' }, { id: 'price', title: 'msrp_eur' },
    { id: 'desc', title: 'description' }, { id: 'category', title: 'subcategory' },
    { id: 'series', title: 'Model_Series' }, { id: 'v_make', title: 'Manufacturer' },
    { id: 'v_model', title: 'Model' }, { id: 'v_type', title: 'Type' },
    { id: 'v_year', title: 'From_to' }, { id: 'v_hp', title: 'kW_HP' },
    { id: 'v_ccm', title: 'ccm' }, { id: 'v_engine', title: 'Engine_Code' },
    { id: 'v_kba', title: 'KBA_Keynumber' }, { id: 'image_url', title: 'image_url' },
    { id: 'imgFile', title: 'image_file' }, { id: 'debug_note', title: 'debug_note' },
    { id: 'vehicle_key', title: 'vehicle_key' },
  ],
  append: fs.existsSync(OUT),
});

const nameWhitelist = [
  "BILSTEIN - B16 PSS10", "BILSTEIN - Clubsport", "BILSTEIN - EVO S",
  "BILSTEIN - EVO R", "BILSTEIN - EVO SE", "BILSTEIN - B14 PSS",
  "BILSTEIN - B12 Sportline", "BILSTEIN - B12 Pro-Kit", "BILSTEIN - B1 Module",
  "BILSTEIN - B6 Performance", "BILSTEIN - B8 Performance Plus",
  "BILSTEIN - B4 OE Replacement",
];

const allMakes = [
  "Alfa Romeo", "Audi", "BMW", "Ford", "Ford (USA)", "Honda", "Hyundai",
  "Jaguar", "Kia", "Land Rover", "Lexus", "Mazda", "Mercedes-Benz", "MINI",
  "MITSUBISHI", "Nissan", "Opel", "Peugeot", "Porsche", "Saab", "Skoda",
  "smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Volvo", "VW",
];
const brandFilter = argOf('brands', null);
const seriesFilter = argOf('series', null);
const targetMakes = brandFilter ? brandFilter.split('|') : allMakes;

const targetCategories = [
  { id: "Shock Absorber", targetKeywords: ["Shock Absorber", "Stoßdämpfer"] },
  { id: "Suspension Kit, complete", targetKeywords: ["Suspension Kit", "Service parts", "Reparatursatz", "Complete"] },
  { id: "Suspension Parts", targetKeywords: ["Suspension Parts", "Mounting parts", "Anbauteile", "Rubber Buffer", "Protection Kit", "Attachment parts"] },
];
const parentStrategies = [
  { name: "Suspension (Preferred)", keywords: ["Suspension", "Federung", "Damping", "Dämpfung"] },
  { name: "Axle/Steering (Fallback)", keywords: ["Axle Mounting", "Steering", "Wheels", "Achsaufhängung", "Radführung", "Räder"] },
];
const globalBadWords = [
  "Deutsch", "English", "Français", "Italiano", "Español", "Nederlands",
  "Dansk", "Svenska", "Norsk", "Suomi", "Magyar", "Português", "русский",
  "čeština", "polski", "Ελληνικά", "Română", "Türkçe", "Hrvatski",
  "Bulgarian", "Slovenian", "Slovenski", "Slovak", "Srpski", "Eesti", "Latviešu", "Lietuvių", "Icelandic", "Maltese",
  "Log on", "Login", "Print", "Basket",
  "Home", "Back", "Next", "Zurück", "Weiter", "Search", "Suche", "Contact", "Kontakt",
  "Version", "Mobile", "AGB", "Privacy", "Datenschutz", "Catalog", "Katalog", "Master-Check",
  "Korpa", "Ostukorv", "Košarica", "Cart", "Shopping", "Passenger car", "Commercial vehicle",
];

async function downloadOneImage(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.status === 200) {
        const arr = Buffer.from(await res.arrayBuffer());
        if (arr.length > 100) return arr;
      }
      return null;
    } catch (e) { if (attempt === 0) await sleep(800); }
  }
  return null;
}

async function downloadImages(parts) {
  for (const p of parts) {
    p.imgFile = '';
    if (!p.image_url) continue;
    const tail = p.image_url.split('/').pop().split('?')[0];
    const ext = (tail.match(/\.(jpg|jpeg|png|gif|webp)$/i) || ['.JPG'])[0];
    const fname = p.sku + ext;
    p.imgFile = 'images/' + fname;
    if (downloadedSet.has(fname)) continue;
    const buf = await downloadOneImage(p.image_url);
    if (buf) { fs.writeFileSync(path.join(imagesDir, fname), buf); downloadedSet.add(fname); }
    else { p.imgFile = ''; console.warn(`   ⚠️ 圖片失敗: ${p.image_url}`); }
    await sleep(100);
  }
}

async function harvestMakeLinks(page, targets) {
  const frames = page.frames();
  let best = [];
  for (const frame of frames) {
    try {
      const links = await frame.evaluate((targetList) => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => a.href.includes("default.aspx") && !a.href.includes("javascript"))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(l => targetList.some(t => {
            const p = l.text.toLowerCase(), q = t.toLowerCase();
            if (q === "ford") return p === "ford";
            if (q === "ford (usa)") return p.includes("ford") && p.includes("usa");
            if (q === "vw") return p === "vw" || p === "volkswagen";
            return p === q || p.includes(q);
          }));
      }, targets);
      if (links.length > best.length) best = links;
    } catch (e) { if (!e.message.includes('detached')) console.warn(e.message); }
  }
  const m = new Map();
  best.forEach(l => { if (!m.has(l.text)) m.set(l.text, l); });
  return [...m.values()];
}

async function harvestSeriesLinks(page) {
  const frames = page.frames();
  let best = [];
  for (const frame of frames) {
    try {
      const links = await frame.evaluate((bad) => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => a.href.includes("default.aspx"))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(l => {
            const t = l.text;
            if (t.length < 3) return false;
            if (bad.some(b => t.includes(b))) return false;
            if (t.includes(" - ") || /^\d{2}\./.test(t) || /[а-яА-ЯёЁ]/.test(t) || !/[a-zA-Z]/.test(t)) return false;
            return true;
          });
      }, globalBadWords);
      if (links.length > best.length) best = links;
    } catch (e) { if (!e.message.includes('detached')) console.warn(e.message); }
  }
  const m = new Map();
  best.forEach(l => m.set(l.href, l));
  return [...m.values()];
}

async function harvestVehicleLinks(page) {
  const frames = page.frames();
  let best = [];
  for (const frame of frames) {
    try {
      const links = await frame.evaluate((bad) => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => a.href.includes("default.aspx"))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(l => {
            const t = l.text;
            if (t.length < 2 || t.length > 80) return false;
            if (bad.some(b => t.includes(b))) return false;
            if (t.includes(" - ") || /^\d{2}\./.test(t)) return false;
            return /\d\.\d/.test(t) || /kW|PS|hp/i.test(t) || /GTI|GTE|GTD|TSI|TDI|FSI|TFSI|Hybrid|4motion|4WD|GR|V6|V5|R32|R36|16V/i.test(t);
          });
      }, globalBadWords);
      if (links.length > best.length) best = links;
    } catch (e) { if (!e.message.includes('detached')) console.warn(e.message); }
  }
  const m = new Map();
  best.forEach(l => m.set(l.href, l));
  return [...m.values()];
}

// ══════════════════════════════════════════════════════════════════
// ✅ [V11 新增] 新版 `row_type="artikel1"` 結構的确定性解析
//
// 新版結構：
//   row_type="genart"      → 產品線標題
//   row_type="einspeiser"  → 供應商（BILSTEIN）
//   row_type="artikel1"    → SKU + 價格（SKU 在 input#artid 屬性）
//   row_type="artikel2"    → 名稱（tr_bez）+ 規格
//
// SKU 與名稱不同列 → 舊的「行內文字狀態機」湊不到一起。
// 這裡直接照結構抓，不依賴狀態機。
//
// ⚠️ 這頁是 ASP.NET postback，點完分類後 DOM 是動態長出來的。
//    實測「點完立刻抓」會拿到 0 筆（tr 還沒長回來）→ 必須輪詢等 artikel1 出現。
// ══════════════════════════════════════════════════════════════════
async function scrapeArticleRows(page, categoryName, seriesName, vData, waitTries = 6) {
  let best = [];
  let diag = [];
  let loadedButEmpty = 0;   // 頁面已載入（trs>=5）但沒有 artikel1 的連續次數
  for (let attempt = 0; attempt < waitTries && best.length === 0; attempt++) {
    const frames = page.frames();
    for (const frame of frames) {
      let probe = null;
      try {
        probe = await frame.evaluate(() => ({
          trs: document.querySelectorAll('tr').length,
          art1: document.querySelectorAll('tr[row_type="artikel1"]').length,
          url: location.href.slice(-60),
        }));
      } catch (e) { continue; }
      if (probe.trs < 5) continue;   // 頁面還沒長回來 → 繼續等

      // ✅ 已載入但無 artikel1：連續 2 次（約 1.2s）→ 提早放棄。
      //    因為『分類連結找不到時』現在會先等 1.2s 才我第一次 probe，
      //    到 probe 時 postback 已完成；實測門檻 2 不會再漏 GR Yaris（T8 那次的問題
      //    是 probe 跑在 postback 之前，不是門檻太高）。
      if (probe.art1 === 0) {
        loadedButEmpty++;
        if (loadedButEmpty >= 2) { diag.push(`no-art1 trs=${probe.trs}`); return []; }
        await sleep(500);
        continue;
      }
      loadedButEmpty = 0;
      try {
        const rows = await frame.evaluate((catName) => {
          const out = [];

          const skuFrom = (row) => {
            for (const el of row.querySelectorAll('*')) {
              for (const at of el.attributes || []) {
                if (typeof at.value !== 'string') continue;
                const m = at.value.match(/(\d{2})-(\d{6,}[A-Z0-9]*)/);
                if (m && (at.name === 'id' || at.name === 'name')) return `${m[1]}-${m[2]}`;
              }
            }
            const t = row.innerText || '';
            const m3 = t.match(/(\d{2})\s*-\s*(\d{6,}[A-Z0-9]*)/);
            return m3 ? `${m3[1]}-${m3[2]}` : null;
          };

          const priceFrom = (row) => {
            const t = row.innerText || '';
            const m = t.match(/([\d][\d.,]*)\s*EUR/);
            if (!m) return 0;
            const raw = m[1];
            return raw.includes(',') && raw.lastIndexOf(',') > raw.lastIndexOf('.')
              ? parseFloat(raw.replace(/\./g, '').replace(',', '.'))
              : parseFloat(raw.replace(/,/g, ''));
          };

          const nameFrom = (artRow) => {
            let sib = artRow.nextElementSibling;
            for (let i = 0; i < 3 && sib; i++, sib = sib.nextElementSibling) {
              const bez = sib.querySelector('tr.tr_bez');
              if (bez) return bez.innerText.trim().replace(/\s+/g, ' ');
              const t = sib.innerText || '';
              const m = t.match(/BILSTEIN\s*-\s*([A-Z0-9 \-]+)/);
              if (m) return ('BILSTEIN - ' + m[1]).trim();
            }
            return null;
          };

          const specsFrom = (artRow) => {
            let sib = artRow.nextElementSibling;
            const out2 = [];
            for (let i = 0; i < 3 && sib; i++, sib = sib.nextElementSibling) {
              for (const k of Array.from(sib.querySelectorAll('tr'))) {
                const t = (k.innerText || '').replace(/\s+/g, ' ').trim();
                if (t.length > 3 && t.length < 400 && !out2.includes(t)) out2.push(t);
              }
              if (out2.length > 4) break;
            }
            return out2;
          };

          const imgFrom = (artRow) => {
            const img = artRow.querySelector('img[src*="ImageData/ArtThumb"]');
            if (img) return img.src;
            let sib = artRow.nextElementSibling;
            for (let i = 0; i < 3 && sib; i++, sib = sib.nextElementSibling) {
              const im = sib.querySelector('img[src*="ImageData/ArtThumb"]');
              if (im) return im.src;
            }
            return '';
          };

          for (const tr of Array.from(document.querySelectorAll('tr'))) {
            const rt = tr.getAttribute('row_type') || '';
            if (rt !== 'artikel1') continue;
            const sku = skuFrom(tr);
            if (!sku) continue;
            out.push({
              sku, price: priceFrom(tr), name: nameFrom(tr),
              specs: specsFrom(tr), img: imgFrom(tr), productGroup: catName,
            });
          }
          return out;
        }, categoryName);
        if (rows.length > best.length) best = rows;
      } catch (e) {}
      if (best.length) break;
    }
    if (best.length) break;
    await sleep(600);   // 等 ASP.NET postback 把 DOM 長回來（總共最多約 24s）
  }

  // 抓不到時把診斷訊息帶回呼叫端（用非同步屬性傳遞，不破壞回傳型別）
  if (!best.length && diag.length) scrapeArticleRows.lastDiag = diag.join(' ; ');

  return best.map(r => {
    const sku = r.sku;
    let finalName = r.name || '';
    let msg = r.name ? 'Self' : 'Inherited (artikel1)';
    if (sku.startsWith('22-') || sku.startsWith('19-')) {
      finalName = 'BILSTEIN - B4 OE Replacement'; msg += ' -> SKU_Force(B4)';
    } else if (sku.startsWith('24-') || sku.startsWith('35-')) {
      if (/B4/.test(finalName)) { finalName = 'BILSTEIN - B6 Performance'; msg += ' -> SKU_Fix(B6)'; }
      const dl = (r.specs.join(' ') + ' ' + r.productGroup).toLowerCase();
      if (/sports suspension|lowered/.test(dl) && /B6/.test(finalName)) {
        finalName = 'BILSTEIN - B8 Performance Plus'; msg += ' -> Feature_Fix(B8)';
      }
    }
    if (!finalName) finalName = 'BILSTEIN - ' + sku;
    return {
      sku, name: finalName, brand: 'BILSTEIN', price: r.price,
      desc: r.specs.join(' | '), category: r.productGroup, series: seriesName,
      v_make: vData.make, v_model: vData.model, v_type: vData.type,
      v_year: vData.year, v_hp: vData.hp, v_ccm: vData.ccm,
      v_engine: vData.engine, v_kba: vData.kba,
      image_url: r.img, imgFile: '', debug_note: msg,
      vehicle_key: vData.vehicleKey || '',
    };
  });
}

// ── 車型資訊（Manufacturer / Model / Type / 年式 / 引擎）─────────
async function scrapeVehicleInfo(page) {
  const v = { make: '', model: 'Unknown', type: '', year: '', hp: '', ccm: '', engine: '', kba: '', vehicleKey: '' };
  for (const frame of page.frames()) {
    try {
      const d = await frame.evaluate(() => {
        const o = {};
        const tds = Array.from(document.querySelectorAll('td'));
        const getVal = (label) => {
          const td = tds.find(x => x.innerText.trim() === label);
          if (td && td.nextElementSibling) {
            const t = td.nextElementSibling;
            const ti = t.querySelector('[title]');
            let v = t.getAttribute('title') || (ti ? ti.getAttribute('title') : '');
            if (!v || v.length <= t.innerText.trim().length) v = t.textContent.trim().replace(/\s+/g, ' ');
            if (v.endsWith('...')) v = v.slice(0, -3).trim();
            return v;
          }
          return null;
        };
        if (tds.some(x => x.innerText.includes('Manufacturer'))) {
          o.make = getVal('Manufacturer'); o.model = getVal('Model'); o.type = getVal('Type');
          o.year = getVal('From - to'); o.hp = getVal('kW / HP'); o.ccm = getVal('ccm');
          o.engine = getVal('Engine Code'); o.kba = getVal('KBA Keynumber');
        }
        return o;
      });
      Object.keys(d).forEach(k => { if (d[k]) v[k] = d[k]; });
    } catch (e) {}
  }
  if (v.model.includes('...') || v.model === 'Unknown') {
    for (const frame of page.frames()) {
      try {
        const c = await frame.evaluate(() => {
          let found = "";
          for (const el of document.querySelectorAll('*')) {
            const t = el.getAttribute('title');
            if (t && t.includes("(") && t.length > found.length && !t.includes("...")) found = t;
            if (el.children.length === 0 && el.innerText && el.innerText.includes("(") && el.innerText.length > found.length && el.innerText.length < 100) found = el.innerText;
          }
          return found;
        });
        if (c && c.length > v.model.length) v.model = c;
      } catch (e) {}
    }
  }
  return v;
}

// ── V10 舊解析器（新版抓不到時的回退）─────────────────────────────
async function scrapeCurrentPage(page, categoryName, seriesName) {
  const vInfo = await scrapeVehicleInfo(page);
  const resultContainer = [];

  for (const frame of page.frames()) {
    let trCount = 0;
    try { trCount = await frame.evaluate(() => document.querySelectorAll('tr').length); } catch (e) {}
    if (trCount < 10) continue;

    try {
      const result = await frame.evaluate((ctx) => {
        const { vInfo, whitelist, catName, sName } = ctx;
        const data = [];
        const rows = document.querySelectorAll('tr');
        let headerContext = { name: "Unknown Name" };
        let currentItem = null;
        const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

        const findImgUrl = (row) => {
          const img = row.querySelector('img[src*="ImageData/ArtThumb"]');
          if (img) return img.src;
          return '';
        };

        const findSkuInRow = (row) => {
          for (const el of row.querySelectorAll('*')) {
            for (const at of el.attributes || []) {
              if (typeof at.value === 'string' && /\d\d-\d{6,}/.test(at.value)) {
                const m = at.value.match(/(\d{2})-(\d{6,}[A-Z0-9]*)/);
                if (m) return `${m[1]}-${m[2]}`;
              }
            }
          }
          const t = row.innerText || '';
          const m2 = t.match(/(\d{2})\s*-\s*(\d{6,}[A-Z0-9]*)/);
          return m2 ? `${m2[1]}-${m2[2]}` : null;
        };

        const flushItem = () => {
          if (!currentItem) return;
          let finalName = (currentItem.name && !currentItem.name.includes("Alternative")) ? currentItem.name : headerContext.name;
          const descText = currentItem.desc.join('\n');
          const descLower = descText.toLowerCase();
          let msg = currentItem.name ? "Self" : `Inherited (${headerContext.name})`;
          const sku = currentItem.sku;
          if (sku.startsWith("22-") || sku.startsWith("19-")) {
            finalName = "BILSTEIN - B4 OE Replacement"; msg += " -> SKU_Force(B4)";
          } else if (sku.startsWith("24-") || sku.startsWith("35-")) {
            if (finalName.includes("B4")) { finalName = "BILSTEIN - B6 Performance"; msg += " -> SKU_Fix(B6)"; }
            if (descLower.includes("sports suspension") || descLower.includes("lowered")) {
              if (finalName.includes("B6")) { finalName = "BILSTEIN - B8 Performance Plus"; msg += " -> Feature_Fix(B8)"; }
            }
            if (sku === "35-229919" && !finalName.includes("B8")) finalName = "BILSTEIN - B8 Performance Plus";
          }
          data.push({
            sku, name: finalName, brand: "BILSTEIN", price: currentItem.price,
            desc: descText, category: catName, series: sName,
            v_make: vInfo.make, v_model: vInfo.model, v_type: vInfo.type,
            v_year: vInfo.year, v_hp: vInfo.hp, v_ccm: vInfo.ccm,
            v_engine: vInfo.engine, v_kba: vInfo.kba,
            image_url: currentItem.img, imgFile: '', debug_note: msg,
            vehicle_key: vInfo.vehicleKey || '',
          });
          currentItem = null;
        };

        rows.forEach((row) => {
          let innerText = row.innerText.trim();
          if (innerText === "") {
            const img = row.querySelector('img');
            if (img) innerText = ((img.getAttribute('alt') || "") + " " + (img.getAttribute('title') || "")).trim();
          }
          innerText = innerText.replace(/ReplacementSuspension/gi, "Replacement Suspension").replace(/PerformanceSuspension/gi, "Performance Suspension");

          const m = innerText.match(/(\d{2})\s*-\s*(\d{6}[A-Z0-9]*)/);
          let sku = m ? `${m[1]}-${m[2]}` : null;
          if (!sku) sku = findSkuInRow(row);

          const lines = row.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (!lines.length && innerText.length > 0) lines.push(innerText);

          let price = 0, localName = null;
          const localDesc = [];
          lines.forEach((line) => {
            if (line.includes('EUR')) {
              const pm = line.match(/([\d\.,]+)\s*EUR/);
              if (pm) {
                let raw = pm[1];
                raw = raw.includes(',') && raw.lastIndexOf(',') > raw.lastIndexOf('.') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
                price = parseFloat(raw);
              }
            }
            if (!localName) {
              for (const w of whitelist) {
                if (normalize(line).includes(normalize(w))) {
                  localName = whitelist.find(t => t.includes(w) && t.includes("BILSTEIN")) || ("BILSTEIN - " + w);
                  break;
                }
              }
              if (!localName) {
                const hasModel = /\b(B4|B6|B8|B12|B14|B16|EVO|PSS)\b/i.test(line);
                const hasType = /\b(Performance|Replacement|Sportline|Pro-Kit)\b/i.test(line);
                if ((hasModel || hasType) && !line.includes(":") && line.length < 80) {
                  localName = line.trim();
                  if (!localName.includes("BILSTEIN")) localName = "BILSTEIN - " + localName;
                }
              }
            }
            const junk = line.includes("Alternative parts") || line.includes("General information") ||
              line.includes("Item replaces") || line.includes("EUR") ||
              line.includes("Add to shopping") || line.includes("Warenkorb") ||
              line === "Piece" || line === "BILSTEIN";
            const technical = line.includes(":") || line.includes("Suspension") || line.includes("Axle");
            if ((technical || (!junk && line.length > 3)) && line !== localName && !line.includes(sku)) localDesc.push(line);
          });

          if (sku && price > 0) {
            flushItem();
            currentItem = { sku, price, name: localName, desc: [...localDesc], img: findImgUrl(row) };
          } else if (localName && !localName.includes("Alternative")) {
            headerContext.name = localName;
          } else if (localDesc.length > 0 && currentItem) {
            currentItem.desc.push(...localDesc);
          }
        });
        flushItem();
        return data;
      }, { vInfo, whitelist: nameWhitelist, catName: categoryName, sName: seriesName });

      if (result && result.length > 0) resultContainer.push(...result);
    } catch (e) {}
  }
  return resultContainer;
}

async function processSingleVehicle(page, seriesName) {
  // ✅ [V11 效能] 實測車型頁「不會」直接帶商品列表（debug HTML 裡的 artikel1 來自
  //    分類頁，不是車型頁）→ 快速路徑無效，反而每車型白等 2.4 秒。
  //    17,539 車型 × 2.4s = 12 小時的無謂開銷 → 移除。
  let allParts = [];
  for (const target of targetCategories) {
    let targetLink = null, targetFrame = null, resetClicked = false;

    for (const frame of page.frames()) {
      try {
        const clicked = await frame.evaluate(() => {
          const a = Array.from(document.querySelectorAll('a'))
            .find(x => x.innerText.trim() === "Parts catalogue" || x.innerText.trim() === "Teilekatalog");
          if (a) { a.click(); return true; }
          return false;
        });
        if (clicked) { resetClicked = true; break; }
      } catch (e) {}
    }
    if (resetClicked) await sleep(1200);

    let parentExpanded = false;
    for (const strategy of parentStrategies) {
      for (const frame of page.frames()) {
        try {
          const clicked = await frame.evaluate((kw) => {
            const a = Array.from(document.querySelectorAll('a')).find(x => {
              const t = x.innerText.toLowerCase();
              return kw.some(k => t.includes(k.toLowerCase())) && !t.includes("kit") && !t.includes("mounting parts") && !t.includes("shock absorber");
            });
            if (a) { a.click(); return true; }
            return null;
          }, strategy.keywords);
          if (clicked) { parentExpanded = true; await sleep(1500); break; }
        } catch (e) {}
      }
      if (parentExpanded) break;
    }

    for (const frame of page.frames()) {
      try {
        const info = await frame.evaluate((keys) => {
          for (const a of document.querySelectorAll('a')) {
            if (keys.some(k => a.innerText.toLowerCase().includes(k.toLowerCase()))) return { href: a.href, text: a.innerText };
          }
          return null;
        }, target.targetKeywords);
        if (info) { targetLink = info; targetFrame = frame; break; }
      } catch (e) {}
    }

    // ✅ [V11] 不再要求「必須找到分類連結」才抓 —
    //    新版目錄的商品頁可能直接由車型頁轉換而來，分類連結找不到時
  //    頁面本身可能已經是商品頁（GR Yaris 就是這種情況）。
    //    一律嘗試解析當前頁，抓到為止。
    let didNavigate = false;
    if (targetLink) {
      if (targetLink.href && !targetLink.href.includes("javascript")) {
        try { await page.goto(targetLink.href, { waitUntil: 'load', timeout: 60000 }); didNavigate = true; } catch (e) {}
      } else {
        try {
          await targetFrame.evaluate((t) => {
            const a = Array.from(document.querySelectorAll('a')).find(x => x.innerText === t);
            if (a) a.click();
          }, targetLink.text);
          didNavigate = true;
        } catch (e) {}
      }
    }

    // 只在有導航或是第一個分類時才抓（避免同一頁重複抓 3 次）
    if (!didNavigate && target.id !== 'Shock Absorber') continue;
    await sleep(1500);

    const vInfo = await scrapeVehicleInfo(page);
    scrapeArticleRows.lastDiag = '';
    let parts = await scrapeArticleRows(page, target.id, seriesName, vInfo);
    if (!parts.length) {
      console.log(`         ↳ ${target.id}: artikel1 解析 0 筆 ${scrapeArticleRows.lastDiag ? '(' + scrapeArticleRows.lastDiag + ')' : ''}`);
      parts = await scrapeCurrentPage(page, target.id, seriesName);
    }
    allParts.push(...parts);
  }
  return allParts;
}

// ── 主流程 ────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 [V11] 啟動（visited 以 32=<vehicle id> 為鍵；0 筆不標記已讀；新版 artikel1 結構解析）");

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const rootUrl = 'https://web1.carparts-cat.com/default.aspx?11=18&14=4&12=100';

  try { await page.goto(rootUrl, { waitUntil: 'load', timeout: 60000 }); } catch (e) {}
  await sleep(2500);

  let makeLinks = [];
  for (let t = 0; t < 12 && makeLinks.length === 0; t++) {
    makeLinks = await harvestMakeLinks(page, targetMakes);
    if (!makeLinks.length) { console.log(`   ⏳ 等待頁面 ${t + 1}`); await sleep(3000); }
  }
  console.log(`✅ 鎖定 ${makeLinks.length} / ${targetMakes.length} 個品牌`);

  let okCount = 0, emptyCount = 0, skipCount = 0;

  for (let m = 0; m < makeLinks.length; m++) {
    const mLink = makeLinks[m];
    console.log(`\n🏭 [品牌 ${m + 1}/${makeLinks.length}] ${mLink.text}`);
    try { await page.goto(mLink.href, { waitUntil: 'load', timeout: 60000 }); } catch (e) {}
    await sleep(2000);

    const seriesLinks = await harvestSeriesLinks(page);
    console.log(`   車系 ${seriesLinks.length} 個`);

    for (let s = 0; s < seriesLinks.length; s++) {
      const sLink = seriesLinks[s];
      if (seriesFilter && !sLink.text.toLowerCase().includes(seriesFilter.toLowerCase())) continue;
      console.log(`\n   📂 ${sLink.text}`);

      try { await page.goto(sLink.href, { waitUntil: 'load', timeout: 60000 }); } catch (e) {}
      await sleep(1500);

      const vehicleLinks = await harvestVehicleLinks(page);
      console.log(`      車型 ${vehicleLinks.length} 款`);

      for (let v = 0; v < vehicleLinks.length; v++) {
        const vLink = vehicleLinks[v];
        const vKey = vehicleKey(vLink.href);
        const DEBUG = hasFlag('debug-empty');

        if (!DEBUG && !hasFlag('redo-failed') && visitedSet.has(vKey)) {
          console.log(`      ⏭️ [略過] ${vLink.text}`);
          skipCount++;
          continue;
        }

        console.log(`      🚗 ${vLink.text}`);
        let parts = [];
        try {
          await page.goto(vLink.href, { waitUntil: 'load', timeout: 60000 });
          await sleep(1200);
          parts = await processSingleVehicle(page, sLink.text);
        } catch (e) {
          console.error(`         ❌ ${e.message}`);
        }

        if (DEBUG && parts.length === 0) {
          const tag = `${mLink.text}_${vKey}`.replace(/[^\w-]/g, '_');
          try {
            fs.writeFileSync(path.join(FAILED, `debug_${tag}.html`), await page.content());
            console.log(`         🔍 傾印 debug_${tag}.html`);
          } catch (e) {}
        }

        if (parts.length > 0) {
          await downloadImages(parts);
          for (const p of parts) p.vehicle_key = vKey;
          const map = new Map();
          parts.forEach(p => {
            const k = `${p.sku}_${p.v_type}_${p.series}_${vKey}`;
            if (!map.has(k)) map.set(k, p);
            else if (!(map.get(k).price > 0) && p.price > 0) map.set(k, p);
          });
          await csvWriter.writeRecords([...map.values()]);

          visitedSet.add(vKey);
          fs.appendFileSync(VISITED, vKey + '\n');
          failedSet.delete(vKey);

          const byType = new Map();
          parts.forEach(p => byType.set(p.v_type || '(未知)', (byType.get(p.v_type || '(未知)') || 0) + 1));
          manifest.set(vKey, {
            vehicle_id: vKey,
            series: sLink.text,
            types: [...byType.keys()].join(' | '),
            n_parts: String(parts.length),
            n_skus: String(new Set(parts.map(p => p.sku)).size),
          });
          okCount++;
          console.log(`         ✅ ${parts.length} 筆 / ${new Set(parts.map(p => p.sku)).size} SKU`);
        } else {
          failedSet.add(vKey);
          fs.appendFileSync(path.join(FAILED, 'all.txt'), vKey + '\n');
          fs.appendFileSync(path.join(FAILED, `${mLink.text.replace(/[^\w]/g, '_')}.txt`),
            `${vKey}\t${sLink.text}\t${vLink.text}\n`);
          emptyCount++;
          console.log(`         ⚠️ 0 筆 → 記入 failed（不標記已讀）`);
        }
      }
    }
    fs.writeFileSync(MANIFEST,
      'vehicle_id,series,types,n_parts,n_skus\n' +
      [...manifest.values()].map(r => `${r.vehicle_id},"${(r.series || '').replace(/"/g, '""')}",${r.types},${r.n_parts},${r.n_skus}`).join('\n'));
  }

  console.log(`\n🎉 完成 | 成功 ${okCount} | 空 ${emptyCount} | 略過 ${skipCount}`);
  console.log(`   零件 CSV : ${OUT}`);
  console.log(`   visited  : ${VISITED} (${visitedSet.size})`);
  console.log(`   failed   : ${FAILED} (${failedSet.size})`);
  console.log(`   manifest : ${MANIFEST}`);

  await context.close();
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });