-- 確保 categories.slug 有唯一索引，若無則建立
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_class t ON i.indrelid = t.oid
    WHERE c.relname = 'categories_slug_key'
      AND t.relname = 'categories'
  ) THEN
    CREATE UNIQUE INDEX categories_slug_key ON categories(slug);
  END IF;
END $$;

-- 若不存在同名唯一約束，拿現有索引來建立 UNIQUE CONSTRAINT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_slug_key UNIQUE USING INDEX categories_slug_key;
  END IF;
END $$;
