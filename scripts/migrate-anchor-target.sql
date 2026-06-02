-- Add anchor_target_per_week to user_settings
-- Default 1: hitting the weekly ceremony covers this on its own.
-- Setting to 0 hides the progress bar entirely.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS anchor_target_per_week int NOT NULL DEFAULT 1;
