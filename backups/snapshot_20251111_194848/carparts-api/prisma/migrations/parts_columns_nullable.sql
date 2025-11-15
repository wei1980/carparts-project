DO $$
BEGIN
  -- 新增欄位（若不存在）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='msrp_twd') THEN
    ALTER TABLE parts ADD COLUMN msrp_twd INTEGER NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='wholesale_twd') THEN
    ALTER TABLE parts ADD COLUMN wholesale_twd INTEGER NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='image_url') THEN
    ALTER TABLE parts ADD COLUMN image_url TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='description') THEN
    ALTER TABLE parts ADD COLUMN description TEXT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='availability_mode') THEN
    ALTER TABLE parts ADD COLUMN availability_mode TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='stock_qty') THEN
    ALTER TABLE parts ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='lead_time_days') THEN
    ALTER TABLE parts ADD COLUMN lead_time_days INTEGER NULL;
  END IF;

  -- 放寬為可 NULL（若原本 NOT NULL）
  BEGIN
    ALTER TABLE parts ALTER COLUMN msrp_twd DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
  BEGIN
    ALTER TABLE parts ALTER COLUMN wholesale_twd DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
  BEGIN
    ALTER TABLE parts ALTER COLUMN image_url DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
  BEGIN
    ALTER TABLE parts ALTER COLUMN description DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
  BEGIN
    ALTER TABLE parts ALTER COLUMN availability_mode DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
  BEGIN
    ALTER TABLE parts ALTER COLUMN lead_time_days DROP NOT NULL;
  EXCEPTION WHEN others THEN END;
END $$;
