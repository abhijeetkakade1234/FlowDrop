CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  host_token_hash TEXT NOT NULL,
  peer_token_hash TEXT,
  host_device_id TEXT NOT NULL,
  peer_device_id TEXT,
  created_at INTEGER NOT NULL,
  otp_expires_at INTEGER NOT NULL,
  session_expires_at INTEGER NOT NULL,
  join_attempts INTEGER NOT NULL DEFAULT 0,
  connected INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_otp_hash ON sessions (otp_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_session_expires_at ON sessions (session_expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_host_token_hash ON sessions (host_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_peer_token_hash ON sessions (peer_token_hash);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender_device_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id_created_at ON messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages (expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  scope TEXT NOT NULL,
  client_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (scope, client_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits (expires_at);
