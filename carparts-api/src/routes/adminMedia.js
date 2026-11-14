const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const adminAuth = require('../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/media/list?path=relative/path
// Lists files/directories under media/{path}（圖片網址從 /media/ 開始）
router.get('/list', async (req, res) => {
  try {
    const relativePath = req.query.path || '';
    const basePath = path.resolve(__dirname, '../../media');
    const targetPath = path.resolve(basePath, relativePath);

    // Prevent path traversal
    if (!targetPath.startsWith(basePath + path.sep) && targetPath !== basePath) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // 🆕 搜尋模式：遞迴搜尋檔名（含子目錄），回傳扁平清單，上限 200 筆
    const q = (req.query.q || '').trim();
    if (q) {
      const needle = q.toLowerCase();
      const results = [];
      const MAX_RESULTS = 200;
      const walk = (dir, rel) => {
        if (results.length >= MAX_RESULTS) return;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          if (results.length >= MAX_RESULTS) return;
          if (e.name === '.' || e.name === '..') continue;
          const relPath = path.posix.join(rel, e.name);
          if (e.isDirectory()) {
            walk(path.join(dir, e.name), relPath);
          } else if (e.name.toLowerCase().includes(needle)) {
            results.push({ name: e.name, type: 'file', path: relPath });
          }
        }
      };
      walk(targetPath, relativePath);
      return res.json(results);
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const result = entries
      .filter(e => e.name !== '.' && e.name !== '..')
      .map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
        path: path.posix.join(relativePath, e.name),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    res.json(result);
  } catch (err) {
    // 🔒 不要把原始例外字串回給 client（會外洩磁碟路徑 / 系統架構）
    console.error('媒體列表失敗:', err);
    res.status(500).json({ error: '讀取媒體目錄失敗' });
  }
});

module.exports = router;
