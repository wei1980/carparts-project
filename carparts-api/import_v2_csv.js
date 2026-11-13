const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const API_BASE = process.cwd();
const IMG_DIR = 'media/parts/Intake/airfilter';
const BRAND_DIRS = { 'K&N': 'KN', 'Pipercross': 'Pipercross', 'BMC': 'BMC' };

function parseLine(line) {
  const r = []; let c = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i+1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { r.push(c); c = ''; } else c += ch;
  }
  r.push(c); return r;
}

async function main() {
  const csvPath = path.join(API_BASE, 'media/Data/空濾商品上傳_20260925_V2.csv');
  const buf = fs.readFileSync(csvPath);
  let content;
  try { const iconv = require('iconv-lite'); content = iconv.decode(buf, 'big5'); }
  catch(e) { content = buf.toString('utf8'); }

  const lines = content.split('\r\n').filter(l => l.trim());
  const headers = parseLine(lines[0]);
  console.log('Headers:', headers.join(', '));
  console.log('Rows:', lines.length - 1);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const v = parseLine(lines[i]);
    const r = {}; headers.forEach((h, j) => r[h.trim()] = v[j] || '');
    rows.push(r);
  }

  // Subcategory lookup
  let subcatMap = {};
  try {
    const sc = await prisma.subcategories.findMany({ select: { id: true, name: true } });
    subcatMap = Object.fromEntries(sc.map(s => [s.name, s.id]));
  } catch(e) { console.log('No subcategories model'); }

  let updated = 0, inserted = 0, errors = [], missingImages = [];

  for (const row of rows) {
    try {
      const sku = (row['SKU'] || '').trim();
      if (!sku) continue;
      const brand = (row['Brand'] || '').trim();
      const dirName = BRAND_DIRS[brand] || brand;

      let imgUrl = (row['image_url'] || '').trim();
      if (imgUrl && imgUrl.startsWith('http')) { /* remote URL, use as-is */ }
      else if (imgUrl && imgUrl.startsWith('/media')) {
        if (!fs.existsSync(path.join(API_BASE, imgUrl))) imgUrl = null;
      } else if (!imgUrl) imgUrl = null;

      if (!imgUrl) {
        const skuNoSlash = sku.replace(/\//g, '');
        for (const ext of ['.webp', '.jpg']) {
          for (const relPath of [`${IMG_DIR}/${dirName}/${sku}${ext}`, `${IMG_DIR}/${dirName}/${skuNoSlash}${ext}`]) {
            if (fs.existsSync(path.join(API_BASE, relPath))) {
              imgUrl = `/media/parts/Intake/airfilter/${relPath.split(`${IMG_DIR}/`)[1]}`;
              break;
            }
          }
          if (imgUrl) break;
        }
      }

      if (!imgUrl) missingImages.push({ sku, brand, csv_image: row['image_url'] || 'empty' });

      const data = {
        name: row['Name'] || sku,
        brand: brand || null,
        category: row['category'] || null,
        msrp_price: parseFloat(row['msrp_twd']) || 0,
        wholesale_price: parseFloat(row['wholesale_twd']) || 0,
        stock_qty: parseInt(row['Own Stock']) || 0,
        distributor_stock_qty: parseInt(row['Distributor Stock']) || 0,
        image_url: imgUrl,
        description: row['description'] || null,
        is_universal: (row['is_universal'] || '').toString().toUpperCase() === 'TRUE',
      };

      if (row['subcategory'] && subcatMap[row['subcategory']]) data.subcategory_id = subcatMap[row['subcategory']];

      const existing = await prisma.part.findUnique({ where: { sku } });
      if (existing) { await prisma.part.update({ where: { sku }, data }); updated++; }
      else { await prisma.part.create({ data: { sku, ...data } }); inserted++; }

    } catch (err) { errors.push({ sku: row['SKU'], error: err.message }); }
  }

  console.log('\n=== Result ===');
  console.log('Updated:', updated, 'Inserted:', inserted, 'Errors:', errors.length);
  console.log('Missing images:', missingImages.length);
  if (missingImages.length > 0) {
    console.log('\n--- 商品料號沒有圖片 ---');
    missingImages.forEach(m => console.log('  ' + m.sku + ' (' + m.brand + ')'));
  }
  if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.slice(0, 10).forEach(e => console.log('  ' + e.sku + ': ' + e.error));
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
