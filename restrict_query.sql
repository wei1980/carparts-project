CREATE OR REPLACE FUNCTION restrict_garage_query(
     p_garage_id INTEGER,
     p_query_type VARCHAR,
     p_query_count INTEGER
   ) RETURNS BOOLEAN AS $$
   DECLARE
     v_query_count INTEGER;
     v_query_limit INTEGER;
     v_reset_date DATE;
   BEGIN
     SELECT query_count, query_limit, reset_date
     INTO v_query_count, v_query_limit, v_reset_date
     FROM garage_query_logs
     WHERE garage_id = p_garage_id
       AND query_type = p_query_type
       AND reset_date = date_trunc('month', CURRENT_DATE);

     IF NOT FOUND THEN
       INSERT INTO garage_query_logs (garage_id, query_type, query_count, query_limit, reset_date)
       VALUES (p_garage_id, p_query_type, p_query_count, 100, date_trunc('month', CURRENT_DATE))
       RETURNING query_count, query_limit INTO v_query_count, v_query_limit;
     ELSIF v_query_count + p_query_count <= v_query_limit THEN
       UPDATE garage_query_logs
       SET query_count = query_count + p_query_count
       WHERE garage_id = p_garage_id
         AND query_type = p_query_type
         AND reset_date = v_reset_date;
     ELSE
       RETURN FALSE;
     END IF;
     RETURN TRUE;
   END;
   $$ LANGUAGE plpgsql;