-- Cycle-close email opt-in + per-user unsubscribe token.
--
-- Adds two columns to user_settings:
--   email_cycle_close_enabled  boolean   default true. Flipping to false
--                              (via in-app toggle or unsubscribe link)
--                              stops weekly cycle-close emails. Existing
--                              users default to opted-in; surface controls
--                              are clearly labeled so this is consensual.
--   email_unsubscribe_token    uuid      per-user token signed into every
--                              email's unsubscribe link. Validating the
--                              token (vs. user_id) means an attacker who
--                              guesses user_id can't trigger unsubscribes.
--
-- Idempotent. Run once in the Supabase SQL Editor.

BEGIN;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS email_cycle_close_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_unsubscribe_token    uuid    NOT NULL DEFAULT gen_random_uuid(),
  -- Idempotency anchor: cycle_start (YYYY-MM-DD) of the most recent
  -- weekly cycle-close email we sent this user. Cron skips a user
  -- whose value already equals this week's just-closed cycleStart, so
  -- retries don't double-send.
  ADD COLUMN IF NOT EXISTS last_cycle_email_cycle_start date;

-- Tokens added by the ALTER above will be unique per row by virtue of
-- DEFAULT gen_random_uuid() firing per insert, but existing rows all get
-- one shared default. Backfill every row with its own random token so
-- the unique constraint is meaningful.
UPDATE user_settings SET email_unsubscribe_token = gen_random_uuid()
  WHERE email_unsubscribe_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_settings_email_unsubscribe_token_idx
  ON user_settings (email_unsubscribe_token);

COMMIT;
