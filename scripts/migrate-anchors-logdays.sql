-- Anchors log-days RPC (2026-07-04).
-- Idempotent — safe to run multiple times.
--
-- Problem: fetchLogDays (app/actions/reflections.ts) pulled every log row in
-- the active chapter into Node just to derive the set of distinct local days
-- the user logged on (feeds /anchors unlock + ceremony state). Unbounded scan,
-- grows with years of use — the 5th and last such scan, spotted during the
-- journal pass (see scripts/migrate-journal-aggregation.sql); not in the
-- original spec docs/specs/backend-hardening-followups-2026-07-02.md.
--
-- Fix: a chapter-filtered variant of log_days_by_chapter. A separate function
-- rather than an optional parameter on the existing one, because adding a
-- DEFAULT parameter via CREATE OR REPLACE would create a second overload and
-- make existing 1-arg calls ambiguous.
--
-- SECURITY INVOKER (default): the "own logs" RLS policy scopes the scan to the
-- calling user — a chapter id belonging to someone else returns zero rows.
--
-- Day bucketing uses the user's zone (parameterized, never hardcoded Pacific):
-- (logged_at AT TIME ZONE p_tz)::date is the local calendar day, byte-identical
-- to the JS dayKey(logged_at, tz) 'YYYY-MM-DD' the callers compare against.

-- Distinct local days the user logged on within one chapter.
CREATE OR REPLACE FUNCTION log_days_in_chapter(
  p_chapter uuid,
  p_tz      text
)
RETURNS TABLE (
  day date
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT
    (l.logged_at AT TIME ZONE p_tz)::date
  FROM logs l
  WHERE l.chapter_id = p_chapter;
$$;
