-- Journal lifetime aggregation RPCs (2026-07-03). APPLIED TO PROD 2026-07-03.
-- Idempotent — safe to run multiple times.
--
-- Problem: the Anchors journal read two full-history log scans into Node:
--   - getJournalData (app/actions/reflections.ts): ALL logs, every chapter,
--     reduced to per-(chapter, week) "has logs" presence flags.
--   - /anchors/journal (app/anchors/journal/page.tsx): ALL logs + the heavy
--     motions→motion_swells→swells join, reduced to per-window per-swell
--     weighted radar actuals.
-- Both grow without bound as the app is used for years (the "L" scaling item;
-- see docs/specs/lifetime-aggregation-2026-07-03.md).
--
-- Fix: aggregate in Postgres and return the compact aggregate. Chosen over the
-- spec's "bound to visible chapter + lazy-load older chapters" direction because
-- the aggregates are small and it needs no UX change (the spec left this open).
--
-- Both are SECURITY INVOKER (default), so the "own logs" / "own motion_swells"
-- RLS policies scope every scan to the calling user — no user_id is trusted from
-- the client. Same pattern as swell_lifetime_totals / swell_weeks_active.
--
-- Day bucketing uses the user's zone (parameterized, never hardcoded Pacific):
-- (logged_at AT TIME ZONE p_tz)::date is the local calendar day, byte-identical
-- to the JS dayKey(logged_at, tz) 'YYYY-MM-DD' the callers compare against.

-- Distinct (chapter, local-day) pairs a user logged on, all-history. Feeds
-- getJournalData's per-week presence flags. Over ALL logs (no swell join) — a
-- motion that feeds no swell still counts as activity for "has logs".
CREATE OR REPLACE FUNCTION log_days_by_chapter(
  p_tz text
)
RETURNS TABLE (
  chapter_id uuid,
  day        date
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT
    l.chapter_id,
    (l.logged_at AT TIME ZONE p_tz)::date
  FROM logs l;
$$;

-- Per-(local-day, swell) weighted actuals, all-history. Feeds the journal's
-- radar actuals: the page sums these over any [cycleStart, cycleEnd] window
-- (weekly for logs-only weeks; month/quarter/year for ceremony anchors), so
-- the grain is day, not week. The per-log points floor is preserved because
-- FLOOR is applied per (log × swell-link) row before the per-day SUM — matching
-- the JS `Math.floor(points × weight)` accumulated per log. Hours unfloored.
-- weight = COALESCE(NULLIF(w,0),1) mirrors JS `Number(w) || 1`.
CREATE OR REPLACE FUNCTION swell_actuals_by_day(
  p_tz text
)
RETURNS TABLE (
  day        date,
  swell_id   uuid,
  points_sum bigint,
  hours_sum  numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (l.logged_at AT TIME ZONE p_tz)::date,
    ms.swell_id,
    COALESCE(SUM(FLOOR(l.points * COALESCE(NULLIF(ms.contribution_weight, 0), 1))), 0)::bigint,
    COALESCE(SUM(l.hours * COALESCE(NULLIF(ms.contribution_weight, 0), 1)), 0)::numeric
  FROM logs l
  JOIN motion_swells ms
    ON ms.motion_id = l.motion_id
  GROUP BY 1, 2;
$$;
