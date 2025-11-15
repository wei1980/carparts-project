-- parts_availability.sql  (PostgreSQL)
-- 新增欄位（若不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='parts' AND column_name='stock_qty'
  ) THEN
    ALTER TABLE parts ADD COLUMN stock_qty INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='parts' AND column_name='availability_mode'
  ) THEN
    ALTER TABLE parts ADD COLUMN availability_mode TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='parts' AND column_name='lead_time_days'
  ) THEN
    ALTER TABLE parts ADD COLUMN lead_time_days INTEGER NULL;
  END IF;
END$$;

-- 可選：建立簡單檢查（只允許三種模式或 NULL）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='parts_availability_mode_check'
  ) THEN
    ALTER TABLE parts
    ADD CONSTRAINT parts_availability_mode_check
    CHECK (availability_mode IN ('stock','lead','mto') OR availability_mode IS NULL);
  END IF;
END$$;
