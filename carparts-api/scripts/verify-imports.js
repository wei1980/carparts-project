const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyImports() {
  console.log('🔍 驗證匯入結果...\n');
  
  // 1. VehicleVariant 統計
  const vehicleCount = await prisma.vehicleVariant.count();
  console.log(`✅ VehicleVariant 總筆數: ${vehicleCount}`);
  
  const driveTypeStats = await prisma.vehicleVariant.groupBy({
    by: ['drive_type'],
    _count: true
  });
  console.log('Drive Type 分佈:');
  driveTypeStats.forEach(d => console.log(`  ${d.drive_type || 'NULL'}: ${d._count}`));
  
  // 2. Part 統計
  const partCount = await prisma.part.count();
  console.log(`\n✅ Part 總筆數: ${partCount}`);
  
  // 3. PartCompatibility 統計
  const compatCount = await prisma.partCompatibility.count();
  console.log(`✅ PartCompatibility 總筆數: ${compatCount}`);
  
  // 4. 有相容車型的零件數
  const partsWithCompat = await prisma.part.count({
    where: { compatible_vehicles: { some: {} } }
  });
  console.log(`✅ 有相容車型的零件: ${partsWithCompat} / ${partCount} (${((partsWithCompat/partCount)*100).toFixed(1)}%)`);
  
  // 5. 各品牌零件相容性統計
  const brandStats = await prisma.part.groupBy({
    by: ['brand'],
    where: { compatible_vehicles: { some: {} } },
    _count: true
  });
  console.log('\n📊 各品牌有相容車型的零件數:');
  brandStats.forEach(b => console.log(`  ${b.brand || 'N/A'}: ${b._count}`));
  
  // 6. 檢查特定零件
  const sampleParts = await prisma.part.findMany({
    where: { compatible_vehicles: { some: {} } },
    include: { 
      compatible_vehicles: { 
        take: 3, 
        include: { vehicle: { select: { make: true, model: true, generation: true, variant_name: true, drive_type: true } } } 
      } 
    },
    take: 5
  });
  console.log('\n📋 樣本零件相容車型:');
  sampleParts.forEach(p => {
    console.log(`  ${p.sku} | ${p.name} (${p.brand}) - ${p.compatible_vehicles.length} 車型`);
    p.compatible_vehicles.forEach(cv => {
      console.log(`    - ${cv.vehicle.make} ${cv.vehicle.model} ${cv.vehicle.generation} [${cv.vehicle.drive_type}] ${cv.vehicle.variant_name}`);
    });
  });
  
  // 7. 檢查 KW 避震器
  const kwParts = await prisma.part.findMany({
    where: { sku: { startsWith: '1021' } },
    select: { sku: true, name: true, _count: { select: { compatible_vehicles: true } } }
  });
  console.log('\n🔧 KW 避震器相容性:');
  kwParts.forEach(p => console.log(`  ${p.sku} | ${p.name} - ${p._count.compatible_vehicles} 車型`));
  
  // 8. 檢查 JXB
  const jxbParts = await prisma.part.findMany({
    where: { sku: { startsWith: 'TYT' } },
    select: { sku: true, name: true, _count: { select: { compatible_vehicles: true } } }
  });
  console.log('\n🔧 JXB 傳動軸相容性:');
  jxbParts.forEach(p => console.log(`  ${p.sku} | ${p.name} - ${p._count.compatible_vehicles} 車型`));
  
  // 9. 檢查空濾
  const airFilterParts = await prisma.part.findMany({
    where: { subcategory: { name: '濾芯' } },
    select: { sku: true, name: true, brand: true, _count: { select: { compatible_vehicles: true } } }
  });
  console.log('\n💨 空濾 (濾芯) 相容性:');
  airFilterParts.forEach(p => console.log(`  ${p.sku} | ${p.name} (${p.brand}) - ${p._count.compatible_vehicles} 車型`));
  
  await prisma.$disconnect();
  console.log('\n✅ 驗證完成');
}

verifyImports().catch(console.error);