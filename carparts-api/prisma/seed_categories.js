// seed_categories.js — upsert 主/子分類 + 商品品牌（brands）
// 直接：node seed_categories.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-一-龥]/g, "")
    .replace(/\-+/g, "-");
}

async function upsertCategory({ name, slug, sort_order = 0, is_active = true, is_nav = true }) {
  if (!slug) slug = slugify(name);
  const exists = await prisma.categories.findFirst({ where: { slug } });
  if (exists) {
    return prisma.categories.update({
      where: { id: exists.id },
      data: { name, sort_order, is_active, is_nav, slug },
    });
  }
  return prisma.categories.create({
    data: { name, slug, sort_order, is_active, is_nav },
  });
}

async function upsertSubcategory({ category_id, name, slug, sort_order = 0, is_active = true }) {
  if (!category_id) throw new Error("category_id required for subcategory");
  if (!slug) slug = slugify(name);
  const exists = await prisma.subcategories.findFirst({ where: { category_id, slug } });
  if (exists) {
    return prisma.subcategories.update({
      where: { id: exists.id },
      data: { name, slug, sort_order, is_active },
    });
  }
  return prisma.subcategories.create({
    data: { category_id, name, slug, sort_order, is_active },
  });
}

async function upsertBrand({ name, slug, logo_url = null }) {
  if (!slug) slug = slugify(name);
  return prisma.brands.upsert({
    where: { slug },
    update: { name, logo_url, is_active: true },
    create: { name, slug, logo_url },
  });
}

async function seedTree() {
  const tree = [
    {
      name: "進氣",
      slug: "intake",
      children: [
        { name: "濾芯", slug: "air-filter" },
        { name: "套件", slug: "intake-kit" },
        { name: "渦輪進氣管", slug: "turbo-inlet" },
        { name: "洩壓閥", slug: "dv-bov" },
        { name: "節氣門", slug: "throttle" },
        { name: "其他", slug: "intake-others" },
      ],
    },
    {
      name: "排氣",
      slug: "exhaust",
      children: [
        { name: "排氣管", slug: "catback" },
        { name: "觸媒頭段（Downpipe）", slug: "downpipe" },
        { name: "其他", slug: "exhaust-others" },
      ],
    },
    {
      name: "煞車",
      slug: "brake",
      children: [
        { name: "來令片", slug: "pads" },
        { name: "碟盤", slug: "rotors" },
        { name: "煞車油管", slug: "lines" },
        { name: "煞車套件", slug: "kits" },
      ],
    },
    {
      name: "底盤",
      slug: "chassis",
      children: [
        { name: "避震器", slug: "coilover" },
        { name: "短彈簧", slug: "lowering-springs" },
        { name: "防傾桿", slug: "swaybar" },
        { name: "其他", slug: "chassis-others" },
      ],
    },
    {
      name: "引擎",
      slug: "engine",
      children: [
        { name: "活塞、連桿、曲軸、汽缸墊片、凸輪軸", slug: "bottom-end" },
        { name: "點火線圈、火星塞", slug: "ignition" },
        { name: "渦輪", slug: "turbo" },
        { name: "其他", slug: "engine-others" },
      ],
    },
    {
      name: "冷卻",
      slug: "cooling",
      children: [
        { name: "水箱", slug: "radiator" },
        { name: "冷卻器", slug: "intercooler" },
      ],
    },
    {
      name: "傳動",
      slug: "drivetrain",
      children: [
        { name: "離合器飛輪", slug: "clutch-flywheel" },
        { name: "差速器", slug: "differential" },
        { name: "傳動軸", slug: "axle" },
        { name: "其他", slug: "drivetrain-others" },
      ],
    },
    {
      name: "燃油",
      slug: "fuel",
      children: [
        { name: "汽油幫浦", slug: "fuel-pump" },
        { name: "噴油嘴", slug: "injector" },
      ],
    },
    {
      name: "輪圈",
      slug: "wheels",
      children: [
        { name: "鋁圈／鋼圈", slug: "rims" },
        { name: "輪圈螺絲／螺帽", slug: "bolts-nuts" },
        { name: "增寬墊片", slug: "spacers" },
        { name: "中心蓋", slug: "center-caps" },
        { name: "輪胎", slug: "tires" },
      ],
    },
    {
      name: "外觀",
      slug: "exterior",
      children: [
        { name: "空力套件", slug: "aero" },
        { name: "引擎蓋", slug: "hood" },
      ],
    },
    {
      name: "大燈",
      slug: "lighting",
      children: [
        { name: "頭燈總成", slug: "headlights" },
        { name: "尾燈總成", slug: "taillights" },
      ],
    },
  ];

  // 建立主/子目錄
  let sort = 10;
  for (const node of tree) {
    const parent = await upsertCategory({ name: node.name, slug: node.slug, sort_order: sort });
    sort += 10;
    if (Array.isArray(node.children)) {
      let csort = 10;
      for (const child of node.children) {
        await upsertSubcategory({
          category_id: parent.id,
          name: child.name,
          slug: child.slug,
          sort_order: csort,
        });
        csort += 10;
      }
    }
  }

  // 建立「商品品牌」主類別 + 子品牌
  const brandsRoot = await upsertCategory({ name: "商品品牌", slug: "brands", sort_order: 999 });

  const brands = [
    "K&N",
    "Pipercross",
    "HKS",
    "BMC",
    "APR",
    "CTS Turbo",
    "Bilstein",
    "KW",
  ];
  let bsort = 10;
  for (const b of brands) {
    const brand = await upsertBrand({ name: b, slug: slugify(b) });
    await upsertSubcategory({
      category_id: brandsRoot.id,
      name: brand.name,
      slug: brand.slug,
      sort_order: bsort,
    });
    bsort += 10;
  }

  console.log("✅ categories seeded.");
}

async function main() {
  await seedTree();
}
main()
  .catch((e) => {
    console.error("❌ Seed categories failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
