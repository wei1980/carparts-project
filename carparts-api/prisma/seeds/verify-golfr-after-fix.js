// 修復後驗證：Golf R Mk8 各年前/後輪來令片唯一化（台規 DP42448 / DP42438）
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const variants = await prisma.vehicleVariant.findMany({
    where: { make: 'Volkswagen', model: { contains: 'Golf R' }, year_start: { lte: 2024 }, year_end: { gte: 2021 } },
    select: { id: true, model: true, generation: true, year_start: true },
    orderBy: { id: 'asc' },
  });
  let allOk = true;
  for (const v of variants) {
    const parts = await prisma.partCompatibility.findMany({
      where: { vehicle_id: v.id, part: { sku: { startsWith: 'EBC-' } } },
      include: { part: { select: { sku: true, name: true, is_active: true, description: true } } },
    });
    const fronts = parts.filter(p => /-F$/.test(p.part.sku)).map(p => p.part.sku).sort();
    const rears = parts.filter(p => /-R$/.test(p.part.sku)).map(p => p.part.sku).sort();
    const frontCodes = [...new Set(fronts.map(s => s.replace(/^EBC-(GRN|RED|YLW|BLU)-/, '').replace(/-F$/, '')))];
    const rearCodes = [...new Set(rears.map(s => s.replace(/^EBC-(GRN|RED|YLW|BLU)-/, '').replace(/-R$/, '')))];
    const frontProfiles = [...new Set(frontCodes.map(c => c.replace(/^DP\d(\d{4}).*$/, 'DP$1')))];
    const rearProfiles = [...new Set(rearCodes.map(c => c.replace(/^DP\d(\d{4}).*$/, 'DP$1')))];
    // 台規判定：型狀碼唯一（前 2448／後 2438），系列（紅黃藍）可多個
    const okF = v.generation.includes('Mk8') ? frontProfiles.every(p => p === 'DP2448') && frontProfiles.length === 1 : true;
    const okR = v.generation.includes('Mk8') ? rearProfiles.every(p => p === 'DP2438') && rearProfiles.length === 1 : true;
    const status = okF && okR ? 'OK ' : '⚠️ ';
    if (!(okF && okR)) allOk = false;
    console.log(`${status}variant ${v.id} ${v.model} ${v.generation} (${v.year_start}):`);
    console.log(`     前輪料號: ${frontCodes.join(', ')}`);
    console.log(`     後輪料號: ${rearCodes.join(', ')}`);
    console.log(`     前輪 SKU (${fronts.length}): ${fronts.join(', ')}`);
    console.log(`     後輪 SKU (${rears.length}): ${rears.join(', ')}`);
  }
  console.log(allOk ? '\n=== 全部驗證通過 ===' : '\n=== 有異常，需檢查 ===');
  await prisma.$disconnect();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
