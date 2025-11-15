-- prisma/migrations/parts_supply_columns.sql
-- 讓 parts 擁有完整的商品欄位；不存在才新增，不會破壞既有資料
ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS category TEXT NULL,
  ADD COLUMN IF NOT EXISTS msrp_twd INTEGER NULL,
  ADD COLUMN IF NOT EXISTS wholesale_twd INTEGER NULL,
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS stock_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_mode TEXT NULL,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER NULL;
