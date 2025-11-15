-- 需要用到 gist 排序比較（for exclusion constraint）
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1) 同一個 model_id + 標準化名稱 不可重複
--    先建立一個產生欄位（若你已有可略過），或用 index on expression
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename='generations' AND indexname='gen_unique_model_normname'
  ) THEN
    CREATE UNIQUE INDEX gen_unique_model_normname
    ON generations (model_id, LOWER(regexp_replace(name, '[^a-z0-9一-龥]+', '', 'g')));
  END IF;
END $$;

-- 2) 同一個 model_id 的世代年份區間不可互相重疊（[year_from, year_to] 與任何既有重疊）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gen_model_year_no_overlap'
  ) THEN
    ALTER TABLE generations
    ADD CONSTRAINT gen_model_year_no_overlap
    EXCLUDE USING GIST (
      model_id WITH =,
      int4range(year_from, year_to, '[]') WITH &&
    );
  END IF;
END $$;
