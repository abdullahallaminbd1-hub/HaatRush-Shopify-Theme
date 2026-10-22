CREATE TABLE IF NOT EXISTS checkout_submissions (
  submission_id UUID PRIMARY KEY,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'created', 'failed')),
  order_id TEXT,
  order_name TEXT,
  response JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
