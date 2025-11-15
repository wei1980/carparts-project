-- availability_mode / stock_qty / lead_time_days 可能尚未存在時補上
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='parts' AND column_name='availability_mode') THEN
    ALTER TABLE parts ADD COLUMN availability_mode TEXT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='parts' AND column_name='stock_qty') THEN
    ALTER TABLE parts ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='parts' AND column_name='lead_time_days') THEN
    ALTER TABLE parts ADD COLUMN lead_time_days INTEGER NULL;
  END IF;
END $$;
