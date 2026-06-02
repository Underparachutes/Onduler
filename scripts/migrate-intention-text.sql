-- Add intention_text column to reflections table
-- Idempotent: safe to run multiple times

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reflections' AND column_name = 'intention_text'
  ) THEN
    ALTER TABLE reflections ADD COLUMN intention_text text;
  END IF;
END $$;

COMMIT;
