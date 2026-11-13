-- 里程數管理欄位（relationMode=prisma，純中繼資料遷移）
-- 實際資料表名為 "VehicleProfile"（Prisma 建立時未套用 @@map）
ALTER TABLE "VehicleProfile" ADD COLUMN "current_mileage" INTEGER;
ALTER TABLE "VehicleProfile" ADD COLUMN "mileage_updated_at" TIMESTAMP(3);
ALTER TABLE "VehicleProfile" ADD COLUMN "mileage_source" TEXT;
ALTER TABLE "VehicleProfile" ADD COLUMN "mileage_source_note" TEXT;
