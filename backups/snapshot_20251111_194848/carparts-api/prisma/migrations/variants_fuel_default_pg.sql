-- 讓 vehicle_variants.fuel_type 有預設值，並把既有 NULL 補上
-- （維持 NOT NULL 也沒關係，因為之後 INSERT 不帶欄位會吃到 DEFAULT）

-- 1) 設定預設值
ALTER TABLE vehicle_variants
  ALTER COLUMN fuel_type SET DEFAULT 'gasoline';

-- 2) 把既有資料的 NULL 一次補上
UPDATE vehicle_variants
SET fuel_type = 'gasoline'
WHERE fuel_type IS NULL;

-- （選擇性）如果你之前把 NOT NULL 拿掉想再加回去，可以在確認都已補上後再執行：
-- ALTER TABLE vehicle_variants
--   ALTER COLUMN fuel_type SET NOT NULL;
