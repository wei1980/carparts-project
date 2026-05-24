const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⚠️ 警告：即將清除所有商品資料！這項操作無法復原。');
  console.log('⏳ 正在處理中...');

  try {
    // 步驟 1: 清除「零件-車型對應關係」 (原本已成功的步驟)
    const deletedRelation = await prisma.partCompatibility.deleteMany();
    console.log(`✅ 已清除 ${deletedRelation.count} 筆零件-車型對應關係 (PartCompatibility)`);

    // 步驟 2 (新增): 清除「商品-分類關聯表」
    // 這是導致剛才報錯的原因，必須先斷開分類連結
    const deletedCategoriesRelation = await prisma.partsOnCategories.deleteMany();
    console.log(`✅ 已清除 ${deletedCategoriesRelation.count} 筆商品-分類關聯 (PartsOnCategories)`);

    // 可以在這裡加入其他關聯表的清除 (如果有的話，例如圖片 PartImage, 庫存 Inventory 等)
    // const deletedImages = await prisma.partImage.deleteMany();
    // console.log(`✅ 已清除 ${deletedImages.count} 筆商品圖片`);

    // 步驟 3: 清除「商品主檔」
    // 現在沒有其他資料依賴它了，可以安全刪除
    const deletedParts = await prisma.part.deleteMany();
    console.log(`✅ 已清除 ${deletedParts.count} 筆商品主檔 (Part)`);

    console.log('🎉 所有商品相關資料已成功清除完畢！');

  } catch (error) {
    console.error('❌ 清除失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();