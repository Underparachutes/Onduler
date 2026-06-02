-- Add intensity column to logs table
-- Idempotent: safe to run multiple times

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logs' AND column_name = 'intensity'
  ) THEN
    ALTER TABLE logs ADD COLUMN intensity text DEFAULT 'medium';
    ALTER TABLE logs ADD CONSTRAINT logs_intensity_check
      CHECK (intensity IN ('light', 'medium', 'deep'));
  END IF;
END $$;

COMMIT;
