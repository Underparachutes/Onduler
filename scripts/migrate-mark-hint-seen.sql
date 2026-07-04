-- Atomic hint-seen write (2026-07-04).
-- Idempotent — safe to run multiple times.
--
-- Problem (backend-hardening Tier 3): markHintSeen (app/actions/settings.ts)
-- did a read-modify-write on the whole user_settings.hints_seen JSON blob.
-- Two concurrent server actions (easy to hit: most actions fire it) could
-- clobber each other's keys — genuine data loss, if cosmetic in impact.
--
-- Fix: a single-statement jsonb merge in Postgres. `||` on jsonb is a
-- server-side merge, so concurrent calls each add their own key and neither
-- clobbers the other. Upsert form so a missing user_settings row (shouldn't
-- happen post-onboarding, but the old code tolerated it) still works.
--
-- SECURITY INVOKER (default) + auth.uid(): the caller can only ever touch
-- their own row, and RLS still applies. hints_seen is not one of the
-- trigger-protected privileged columns, so the write falls through cleanly.
CREATE OR REPLACE FUNCTION mark_hint_seen(
  p_key text
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO user_settings (user_id, hints_seen)
  VALUES (auth.uid(), jsonb_build_object(p_key, true))
  ON CONFLICT (user_id)
  DO UPDATE SET hints_seen = COALESCE(user_settings.hints_seen, '{}'::jsonb) || jsonb_build_object(p_key, true);
$$;
