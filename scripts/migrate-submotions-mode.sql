-- Submotions: per-user toggle + per-parent mode.
--
-- Adds:
--   motions.submotion_mode           text   NULL   ('distribute' | 'rollup' — NULL treated as 'distribute')
--   user_settings.submotions_enabled boolean NOT NULL DEFAULT false
--
-- Idempotent. Run once in the Supabase SQL Editor.

BEGIN;

ALTER TABLE motions
  ADD COLUMN IF NOT EXISTS submotion_mode text
    CHECK (submotion_mode IS NULL OR submotion_mode IN ('distribute', 'rollup'));

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS submotions_enabled boolean NOT NULL DEFAULT false;

COMMIT;
