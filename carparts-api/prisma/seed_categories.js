// seed_categories.js — 零件目錄播種腳本 (主/子分類)
// 執行方式：node prisma/seed_categories.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoriesData = [
  {
    name: "進氣",
    subs: ["濾芯", "進氣套件", "渦輪管", "洩壓閥", "節氣門", "其他"]
  },
  {
    name: "排氣",
    subs: ["排氣管", "觸媒"]
  },
  {
    name: "煞車",
    subs: ["來令片", "碟盤", "煞車油管", "煞車套件"]
  },
  {
    name: "底盤",
    subs: ["避震器", "短彈簧", "防傾桿", "其他"]
  },
  {
    name: "引擎",
    subs: ["活塞連桿", "考耳", "渦輪", "其他"]
  },
  {
    name: "冷卻",
    subs: ["水箱", "冷卻器"]
  },
  {
    name: "傳動",
    subs: ["離合器", "差速器", "傳動軸", "其他"]
  },
  {
    name: "燃油",
    subs: ["汽油幫浦", "噴油嘴"]
  },
  {
    name: "輪圈",
    subs: ["鋁圈", "墊片", "輪胎"]
  },
  {
    name: "外觀",
    subs: ["空力套件", "引擎蓋", "其他"]
  },
  {
    name: "內裝",
    subs: ["腳踏墊", "座椅", "方向盤", "排檔頭"]
  },
  {
    name: "燈具",
    subs: ["頭燈總成", "尾燈總成"]
  },
  {
    name: "電子",
    subs: ["儀錶", "ECU"]
  }
];

async function main() {
  console.log('📖 開始匯入分類資料...');

  let sortOrder = 10;

  for (const cat of categoriesData) {
    // 1. 處理主目錄
    // 嘗試先尋找是否存在 (避免重複建立)
    let category = await prisma.categories.findFirst({
      where: { name: cat.name }
    });

    if (!category) {
      category = await prisma.categories.create({
        data: {
          name: cat.name,
          sort_order: sortOrder,
          is_active: true
        }
      });
      console.log(`✅ 新增主目錄: ${category.name}`);
    } else {
      console.log(`ℹ️ 主目錄已存在: ${category.name} (跳過建立)`);
    }

    sortOrder += 10;

    // 2. 處理子目錄
    let subSortOrder = 10;
    for (const subName of cat.subs) {
      // 檢查子目錄是否存在於該主目錄下
      let sub = await prisma.subcategories.findFirst({
        where: {
          category_id: category.id,
          name: subName
        }
      });

      if (!sub) {
        await prisma.subcategories.create({
          data: {
            name: subName,
            category_id: category.id,
            sort_order: subSortOrder,
            is_active: true
          }
        });
        console.log(`  └─ 新增子目錄: ${subName}`);
      }
      subSortOrder += 10;
    }
  }

  console.log('🎉 分類資料播種完成！');
}

main()
  .catch((e) => {
    console.error('❌ 發生錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });