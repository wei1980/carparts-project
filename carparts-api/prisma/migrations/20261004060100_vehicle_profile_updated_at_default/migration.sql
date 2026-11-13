-- VehicleProfile.updatedAt 補預設值（原本無預設，create 必填）
ALTER TABLE "VehicleProfile" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
