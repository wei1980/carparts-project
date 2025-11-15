
-- 檢查每個品牌的車系、世代、車型數量
SELECT m.name AS make,
       COUNT(DISTINCT mo.id) AS models,
       COUNT(DISTINCT g.id) AS generations,
       COUNT(v.id) AS variants
FROM makes m
LEFT JOIN models mo ON mo.make_id = m.id
LEFT JOIN generations g ON g.model_id = mo.id
LEFT JOIN vehicle_variants v ON v.generation_id = g.id
GROUP BY m.name
ORDER BY m.name;

-- 顯示隨機 20 筆車型資料做驗證
SELECT m.name AS make,
       mo.name AS model,
       g.name AS generation,
       v.variant_name,
       v.year_from,
       v.year_to,
       v.engine_code,
       v.displacement_cc,
       v.power_ps,
       v.fuel_type
FROM makes m
JOIN models mo ON mo.make_id = m.id
JOIN generations g ON g.model_id = mo.id
JOIN vehicle_variants v ON v.generation_id = g.id
ORDER BY random()
LIMIT 20;

-- 抽樣檢查 fuel_type 是否正常顯示中文
SELECT DISTINCT fuel_type, COUNT(*) 
FROM vehicle_variants
GROUP BY fuel_type
ORDER BY COUNT(*) DESC;