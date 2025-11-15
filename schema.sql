-- =========================
-- ENUM 定義
-- =========================
CREATE TYPE user_role AS ENUM ('garage', 'wholesaler', 'member', 'retail');
CREATE TYPE scope_type AS ENUM ('part', 'brand', 'category', 'global');
CREATE TYPE rule_type AS ENUM ('discount_pct', 'add_pct', 'fixed_price', 'fixed_markup');

-- =========================
-- 使用者
-- =========================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role user_role NOT NULL DEFAULT 'garage',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- 車廠 (Garage)
-- =========================
CREATE TABLE garages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    tax_id VARCHAR(20) UNIQUE,
    line_id VARCHAR(50),
    phone VARCHAR(20) UNIQUE,
    contact_person VARCHAR(100),
    address TEXT NOT NULL,
    map_url TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    business_hours JSONB,
    specialized_brands INTEGER[],
    feature_tags TEXT[],
    payment_methods TEXT[],
    technician_count INTEGER,
    parking_slots INTEGER,
    has_towing_service BOOLEAN DEFAULT FALSE,
    license_photo_url TEXT,
    environment_photos TEXT[],
    revenue_share NUMERIC(5,2),
    bank_account JSONB,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- 車輛相關資料
-- =========================
CREATE TABLE makes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    make_id INTEGER NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    external_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(make_id, name)
);

CREATE TABLE generations (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    name VARCHAR(50),
    year_from INT,
    year_to INT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE vehicle_variants (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    generation_id INTEGER REFERENCES generations(id),
    variant_name VARCHAR(100),
    year_from INT NOT NULL,
    year_to INT NOT NULL,
    engine_code VARCHAR(50),
    displacement_cc INT,
    power_ps INT,
    intake_type VARCHAR(50),
    drive_type VARCHAR(20),
    front_suspension VARCHAR(100),
    rear_suspension VARCHAR(100),
    fuel_type VARCHAR(50) NOT NULL,
    special_tech TEXT,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(model_id, engine_code, year_from, year_to, variant_name)
);

-- =========================
-- 零件
-- =========================
CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    price_twd NUMERIC(12,2) NOT NULL CHECK (price_twd > 0),  -- 建議售價
    cost_twd NUMERIC(12,2) CHECK (cost_twd >= 0),            -- 成本
    currency VARCHAR(3) DEFAULT 'TWD',
    weight_kg NUMERIC(8,3),
    vat_included BOOLEAN DEFAULT TRUE,
    stock_qty INTEGER DEFAULT 0 CHECK (stock_qty >= 0),
    description TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 零件相容性 (多對多)
CREATE TABLE part_compatibilities (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    vehicle_variant_id INTEGER NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    note JSONB,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(part_id, vehicle_variant_id)
);

-- =========================
-- 訂單
-- =========================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    garage_id INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_twd NUMERIC(12,2) NOT NULL,  -- 下單時的單價
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- 價格規則
-- =========================
CREATE TABLE price_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role user_role,
    scope_type scope_type NOT NULL,
    scope_value VARCHAR(100),
    rule_type rule_type NOT NULL,
    value NUMERIC(10,4) NOT NULL,
    priority INT DEFAULT 10,
    active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- Garage 查詢限制 (API額度控管)
-- =========================
CREATE TABLE garage_query_logs (
    id SERIAL PRIMARY KEY,
    garage_id INTEGER NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    query_type VARCHAR(50) NOT NULL,
    query_count INTEGER DEFAULT 0,
    query_limit INTEGER DEFAULT 100,
    reset_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(garage_id, query_type, reset_date)
);

-- =========================
-- Triggers / Indexes
-- =========================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parts_timestamp
BEFORE UPDATE ON parts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 索引 (效能優化)
CREATE INDEX idx_vehicle_variants_year ON vehicle_variants(year_from, year_to);
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_brand ON parts(brand);
CREATE INDEX idx_part_compatibilities_part_id ON part_compatibilities(part_id);
CREATE INDEX idx_part_compatibilities_vehicle_variant_id ON part_compatibilities(vehicle_variant_id);
CREATE INDEX idx_price_rules_scope ON price_rules(scope_type, scope_value);
CREATE INDEX idx_price_rules_role ON price_rules(role);
CREATE INDEX idx_users_role ON users(role);