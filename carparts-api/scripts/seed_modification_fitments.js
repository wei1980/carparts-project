// scripts/seed_modification_fitments.js
// 改裝零件相容性種子資料（使用現有資料庫中的零件）
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始匯入改裝零件相容性資料...');

  // 1. 找出現有的零件
  // EBC 來令片 (煞車)
  const ebcRp1 = await prisma.part.findFirst({ where: { sku: 'EBC-CP-RP1-DP8063RP1', is_active: true } });
  const ebcRpx = await prisma.part.findFirst({ where: { sku: 'EBC-CP-RPX-DP8063RPX', is_active: true } });
  const ebcSr11 = await prisma.part.findFirst({ where: { sku: 'EBC-CP-SR11-DP801616SR11', is_active: true } });
  const ebcSr21 = await prisma.part.findFirst({ where: { sku: 'EBC-CP-SR21-DP801616SR21', is_active: true } });

  // BMC 濾芯 (進氣)
  const bmcFb939 = await prisma.part.findFirst({ where: { sku: 'FB939/20', is_active: true } });
  const bmcFb940 = await prisma.part.findFirst({ where: { sku: 'FB94001', is_active: true } });
  const bmcFb941 = await prisma.part.findFirst({ where: { sku: 'FB94120', is_active: true } });
  const bmcFb757 = await prisma.part.findFirst({ where: { sku: 'FB75701', is_active: true } });
  const bmcFb878 = await prisma.part.findFirst({ where: { sku: 'FB87820', is_active: true } });
  const bmcFb396 = await prisma.part.findFirst({ where: { sku: 'FB39608', is_active: true } });
  const bmcFb444 = await prisma.part.findFirst({ where: { sku: 'FB44401', is_active: true } });
  const bmcFb409 = await prisma.part.findFirst({ where: { sku: 'FB40901', is_active: true } });
  const bmcFb279 = await prisma.part.findFirst({ where: { sku: 'FB27901', is_active: true } });
  const bmcFb454 = await prisma.part.findFirst({ where: { sku: 'FB45420', is_active: true } });
  const bmcFb533 = await prisma.part.findFirst({ where: { sku: 'FB5330801', is_active: true } });
  const bmcFb960 = await prisma.part.findFirst({ where: { sku: 'FB960/04', is_active: true } });

  // Pipercross 濾芯
  const piperPp2050 = await prisma.part.findFirst({ where: { sku: 'PP2050', is_active: true } });
  const piperPp2000 = await prisma.part.findFirst({ where: { sku: 'PP2000', is_active: true } });
  const piperPx1819 = await prisma.part.findFirst({ where: { sku: 'PX1819', is_active: true } });
  const piperPp1926 = await prisma.part.findFirst({ where: { sku: 'PP1926', is_active: true } });
  const piperPp1922 = await prisma.part.findFirst({ where: { sku: 'PP1922', is_active: true } });
  const piperPx1818 = await prisma.part.findFirst({ where: { sku: 'PX1818', is_active: true } });
  const piperPp1621 = await prisma.part.findFirst({ where: { sku: 'PP1621', is_active: true } });
  const piperPp1624 = await prisma.part.findFirst({ where: { sku: 'PP1624', is_active: true } });
  const piperPp2001 = await prisma.part.findFirst({ where: { sku: 'PP2001', is_active: true } });
  const piperPx1806 = await prisma.part.findFirst({ where: { sku: 'PX1806', is_active: true } });
  const piperPp1895 = await prisma.part.findFirst({ where: { sku: 'PP1895', is_active: true } });
  const piperPp1598 = await prisma.part.findFirst({ where: { sku: 'PP1598', is_active: true } });
  const piperPp1782 = await prisma.part.findFirst({ where: { sku: 'PP1782', is_active: true } });
  const piperPp1962 = await prisma.part.findFirst({ where: { sku: 'PP1962', is_active: true } });

  // 2. 建立相容性對應
  let created = 0;

  // === 假設改裝卡鉗 (用 EBC 來令片當作目標) ===
  // 這裡我們創建一些虛擬的「改裝卡鉗」零件作為 modPart
  // 實際上這些應該是 Brembo/AP Racing/Alcon 的卡鉗產品
  // 為了演示，我們用現有的 EBC 來令片當作目標零件
  
  // 建立一個虛擬的「通用 6 活塞卡鉗」作為 modPart（如果不存在）
  // 這裡用第一個 EBC 來令片當作示例目標
  const targetPads = [ebcRp1, ebcRpx, ebcSr11, ebcSr21].filter(Boolean);
  const targetFilters = [bmcFb939, bmcFb940, bmcFb941, bmcFb757, bmcFb878, bmcFb396, bmcFb444, bmcFb409, bmcFb279, bmcFb454, bmcFb533, bmcFb960,
    piperPp2050, piperPp2000, piperPx1819, piperPp1926, piperPp1922, piperPx1818, piperPp1621, piperPp1624, piperPp2001, piperPx1806, piperPp1895, piperPp1598, piperPp1782, piperPp1962].filter(Boolean);

  console.log('找到來令片目標:', targetPads.length);
  console.log('找到濾芯目標:', targetFilters.length);

  // 因為沒有實際的卡鉗/輪圈/進氣套件產品，我們先建立一些測試用的 PartModificationFitment
  // 使用現有的零件 ID 來演示關聯邏輯

  // 為了讓前端能測試，我們創建一些「假的」modPart 記錄
  // 實際部署時應該有真實的 Brembo/AP Racing/RAYS/BBS/K&N/AFE 等產品

  // 創建測試用的改裝零件（如果不存在）
  const testModParts = [
    { name: 'Brembo GT6 6P 380mm', brand: 'Brembo', category: '煞車系統', is_active: true },
    { name: 'AP Racing CP9660 6P 380mm', brand: 'AP Racing', category: '煞車系統', is_active: true },
    { name: 'RAYS TE37 19x9.5J ET35', brand: 'RAYS', category: '輪圈', is_active: true },
    { name: 'K&N 69-Series 76mm', brand: 'K&N', category: '進氣系統', is_active: true },
  ];

  for (const mp of testModParts) {
    const existing = await prisma.part.findFirst({ where: { name: mp.name, brand: mp.brand } });
    if (!existing) {
      const created = await prisma.part.create({
        data: {
          sku: 'MOD-' + mp.name.replace(/\s+/g, '-').toUpperCase(),
          name: mp.name,
          brand: mp.brand,
          category: mp.category,
          is_active: true,
          is_universal: false,
          msrp_price: 0,
          wholesale_price: 0,
          stock_qty: 0
        }
      });
      console.log('✅ 建立測試改裝零件:', created.name);
    } else {
      console.log('✓ 已存在:', existing.name);
    }
  }

  // 重新查詢
  const bremboGt6 = await prisma.part.findFirst({ where: { name: { contains: 'Brembo GT6', mode: 'insensitive' } } });
  const apCp9660 = await prisma.part.findFirst({ where: { name: { contains: 'AP Racing CP9660', mode: 'insensitive' } } });
  const raysTe37 = await prisma.part.findFirst({ where: { name: { contains: 'RAYS TE37', mode: 'insensitive' } } });
  const kn69 = await prisma.part.findFirst({ where: { name: { contains: 'K&N 69', mode: 'insensitive' } } });

  // 3. 建立 PartModificationFitment
  const fitments = [
    // === 卡鉗 → 來令片 ===
    { modPart: bremboGt6, targetParts: targetPads.slice(0, 2), type: 'caliper', rule: { pistonCount: 6, rotorDiameter: 380 }, notes: 'Brembo GT6 6活塞適用 EBC RP/RPX 系列' },
    { modPart: bremboGt6, targetParts: targetPads.slice(2, 4), type: 'caliper', rule: { pistonCount: 6, rotorDiameter: 380 }, notes: 'Brembo GT6 6活塞適用 EBC SR 系列' },
    { modPart: apCp9660, targetParts: targetPads.slice(0, 4), type: 'caliper', rule: { pistonCount: 6, rotorDiameter: 380 }, notes: 'AP Racing CP9660 6活塞通用來令片' },

    // === 輪圈 → 輪胎 (暫無輪胎產品，跳過) ===
    // { modPart: raysTe37, targetParts: [...], type: 'wheel', rule: { diameter: 19, width: 9.5, pcd: '5x114.3', et: 35 }, notes: 'RAYS TE37 19吋適用輪胎' },

    // === 進氣套件 → 濾芯 ===
    { modPart: kn69, targetParts: targetFilters.filter(f => f.brand === 'BMC').slice(0, 3), type: 'intake_kit', rule: { pipeDiameter: 76, filterType: 'cone' }, notes: 'K&N 69-Series 76mm 管徑適用 BMC 圓錐濾芯' },
    { modPart: kn69, targetParts: targetFilters.filter(f => f.brand === 'Pipercross').slice(0, 3), type: 'intake_kit', rule: { pipeDiameter: 76, filterType: 'cone' }, notes: 'K&N 69-Series 76mm 管徑適用 Pipercross 圓錐濾芯' },
  ];

  for (const f of fitments) {
    if (!f.modPart) {
      console.log('⚠️ 跳過: 改裝零件不存在');
      continue;
    }
    for (const targetPart of f.targetParts) {
      if (!targetPart) continue;
      
      try {
        await prisma.partModificationFitment.upsert({
          where: {
            modificationType_modPartId_targetPartId: {
              modificationType: f.type,
              modPartId: f.modPart.id,
              targetPartId: targetPart.id
            }
          },
          update: {
            fitmentRule: f.rule,
            notes: f.notes
          },
          create: {
            modificationType: f.type,
            modPartId: f.modPart.id,
            targetPartId: targetPart.id,
            fitmentRule: f.rule,
            notes: f.notes
          }
        });
        created++;
        console.log('✅ ' + f.modPart.name + ' -> ' + targetPart.brand + ' ' + targetPart.name);
      } catch (err) {
        console.error('❌ 建立失敗: ' + err.message);
      }
    }
  }

  console.log('\n🎉 完成！共建立/更新 ' + created + ' 筆改裝相容性資料');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());