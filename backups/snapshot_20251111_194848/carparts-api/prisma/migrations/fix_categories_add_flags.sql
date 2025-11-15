-- 補齊 categories 缺的欄位／索引／外鍵（皆為存在即略過的安全版）

-- 必要欄位
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id  INT,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_nav     BOOLEAN NOT NULL DEFAULT TRUE;

-- 已有資料若 is_active / is_nav 為 NULL，補預設
UPDATE categories SET is_active = TRUE WHERE is_active IS NULL;
UPDATE categories SET is_nav    = TRUE WHERE is_nav    IS NULL;

-- 索引（避免重複建立）
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_is_active_idx ON categories(is_active);

-- 父子關聯外鍵（存在就不重複建立）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_fkey') THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES categories(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 若 slug 欄位存在，但有 NULL/空白，幫忙補一個 slug
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'slug'
  ) THEN
    UPDATE categories
    SET slug = lower(regexp_replace(coalesce(NULLIF(btrim(slug), ''), name), '[^a-zA-Z0-9]+', '-', 'g'))
    WHERE slug IS NULL OR btrim(slug) = '';
  END IF;
END $$;

-- 若已存在 slug 的唯一索引或約束就略過；否則建立唯一索引並掛唯一約束
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_class t ON i.indrelid = t.oid
    WHERE c.relname = 'categories_slug_key' AND t.relname = 'categories'
  ) THEN
    -- 建立唯一索引（若 slug 欄位不存在，這段不會跑；前面 seed 已經保證你有 slug）
    PERFORM 1;
    BEGIN
      CREATE UNIQUE INDEX categories_slug_key ON categories(slug);
    EXCEPTION WHEN undefined_column THEN
      -- 若你還沒有 slug 欄位，先在 schema.prisma 加上後再跑一次此腳本
      RAISE NOTICE 'Column categories.slug does not exist yet.';
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key') THEN
    -- 使用現有同名索引掛唯一約束（若索引不存在，此步會被上面的保護避免）
    ALTER TABLE categories
      ADD CONSTRAINT categories_slug_key UNIQUE USING INDEX categories_slug_key;
  END IF;
END $$;
