-- One-shot: bring legacy `users` + auth tables in line with current backend models.
-- Safe to re-run on DBs that already applied 0002/0003 (uses IF NOT EXISTS / guarded updates).

-- --- from 0002_auth_user_status_revocations.sql ---
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_staff BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS revoked_access_tokens (
  jti         TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_exp ON revoked_access_tokens (expires_at);

-- --- from 0003_user_role_enum.sql ---
DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'staff', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_staff'
  ) THEN
    EXECUTE $u$
      UPDATE users SET role = CASE WHEN is_staff THEN 'admin'::user_role ELSE 'user'::user_role END
      WHERE role IS NULL
    $u$;
  ELSE
    UPDATE users SET role = COALESCE(role, 'user'::user_role) WHERE role IS NULL;
  END IF;
END $$;

UPDATE users SET role = 'user'::user_role WHERE role IS NULL;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

ALTER TABLE users DROP COLUMN IF EXISTS is_staff;
