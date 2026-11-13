const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 清理舊空濾資料 (續)...');

  // Find all air filter part IDs
  const airFilterParts = await prisma.part.findMany({
    where: { brand: { in: ['K&N', 'BMC', 'Pipercross'] } },
    select: { id: true }
  });
  const partIds = airFilterParts.map(p => p.id);
  console.log(`   找到 ${partIds.length} 個空濾零件`);

  // Check PartCompatibility count
  const compatCount = await prisma.partCompatibility.count({
    where: { part_id: { in: partIds } }
  });
  console.log(`   剩餘相容關係: ${compatCount} 個`);

  // Delete PartsOnCategories records first
  const deletedPOC = await prisma.partsOnCategories.deleteMany({
    where: { part_id: { in: partIds } }
  });
  console.log(`   刪除 ${deletedPOC.count} 個 PartsOnCategories 記錄`);

  // Now delete Part records
  const deletedParts = await prisma.part.deleteMany({
    where: { id: { in: partIds } }
  });
  console.log(`   刪除 ${deletedParts.count} 個零件`);

  // Verify
  const remaining = await prisma.part.count({
    where: { brand: { in: ['K&N', 'BMC', 'Pipercross'] } }
  });
  console.log(`   剩餘空濾零件: ${remaining}`);
  console.log('✅ 清理完成');

  await prisma.$disconnect();
}

cleanup().catch(async e => {
  console.error('❌ 清理失敗:', e);
  await prisma.$disconnect();
  process.exit(1);
});
