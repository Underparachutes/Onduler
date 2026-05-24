-- Stripe billing: per-user columns on user_settings.
--
-- Adds:
--   stripe_customer_id   text UNIQUE  (lazy-created on first billing interaction)
--   subscription_status  text         ('none' default for free users)
--   subscription_id      text UNIQUE  (null for free + lifetime)
--   current_period_end   timestamptz  (null for free + lifetime)
--
-- Idempotent. Run once in the Supabase SQL Editor.

BEGIN;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS stripe_customer_id   text     UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status  text     DEFAULT 'none'
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'lifetime', 'none')),
  ADD COLUMN IF NOT EXISTS subscription_id      text     UNIQUE,
  ADD COLUMN IF NOT EXISTS current_period_end   timestamptz;

CREATE INDEX IF NOT EXISTS user_settings_stripe_customer_idx
  ON user_settings (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMIT;
