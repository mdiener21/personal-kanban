-- 000002_email_auth.up.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Make provider and provider_id nullable since email auth users won't have them initially
ALTER TABLE users ALTER COLUMN provider DROP NOT NULL;
ALTER TABLE users ALTER COLUMN provider_id DROP NOT NULL;

-- Drop the unique constraint on (provider, provider_id) and add a more flexible one
-- or just rely on the email unique constraint which already exists.
-- Actually, the existing unique(provider, provider_id) might fail if both are null.
-- In Postgres, multiple rows with NULL in a unique constraint column are allowed.
