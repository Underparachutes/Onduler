-- Admin role: per-user boolean on user_settings.
--
-- Adds:
--   user_settings.is_admin boolean NOT NULL DEFAULT false
--
-- Idempotent. Run once in the Supabase SQL Editor.

BEGIN;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMIT;
