// src/services/imageService.js — 圖片壓縮工具（sharp）
// 上傳時壓縮 + 存量批次轉檔共用
const sharp = require('sharp');

// 商品圖目標：最長邊 800px、JPEG q80（約 50-120KB/張）
const PART_IMAGE = { maxEdge: 800, quality: 80 };

/**
 * 壓縮圖片 buffer：等比縮到最長邊 maxEdge，重新編碼 JPEG
 * @param {Buffer} buffer 原始檔
 * @param {{maxEdge?: number, quality?: number}} opts
 * @returns {Promise<Buffer>} 壓縮後 buffer
 */
async function compressImage(buffer, opts = {}) {
  const maxEdge = opts.maxEdge || PART_IMAGE.maxEdge;
  const quality = opts.quality || PART_IMAGE.quality;

  return sharp(buffer)
    .rotate() // 依 EXIF 自動轉正
    .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

/**
 * 若原檔已小於目標大小則不壓，避免重複處理
 */
function needsCompression(bufferSize, thresholdKB = 150) {
  return bufferSize > thresholdKB * 1024;
}

module.exports = { compressImage, needsCompression, PART_IMAGE };
