CREATE TABLE IF NOT EXISTS demo_sessions (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (json_valid(state)),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_sessions_expiry ON demo_sessions(expires_at);
