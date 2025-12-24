// seed_categories.js — 零件目錄播種腳本 (主/子分類)
// 直接：node seed_categories.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ============================== Utility Functions ============================== */

/**
 * 將中文名稱轉換為唯一的英文 Slug
 * @param {string} s - 名稱
 */
function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/ /g, "_") // 保持空格為底線
    .replace(/[^a-z0-9\-_一-龥]/g, "") // 移除特殊符號，保留中文、字母、數字、底線、破折號
    .replace(/_+/g, "_");
}

/**
 * 建立或更新主分類 (categories)
 */
async function upsertCategory({ name, slug, sort_order = 0, is_active = true, is_nav = true }) {
  if (!slug) slug = slugify(name);
  
  // 檢查是否已存在
  const exists = await prisma.categories.findFirst({ where: { slug } });
  
  if (exists) {
    // 存在則更新
    return prisma.categories.update({
      where: { id: exists.id },
      data: { name, sort_order, is_active, is_nav, slug },
    });
  }
  
  // 不存在則創建
  return prisma.categories.create({
    data: { name, slug, sort_order, is_active, is_nav },
  });
}

/**
 * 建立或更新子分類 (subcategories)
 */
async function upsertSubcategory({ category_id, name, slug, sort_order = 0, is_active = true }) {
  if (!category_id) throw new Error("category_id required for subcategory");
  if (!slug) slug = slugify(name);
  
  // 檢查是否已存在
  const exists = await prisma.subcategories.findFirst({ 
    where: { category_id, slug } 
  });
  
  if (exists) {
    // 存在則更新
    return prisma.subcategories.update({
      where: { id: exists.id },
      data: { name, sort_order, is_active, slug },
    });
  }
  
  // 不存在則創建
  return prisma.subcategories.create({
    data: { category_id, name, slug, sort_order, is_active },
  });
}

/* ============================== Main Logic ============================== */

// 你的零件目錄結構
const CATEGORY_TREE = [
  { 
    name: "進氣", 
    children: [
      { name: "濾芯" }, 
      { name: "進氣套件" }, 
      { name: "渦輪管" }, 
      { name: "洩壓閥" }, 
      { name: "節氣門" }, 
      { name: "其他" }
    ] 
  },
  { 
    name: "排氣", 
    children: [
      { name: "排氣管" }, 
      { name: "觸媒" }
    ] 
  },
  { 
    name: "煞車", 
    children: [
      { name: "來令片" }, 
      { name: "碟盤" }, 
      { name: "煞車油管" }, 
      { name: "煞車套件" }
    ] 
  },
  { 
    name: "底盤", 
    children: [
      { name: "避震器" }, 
      { name: "短彈簧" }, 
      { name: "防傾桿" }, 
      { name: "其他" }
    ] 
  },
  { 
    name: "引擎", 
    children: [
      { name: "活塞連桿" }, 
      { name: "考耳" }, 
      { name: "渦輪" }, 
      { name: "其他" }
    ] 
  },
  { 
    name: "冷卻", 
    children: [
      { name: "水箱" }, 
      { name: "冷卻器" }
    ] 
  },
  { 
    name: "傳動", 
    children: [
      { name: "離合器" }, 
      { name: "差速器" }, 
      { name: "傳動軸" }, 
      { name: "其他" }
    ] 
  },
  { 
    name: "燃油", 
    children: [
      { name: "汽油幫浦" }, 
      { name: "噴油嘴" }
    ] 
  },
  { 
    name: "輪圈", 
    children: [
      { name: "鋁圈" }, 
      { name: "墊片" }, 
      { name: "輪胎" }
    ] 
  },
  { 
    name: "外觀", 
    children: [
      { name: "空力套件" }, 
      { name: "引擎蓋" }, 
      { name: "其他" }
    ] 
  },
  { 
    name: "內裝", 
    children: [
      { name: "腳踏墊" }, 
      { name: "座椅" }, 
      { name: "方向盤" }, 
      { name: "排檔頭" }
    ] 
  },
  { 
    name: "燈具", 
    children: [
      { name: "頭燈總成" }, 
      { name: "尾燈總成" }
    ] 
  },
  { 
    name: "電子", 
    children: [
      { name: "儀錶" }, 
      { name: "ECU" }
    ] 
  },
];

async function main() {
  console.log('📖 開始播種零件目錄...');

  // 建立主/子目錄
  let sort = 10;
  for (const node of CATEGORY_TREE) {
    
    // 建立主分類 (categories)
    const parent = await upsertCategory({ 
      name: node.name, 
      slug: slugify(node.name), // 確保 slug 唯一
      sort_order: sort 
    });
    
    console.log(`✅ 建立主分類: ${parent.name} (ID: ${parent.id})`);
    
    sort += 10;

    if (Array.isArray(node.children)) {
      let csort = 10;
      for (const child of node.children) {
        // 建立子分類 (subcategories)
        await upsertSubcategory({
          category_id: parent.id,
          name: child.name,
          slug: slugify(child.name),
          sort_order: csort,
        });
        process.stdout.write('.');
        csort += 10;
      }
      process.stdout.write('\n');
    }
  }

  // --- 額外：建立「商品品牌」主類別，用於品牌篩選 ---
  const brandsRoot = await upsertCategory({ name: "商品品牌", slug: "brands", sort_order: 999, is_nav: false });
  console.log(`✅ 建立品牌根分類: ${brandsRoot.name} (ID: ${brandsRoot.id})`);
  
  // 建立範例品牌子分類 (如果你有品牌清單，可以在這裡加入)
  const brands = ["K&N", "Bilstein", "KW", "HKS", "BMC"];
  let bsort = 1;
  for (const brandName of brands) {
    await upsertSubcategory({
      category_id: brandsRoot.id,
      name: brandName,
      slug: slugify(brandName),
      sort_order: bsort,
      is_active: true,
    });
    bsort++;
  }
  
  console.log('🎉 零件目錄播種完成！');
}

main()
  .catch((e) => {
    console.error('❌ 零件目錄播種失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });