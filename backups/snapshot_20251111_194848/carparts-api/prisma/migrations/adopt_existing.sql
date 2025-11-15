-- Adopt/normalize existing tables to the new schema (PostgreSQL-safe, idempotent)

-- =========================
-- 基本表（若不存在就建）
-- =========================
CREATE TABLE IF NOT EXISTS makes (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
  id          SERIAL PRIMARY KEY,
  make_id     INT,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generations (
  id          SERIAL PRIMARY KEY,
  model_id    INT,
  name        TEXT,
  year_from   INT,
  year_to     INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_variants (
  id            SERIAL PRIMARY KEY,
  model_id      INT,
  generation_id INT,
  name          TEXT,
  engine_code   TEXT,
  year_from     INT,
  year_to       INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parts (
  id             SERIAL PRIMARY KEY,
  sku            TEXT UNIQUE,
  name           TEXT,
  brand          TEXT,
  category       TEXT,
  msrp_twd       INT,
  wholesale_twd  INT,
  description    TEXT,
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  slug        TEXT,
  parent_id   INT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_nav      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS parts_on_categories (
  id           SERIAL PRIMARY KEY,
  part_id      INT,
  category_id  INT,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS part_compatibilities (
  id                   SERIAL PRIMARY KEY,
  part_id              INT,
  vehicle_variant_id   INT
);

-- 簡易訂單（供外鍵/刪除示範；若不用可略過）
CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  order_no    TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id               SERIAL PRIMARY KEY,
  order_id         INT,
  part_id          INT,
  qty              INT NOT NULL DEFAULT 1,
  unit_price_twd   INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- 補欄位（若不存在）
-- =========================
ALTER TABLE models          ADD COLUMN IF NOT EXISTS make_id    INT;
ALTER TABLE models          ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE models          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE models          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE generations     ADD COLUMN IF NOT EXISTS model_id   INT;
ALTER TABLE generations     ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE generations     ADD COLUMN IF NOT EXISTS year_from  INT;
ALTER TABLE generations     ADD COLUMN IF NOT EXISTS year_to    INT;
ALTER TABLE generations     ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE generations     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS model_id      INT;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS generation_id INT;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS name          TEXT;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS engine_code   TEXT;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS year_from     INT;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS year_to       INT;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE parts           ADD COLUMN IF NOT EXISTS sku           TEXT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS name          TEXT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS brand         TEXT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS category      TEXT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS msrp_twd      INT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS wholesale_twd INT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS image_url     TEXT;
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE parts           ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE categories      ADD COLUMN IF NOT EXISTS name        TEXT;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS slug        TEXT;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS parent_id   INT;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS sort_order  INT NOT NULL DEFAULT 0;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS is_nav      BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE parts_on_categories ADD COLUMN IF NOT EXISTS part_id     INT;
ALTER TABLE parts_on_categories ADD COLUMN IF NOT EXISTS category_id INT;
ALTER TABLE parts_on_categories ADD COLUMN IF NOT EXISTS is_primary  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE part_compatibilities ADD COLUMN IF NOT EXISTS part_id            INT;
ALTER TABLE part_compatibilities ADD COLUMN IF NOT EXISTS vehicle_variant_id INT;

ALTER TABLE orders          ADD COLUMN IF NOT EXISTS order_no    TEXT;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS note        TEXT;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE order_items     ADD COLUMN IF NOT EXISTS order_id        INT;
ALTER TABLE order_items     ADD COLUMN IF NOT EXISTS part_id         INT;
ALTER TABLE order_items     ADD COLUMN IF NOT EXISTS qty             INT NOT NULL DEFAULT 1;
ALTER TABLE order_items     ADD COLUMN IF NOT EXISTS unit_price_twd  INT;
ALTER TABLE order_items     ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE order_items     ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- =========================
-- 資料清理/補值
-- =========================
-- parts.category 若為 NULL/空白 → 'Uncategorized'
UPDATE parts
SET category = 'Uncategorized'
WHERE category IS NULL OR btrim(category) = '';

-- vehicle_variants.year_to 若為 NULL → year_from
UPDATE vehicle_variants
SET year_to = year_from
WHERE year_to IS NULL AND year_from IS NOT NULL;

-- categories.slug 由 name 轉換；空或 NULL 的補上
UPDATE categories
SET slug = lower(regexp_replace(coalesce(nullif(btrim(slug), ''), name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR btrim(slug) = '';

-- 將 slug 重複的補上 -id 後綴以消除重複
WITH d AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM categories
)
UPDATE categories c
SET slug = c.slug || '-' || c.id
FROM d
WHERE c.id = d.id AND d.rn > 1;

-- =========================
-- 索引與唯一鍵（不存在才建）
-- =========================
-- makes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'makes_name_key') THEN
    ALTER TABLE makes ADD CONSTRAINT makes_name_key UNIQUE (name);
  END IF;
END $$;

-- models unique(make_id, name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'models_make_id_name_key') THEN
    ALTER TABLE models ADD CONSTRAINT models_make_id_name_key UNIQUE (make_id, name);
  END IF;
END $$;

-- parts unique(sku)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parts_sku_key') THEN
    ALTER TABLE parts ADD CONSTRAINT parts_sku_key UNIQUE (sku);
  END IF;
END $$;

-- categories unique(slug)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key') THEN
    ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
  END IF;
END $$;

-- parts_on_categories unique(part_id, category_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parts_on_categories_part_id_category_id_key') THEN
    ALTER TABLE parts_on_categories ADD CONSTRAINT parts_on_categories_part_id_category_id_key UNIQUE (part_id, category_id);
  END IF;
END $$;

-- part_compatibilities unique(part_id, vehicle_variant_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'part_compatibilities_part_id_vehicle_variant_id_key') THEN
    ALTER TABLE part_compatibilities ADD CONSTRAINT part_compatibilities_part_id_vehicle_variant_id_key UNIQUE (part_id, vehicle_variant_id);
  END IF;
END $$;

-- orders unique(order_no)（允許多 NULL）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_no_key') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_no_key UNIQUE (order_no);
  END IF;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS models_make_id_idx                   ON models(make_id);
CREATE INDEX IF NOT EXISTS generations_model_id_idx             ON generations(model_id);
CREATE INDEX IF NOT EXISTS generations_year_from_year_to_idx    ON generations(year_from, year_to);
CREATE INDEX IF NOT EXISTS vehicle_variants_model_id_idx        ON vehicle_variants(model_id);
CREATE INDEX IF NOT EXISTS vehicle_variants_generation_id_idx   ON vehicle_variants(generation_id);
CREATE INDEX IF NOT EXISTS vehicle_variants_year_from_to_idx    ON vehicle_variants(year_from, year_to);
CREATE INDEX IF NOT EXISTS categories_parent_id_idx             ON categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_is_active_idx             ON categories(is_active);
CREATE INDEX IF NOT EXISTS parts_on_categories_part_id_idx      ON parts_on_categories(part_id);
CREATE INDEX IF NOT EXISTS parts_on_categories_category_id_idx  ON parts_on_categories(category_id);
CREATE INDEX IF NOT EXISTS part_comp_part_id_idx                ON part_compatibilities(part_id);
CREATE INDEX IF NOT EXISTS part_comp_variant_id_idx             ON part_compatibilities(vehicle_variant_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx             ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_part_id_idx              ON order_items(part_id);

-- =========================
-- 外鍵（不存在才建）
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'models_make_id_fkey') THEN
    ALTER TABLE models
      ADD CONSTRAINT models_make_id_fkey
      FOREIGN KEY (make_id) REFERENCES makes(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_model_id_fkey') THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_model_id_fkey
      FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_variants_model_id_fkey') THEN
    ALTER TABLE vehicle_variants
      ADD CONSTRAINT vehicle_variants_model_id_fkey
      FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_variants_generation_id_fkey') THEN
    ALTER TABLE vehicle_variants
      ADD CONSTRAINT vehicle_variants_generation_id_fkey
      FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_fkey') THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parts_on_categories_part_id_fkey') THEN
    ALTER TABLE parts_on_categories
      ADD CONSTRAINT parts_on_categories_part_id_fkey
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parts_on_categories_category_id_fkey') THEN
    ALTER TABLE parts_on_categories
      ADD CONSTRAINT parts_on_categories_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'part_compatibilities_part_id_fkey') THEN
    ALTER TABLE part_compatibilities
      ADD CONSTRAINT part_compatibilities_part_id_fkey
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'part_compatibilities_vehicle_variant_id_fkey') THEN
    ALTER TABLE part_compatibilities
      ADD CONSTRAINT part_compatibilities_vehicle_variant_id_fkey
      FOREIGN KEY (vehicle_variant_id) REFERENCES vehicle_variants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_part_id_fkey') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_part_id_fkey
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- =========================
-- 後設：把 updated_at 改為自動更新（可選）
-- 若你希望 DB 自動更新 updated_at，可建觸發器；否則由 Prisma 更新即可。
-- =========================
-- CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END; $$ LANGUAGE plpgsql;
-- 
-- DO $$
-- DECLARE t TEXT;
-- BEGIN
--   FOR t IN SELECT unnest(ARRAY['makes','models','generations','vehicle_variants','parts','categories','parts_on_categories','part_compatibilities','orders','order_items'])
--   LOOP
--     EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I;', t, t);
--     EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
--   END LOOP;
-- END $$;
