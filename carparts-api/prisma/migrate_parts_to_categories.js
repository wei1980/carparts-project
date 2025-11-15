// prisma/migrate_parts_to_categories.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slug = (s) => String(s || '').toLowerCase().trim()
  .normalize('NFKD').replace(/[^\w\s-/]/g, '')
  .replace(/\s+/g, '-');

const splitPath = (s) => String(s || '')
  .split(/[/>|→]/).map(x => x.trim()).filter(Boolean);

async function ensurePath(names) {
  let parent = null;
  for (const name of names) {
    const s = slug(name);
    let row = await prisma.categories.findUnique({ where: { slug: s } });
    if (!row) {
      const path = [parent?.path, s].filter(Boolean).join('/');
      row = await prisma.categories.create({ data: { name, slug: s, parent_id: parent?.id || null, path } });
    }
    parent = row;
  }
  return parent; // 最末節點
}

async function main() {
  const parts = await prisma.parts.findMany({ select: { id: true, category: true } });
  let linked = 0, skipped = 0;

  for (const p of parts) {
    if (!p.category) { skipped++; continue; }

    // 允許 "Suspension/Bushings" 或 "Suspension > Bushings" 這種寫法
    const names = splitPath(p.category);
    if (names.length === 0) { skipped++; continue; }

    const leaf = await ensurePath(names);

    // 清空舊有關聯再重建（確保唯一）
    await prisma.parts_on_categories.deleteMany({ where: { part_id: p.id } });
    await prisma.parts_on_categories.create({
      data: { part_id: p.id, category_id: leaf.id, is_primary: true }
    });
    linked++;
  }

  console.log(`🔗 migrated parts.category → parts_on_categories: linked=${linked}, skipped=${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
