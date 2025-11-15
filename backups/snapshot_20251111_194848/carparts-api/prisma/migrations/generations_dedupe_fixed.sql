DO $$
BEGIN
  RAISE NOTICE 'Start dedup generations...';

  -- 暫時建立對應資料
  CREATE TEMP TABLE _mappings AS
  WITH norm AS (
    SELECT
      g.id,
      g.model_id,
      LOWER(regexp_replace(g.name, '[^a-z0-9一-龥]+', '', 'g')) AS norm_name
    FROM generations g
  ),
  dups AS (
    SELECT model_id, norm_name, MIN(id) AS keep_id, ARRAY_AGG(id ORDER BY id) AS ids
    FROM norm
    GROUP BY model_id, norm_name
    HAVING COUNT(*) > 1
  )
  SELECT model_id, norm_name, keep_id, UNNEST(ids) AS dup_id
  FROM dups
  WHERE keep_id IS NOT NULL;

  -- 把重複的變體指到保留的 keep_id
  UPDATE vehicle_variants v
  SET generation_id = m.keep_id
  FROM _mappings m
  WHERE v.generation_id = m.dup_id
    AND m.dup_id <> m.keep_id;

  -- 刪除重複 generations
  DELETE FROM generations g
  USING _mappings m
  WHERE g.id = m.dup_id
    AND m.dup_id <> m.keep_id;

  DROP TABLE IF EXISTS _mappings;

  RAISE NOTICE 'Dedup generations done.';
END $$;
