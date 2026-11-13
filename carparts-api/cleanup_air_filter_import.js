// Clean up previous air filter import before re-importing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 清理之前的空濾資料...');

  // 1. Delete PartCompatibility links for air filter parts
  const compatCount = await prisma.partCompatibility.count({
    where: { part: { brand: { in: ['K&N', 'BMC', 'Pipercross', 'KN'] } } }
  });
  const deletedLinks = await prisma.partCompatibility.deleteMany({
    where: { part: { brand: { in: ['K&N', 'BMC', 'Pipercross', 'KN'] } } }
  });
  console.log(`  刪除相容關係: ${deletedLinks.count} 條`);

  // 2. Delete PartsOnCategories entries for air filter parts
  const deletedPOC = await prisma.partsOnCategories.deleteMany({
    where: { part: { brand: { in: ['K&N', 'BMC', 'Pipercross', 'KN'] } } }
  });
  console.log(`  刪除 PartsOnCategories: ${deletedPOC.count} 條`);

  // 3. Delete air filter parts
  const deletedParts = await prisma.part.deleteMany({
    where: { brand: { in: ['K&N', 'BMC', 'Pipercross', 'KN'] } }
  });
  console.log(`  刪除零件: ${deletedParts.count} 種`);

  const remaining = await prisma.part.count({ where: { brand: { in: ['K&N', 'BMC', 'Pipercross', 'KN'] } } });
  console.log(`  剩餘空濾零件: ${remaining} 種`);

  // Also reset vehicleVariant.part_count if not null
  await prisma.vehicleVariant.updateMany({
    where: { compatible_parts: { none: {} } },
    data: { part_count: 0 }
  });
  console.log('✅ 清理完成');
  await prisma.$disconnect();
}

cleanup().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
