CREATE TABLE IF NOT EXISTS shopify_oauth_states (
  state_hash TEXT PRIMARY KEY,
  shop_domain TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS shopify_oauth_states_expiry
  ON shopify_oauth_states (expires_at);

CREATE TABLE IF NOT EXISTS shopify_installations (
  shop_domain TEXT PRIMARY KEY,
  encrypted_token TEXT NOT NULL,
  scopes TEXT NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
