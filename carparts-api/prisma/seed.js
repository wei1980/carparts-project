// prisma/seed.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('🌱 === 車大師 種子資料匯入開始 ===\n');

  // ========================================
    // 第 0 階段：建立預設管理員
    // ========================================
    try {
      console.log('📌 階段 0：建立預設管理員帳號...');
      const adminScript = path.join(__dirname, 'seeds', 'seed_admin.js');
      if (fs.existsSync(adminScript)) {
        execSync(`node "${adminScript}"`, { stdio: 'inherit' });
        console.log('✅ 管理員帳號處理完成\n');
      } else {
        console.log('⚠️ 找不到 seed_admin.js，跳過管理員建立\n');
      }
    } catch (err) {
      console.error('❌ 管理員建立失敗:', err.message);
    }

    // ========================================
    // 第 1 階段：基礎資料（分類 + 車型）
  // ========================================
  try {
    console.log('📌 階段 1-1：匯入分類階層...');
    const catScript = path.join(__dirname, 'seeds', 'seed_categories.js');
    if (fs.existsSync(catScript)) {
      execSync(`node "${catScript}"`, { stdio: 'inherit' });
      console.log('✅ 分類匯入完成\n');
    } else {
      console.log('⚠️ 找不到 seed_categories.js，跳過分類匯入\n');
    }
  } catch (err) {
    console.error('❌ 分類匯入失敗:', err.message);
  }

  try {
    console.log('📌 階段 1-2：匯入車型資料 (Makes.csv)...');
    const vehScript = path.join(__dirname, 'seeds', 'import_vehicles_csv.js');
    if (fs.existsSync(vehScript)) {
      execSync(`node "${vehScript}"`, { stdio: 'inherit' });
      console.log('✅ 車型匯入完成\n');
    } else {
      console.log('⚠️ 找不到 import_vehicles_csv.js，跳過車型匯入\n');
    }
  } catch (err) {
    console.error('❌ 車型匯入失敗:', err.message);
  }

  // ========================================
  // 第 2 階段：零件與分類關聯
  // ========================================
  console.log('📦 階段 2：匯入零件與分類...');
  const partsCsv = path.join(__dirname, 'seeds', 'parts.csv');
  const partsScript = path.join(__dirname, 'seeds', 'seed_parts.js');

  if (fs.existsSync(partsCsv) && fs.existsSync(partsScript)) {
    try {
      execSync(`node "${partsScript}" "${partsCsv}"`, { stdio: 'inherit' });
      console.log('✅ 零件匯入完成\n');
    } catch (err) {
      console.error('❌ 零件匯入失敗:', err.message);
    }
  } else {
    if (!fs.existsSync(partsCsv)) console.log('⚠️ 未找到 parts.csv');
    if (!fs.existsSync(partsScript)) console.log('⚠️ 未找到 seed_parts.js');
    console.log('💡 請確認檔案放置在 prisma/seeds/ 目錄下\n');
  }

  // ========================================
  // 第 3 階段：其他種子（預留）
  // ========================================
  // try { ... }

  console.log('🎉 === 所有種子資料匯入完畢 ===');
}

main().catch((e) => {
  console.error('💥 種子程式發生未預期錯誤:', e);
  process.exit(1);
});