// scripts/compressExistingImages.js — 存量商品圖批次壓縮（一次性工具）
// 用法：node scripts/compressExistingImages.js [--dry-run]
// 策略：>150KB 的 jpg/png → 等比縮到最長邊 800px、JPEG q80，原地覆蓋
// 安全性：--dry-run 只統計不寫入；錯誤的檔案跳過並記錄
const fs = require('fs');
const path = require('path');
const { compressImage, needsCompression } = require('../src/services/imageService');

const ROOT = path.join(__dirname, '../media/parts');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXT = new Set(['.webp', '.gif', '.svg']); // 這些格式不動

async function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

(async () => {
  if (!fs.existsSync(ROOT)) { console.error('找不到 media/parts:', ROOT); process.exit(1); }

  const files = await walk(ROOT);
  let totalBefore = 0, totalAfter = 0;
  let processed = 0, skippedSmall = 0, skippedExt = 0, failed = 0;
  const failures = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (SKIP_EXT.has(ext)) { skippedExt++; continue; }
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) { skippedExt++; continue; }

    try {
      const stat = fs.statSync(file);
      if (!needsCompression(stat.size)) { skippedSmall++; continue; }

      totalBefore += stat.size;

      if (DRY_RUN) {
        // dry-run：估算壓縮後大小（實際壓但不寫）
        const buf = fs.readFileSync(file);
        const compressed = await compressImage(buf);
        totalAfter += compressed.length;
      } else {
        const buf = fs.readFileSync(file);
        const compressed = await compressImage(buf);
        fs.writeFileSync(file, compressed);
        totalAfter += compressed.length;
      }
      processed++;

      if (processed % 500 === 0) console.log(`… 已處理 ${processed} 張`);
    } catch (err) {
      failed++;
      failures.push(`${file}: ${err.message}`);
    }
  }

  console.log('='.repeat(50));
  console.log(DRY_RUN ? '【DRY-RUN 統計】' : '【壓縮完成】');
  console.log(`掃描檔案: ${files.length}`);
  console.log(`處理: ${processed}　跳過(已小): ${skippedSmall}　跳過(格式): ${skippedExt}　失敗: ${failed}`);
  console.log(`原始: ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
  console.log(`${DRY_RUN ? '預估壓縮後' : '壓縮後'}: ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
  if (totalBefore > 0) console.log(`節省: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
  if (failures.length) { console.log('\n失敗清單:'); failures.slice(0, 10).forEach(f => console.log(' ', f)); }
})();
