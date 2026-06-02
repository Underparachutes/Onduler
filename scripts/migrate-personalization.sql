-- Add background_url and progress_bar_color to user_settings
-- Idempotent: safe to run multiple times

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'background_url'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN background_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'progress_bar_color'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN progress_bar_color text;
  END IF;
END $$;

COMMIT;
