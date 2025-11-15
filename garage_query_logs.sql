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