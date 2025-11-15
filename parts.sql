CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,      -- 預留圖片位置
    created_at TIMESTAMP DEFAULT NOW()
);
