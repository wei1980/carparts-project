-- 建議：確保欄位存在、且可為 NULL（除了 stock_qty 預設 0）
ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS msrp_twd INTEGER,
  ADD COLUMN IF NOT EXISTS wholesale_twd INTEGER,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS stock_qty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_mode TEXT,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

-- 放寬：允許 availability_mode / lead_time_days 為 NULL
ALTER TABLE parts
  ALTER COLUMN availability_mode DROP NOT NULL,
  ALTER COLUMN lead_time_days DROP NOT NULL;

-- 建議：stock_qty 預設 0（若先前是 NULL）
UPDATE parts SET stock_qty = 0 WHERE stock_qty IS NULL;
ALTER TABLE parts
  ALTER COLUMN stock_qty SET DEFAULT 0;
