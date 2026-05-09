-- Replace is_staff (boolean) with role enum: user | staff | admin
-- Run after 0002 on DBs that still have is_staff.

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
