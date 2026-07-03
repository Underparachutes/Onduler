-- Per-user timezone, Phase A (2026-07-03). Idempotent. APPLIED TO PROD 2026-07-03.
-- See docs/specs/per-user-timezone-2026-07-03.md.
--
-- IANA zone name (e.g. 'America/New_York'). The whole app is Pacific-hardcoded
-- today, so DEFAULT 'America/Los_Angeles' backfills existing rows to exactly
-- their current behavior — nothing shifts until Phase B threads tz into the
-- day/week computation. Freely user-editable (not a privileged column), so the
-- protect_user_settings_privileged_cols trigger intentionally does not touch it.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Los_Angeles';
