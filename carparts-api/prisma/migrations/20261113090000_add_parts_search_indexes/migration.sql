-- 熱門零件排序與關鍵字搜尋的索引
--
-- 1) 熱門排序（sales_count DESC, view_count DESC）
--    現況 EXPLAIN：Seq Scan on parts (12,922 列) → top-N heapsort，4.5 ms。
--    資料量目前還小，但每個首頁請求都全表掃一次；10 萬筆以上會明顯惡化。
--    這是一條 partial index：只索引 is_active 的列（查詢一律帶此條件）。
--
-- 2) 關鍵字搜尋（name ILIKE '%q%'）
--    現況：Seq Scan，前導萬用字元讓 btree 無效。
--    pg_trgm GIN 索引可加速 contains/ILIKE，需先 CREATE EXTENSION。
--
-- 注意：這兩個索引都會增加寫入成本（parts 約 1.3 萬列，可接受）。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS parts_active_hot_idx
  ON parts (sales_count DESC NULLS LAST, view_count DESC NULLS LAST)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS parts_name_trgm_idx
  ON parts USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS parts_brand_trgm_idx
  ON parts USING gin (brand gin_trgm_ops);