CREATE TABLE IF NOT EXISTS checkout_submissions (
  submission_id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'created', 'failed')),
  order_id TEXT,
  order_name TEXT,
  response_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
