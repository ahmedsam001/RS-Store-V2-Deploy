-- Authentication V1 compatibility and secure session upgrade.

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'ar';

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS csrf_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS remember_me BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ(3);

UPDATE sessions
SET csrf_token_hash = token_hash
WHERE csrf_token_hash IS NULL;

ALTER TABLE sessions
  ALTER COLUMN csrf_token_hash SET NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT chk_users_language_supported CHECK (language IN ('ar', 'en'));
