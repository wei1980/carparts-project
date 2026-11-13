// Clean up old air filter data before re-import
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 清理舊空濾資料...');

  // 1. Find all air filter part IDs
  const airFilterParts = await prisma.part.findMany({
    where: { brand: { in: ['K&N', 'BMC', 'Pipercross'] } },
    select: { id: true, sku: true, brand: true }
  });
  console.log(`   找到 ${airFilterParts.length} 個空濾零件`);

  const partIds = airFilterParts.map(p => p.id);

  // 2. Delete PartCompatibility records for these parts
  const deletedCompat = await prisma.partCompatibility.deleteMany({
    where: { part_id: { in: partIds } }
  });
  console.log(`   刪除 ${deletedCompat.count} 個相容關係`);

  // 3. Delete Part records
  const deletedParts = await prisma.part.deleteMany({
    where: { id: { in: partIds } }
  });
  console.log(`   刪除 ${deletedParts.count} 個零件`);

  // 4. Verify
  const remaining = await prisma.part.count({
    where: { brand: { in: ['K&N', 'BMC', 'Pipercross'] } }
  });
  const remainingCompat = await prisma.partCompatibility.count({
    where: { part: { brand: { in: ['K&N', 'BMC', 'Pipercross'] } } }
  });
  console.log(`   剩餘空濾零件: ${remaining}`);
  console.log(`   剩餘相容關係: ${remainingCompat}`);

  await prisma.$disconnect();
  console.log('✅ 清理完成');
}

cleanup().catch(async e => {
  console.error('❌ 清理失敗:', e);
  await prisma.$disconnect();
  process.exit(1);
});
