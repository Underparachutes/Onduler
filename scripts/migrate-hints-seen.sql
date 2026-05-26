-- Onboarding hint cards: per-user hint-seen tracking.
--
-- Adds:
--   user_settings.hints_seen jsonb NOT NULL DEFAULT '{}'
--
-- Backfills existing users (onboarding_complete = true) with all hints
-- marked as seen so they don't get orientation cards they don't need.
--
-- Idempotent. Run once in the Supabase SQL Editor.

BEGIN;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS hints_seen jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE user_settings
  SET hints_seen = '{"motions": true, "swells": true, "anchors_locked": true, "anchors_unlocked": true, "settings": true}'::jsonb
  WHERE onboarding_complete = true
    AND hints_seen = '{}'::jsonb;

COMMIT;
