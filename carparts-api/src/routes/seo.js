// src/routes/seo.js — 🆕 sitemap.xml 自動生成（商品 + 車廠 + 主要頁面）
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SITE = process.env.SITE_URL || 'https://carparts.example.com';

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// GET /sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const [parts, garages] = await Promise.all([
      prisma.part.findMany({
        where: { is_active: true },
        select: { id: true, updated_at: true },
        take: 5000,
      }),
      prisma.workshop.findMany({
        where: { is_garage: true, is_active: true },
        select: { id: true, updated_at: true },
      }),
    ]);

    const urls = [];
    const today = new Date().toISOString().slice(0, 10);

    // 靜態主要頁面
    for (const path of ['/', '/shop', '/garages']) {
      urls.push(`  <url><loc>${SITE}${path}</loc><changefreq>daily</changefreq></url>`);
    }

    // 商品頁
    for (const p of parts) {
      const lastmod = p.updated_at ? p.updated_at.toISOString().slice(0, 10) : today;
      urls.push(`  <url><loc>${SITE}/part/${p.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
    }

    // 車廠預約頁
    for (const g of garages) {
      const lastmod = g.updated_at ? g.updated_at.toISOString().slice(0, 10) : today;
      urls.push(`  <url><loc>${SITE}/garages/${g.id}/book</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
    }

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    );
  } catch (error) {
    console.error('sitemap 生成失敗:', error.message);
    res.status(500).type('text/plain').send('sitemap generation failed');
  }
});

module.exports = router;
