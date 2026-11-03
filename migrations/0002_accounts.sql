CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  recovery_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE account_states (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (json_valid(state))
);
CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE auth_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX auth_limits_expiry ON auth_limits(expires_at);
