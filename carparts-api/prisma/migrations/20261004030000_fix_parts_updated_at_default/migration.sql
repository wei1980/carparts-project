-- 修復：parts.updated_at 為 NOT NULL 但無預設值，導致後台新增商品失敗
ALTER TABLE "parts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
