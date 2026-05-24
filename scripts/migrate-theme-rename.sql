-- Rename theme 'default' → 'tjornuvik' for existing users.
-- Idempotent: only touches rows that still have 'default'.
UPDATE user_settings SET theme = 'tjornuvik' WHERE theme = 'default';
