-- Lock privileged user_settings columns from client writes (2026-07-02).
-- Idempotent — safe to run multiple times. APPLIED TO PROD 2026-07-02.
--
-- Problem: the "own user_settings" RLS policy (FOR ALL USING auth.uid() = user_id)
-- correctly stops a user editing someone else's row, but it does NOT restrict
-- WHICH columns they may set on their OWN row. `authenticated` also holds a
-- table-level UPDATE grant, and the anon key + a user's JWT both live in the
-- browser, so any logged-in user can PATCH user_settings directly via PostgREST
-- and set is_admin = true (→ reaches the service-role /admin surfaces) or
-- subscription_status = 'lifetime' (→ free paid tier). The server actions are
-- irrelevant here; RLS + grants are the real boundary.
--
-- Why not a column-level REVOKE: a column-level REVOKE UPDATE(...) cannot carve
-- columns out of a table-level UPDATE grant (effective column privilege is the
-- union of table + column grants), so it's a no-op here. A BEFORE trigger is the
-- robust fix and survives schema additions.
--
-- Fix: a BEFORE INSERT OR UPDATE trigger that, for the two untrusted API roles
-- (authenticated, anon), pins is_admin / subscription_status / subscription_id /
-- current_period_end to their existing values (UPDATE) or safe defaults (INSERT).
-- The Stripe webhook runs as service_role and manual admin edits run as postgres;
-- both fall through the guard and can still write these columns.
--
-- NOTE: stripe_customer_id is intentionally NOT guarded — the checkout flow
-- (app/actions/billing.ts) upserts it via the normal authenticated client, and a
-- user attaching their own row to a Stripe customer grants nothing without a real
-- payment (subscription_status is guarded above).

CREATE OR REPLACE FUNCTION protect_user_settings_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.is_admin            := OLD.is_admin;
      NEW.subscription_status := OLD.subscription_status;
      NEW.subscription_id     := OLD.subscription_id;
      NEW.current_period_end  := OLD.current_period_end;
    ELSIF TG_OP = 'INSERT' THEN
      NEW.is_admin            := false;
      NEW.subscription_status := 'none';
      NEW.subscription_id     := NULL;
      NEW.current_period_end  := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_settings_privileged_cols ON user_settings;
CREATE TRIGGER protect_user_settings_privileged_cols
  BEFORE INSERT OR UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION protect_user_settings_privileged_cols();
