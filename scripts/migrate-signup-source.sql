-- Signup source capture: where did this account come from?
--
-- Adds:
--   user_settings.signup_source text (nullable)
--
-- Written once at account creation from the postcard QR's utm_source
-- (utm_source=postcard -> 'postcard'; absent -> 'direct'). Stores the raw
-- utm_source value so a future channel (flyer, instagram) is captured
-- without a schema change. Never updated after creation.
--
-- Idempotent. Run once in the Supabase SQL Editor.

BEGIN;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS signup_source text;

COMMIT;
