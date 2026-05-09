-- Auth: user active/staff flags + JWT revocation list (logout)
-- Apply on existing DBs after 0001_baseline / init without these columns.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS revoked_access_tokens (
  jti         TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_exp ON revoked_access_tokens (expires_at);
