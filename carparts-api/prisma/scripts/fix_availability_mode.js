// prisma/scripts/fix_availability_mode.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("修正 availability_mode 舊值 → 新制（stock / preorder）...");

  // 將舊的 LEAD / MTO / lead / mto 全轉為 preorder
  await prisma.$executeRawUnsafe(`
    UPDATE parts SET availability_mode = 'preorder'
    WHERE availability_mode ILIKE 'lead' OR availability_mode ILIKE 'mto';
  `);
  // 將 'STOCK' / 'stock' 正規化
  await prisma.$executeRawUnsafe(`
    UPDATE parts SET availability_mode = 'stock'
    WHERE availability_mode ILIKE 'stock';
  `);

  // 套用規則：stock → lead_time_days = 0；preorder → 預設 21（且非負）
  await prisma.$executeRawUnsafe(`
    UPDATE parts SET lead_time_days = 0 WHERE availability_mode = 'stock';
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE parts SET lead_time_days = 21
    WHERE availability_mode = 'preorder' AND (lead_time_days IS NULL OR lead_time_days <= 0);
  `);

  // 確保 stock_qty 非負
  await prisma.$executeRawUnsafe(`UPDATE parts SET stock_qty = GREATEST(COALESCE(stock_qty,0), 0);`);

  console.log("✅ 修正完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
