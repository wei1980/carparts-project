-- prisma/migrations/parts_add_prices_description.sql

-- 核心欄位（若不存在就補上）
ALTER TABLE parts ADD COLUMN IF NOT EXISTS msrp_twd        INTEGER;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS wholesale_twd   INTEGER;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS image_url       TEXT;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS brand           TEXT;

-- 也順手確保 SKU 唯一（若你已經有就會略過）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'parts_sku_key'
  ) THEN
    CREATE UNIQUE INDEX parts_sku_key ON parts(sku);
  END IF;
END $$;
