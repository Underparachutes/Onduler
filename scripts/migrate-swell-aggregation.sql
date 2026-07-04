-- Swell lifetime aggregation RPCs (2026-07-03). APPLIED TO PROD 2026-07-03.
-- Idempotent — safe to run multiple times.
--
-- Problem: /swells/[id] (app/swells/[id]/page.tsx) pulled a user's ENTIRE
-- chapter log history for a swell's motions into Node and reduced it in
-- JavaScript to per-motion lifetime totals and a distinct-weeks-active count.
-- Both are genuinely all-history, so they grow without bound as the app is
-- used for years (see docs/specs/lifetime-aggregation-2026-07-03.md, the "L"
-- item). Period-scoped buckets (week / month) and milestone cycle progress
-- stay in Node over a bounded recent-logs fetch — only the lifetime scalars
-- move to SQL.
--
-- Both functions are SECURITY INVOKER (the default), so the existing "own
-- logs" / "own motion_swells" RLS policies apply as the calling user — no
-- user_id is trusted from the client, same pattern as the motion RPCs in
-- migrate-motion-swells-atomic.sql. The logs_user_chapter_idx already supports
-- the scans.
--
-- Math must reproduce the JS reducer exactly:
--   weight       = Number(contribution_weight) || 1  →  COALESCE(NULLIF(w,0),1)
--   points (int) = Σ Math.floor(points × weight)     →  SUM(FLOOR(points × w))  (floor per log)
--   hours        = Σ hours × weight                  →  SUM(hours × w)          (no floor)
--   weeksActive  = distinct sundayOf(local day)      →  distinct Sunday-anchored week
-- Verified against prod data 2026-07-03 (incl. a weight=0 row → treated as 1).

-- Per-motion all-history totals for one swell. Weights are applied at read
-- time (join to motion_swells), so mutable contribution weights never need a
-- history recompute. Grain is (motion) — no day/timezone bucketing, so no tz
-- parameter. Returns only motions that have logs; the caller pre-seeds every
-- motion to zero.
CREATE OR REPLACE FUNCTION swell_lifetime_totals(
  p_swell_id   uuid,
  p_chapter_id uuid
)
RETURNS TABLE (
  motion_id  uuid,
  log_count  bigint,
  points_sum bigint,
  hours_sum  numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.motion_id,
    COUNT(*)::bigint,
    COALESCE(SUM(FLOOR(l.points * COALESCE(NULLIF(ms.contribution_weight, 0), 1))), 0)::bigint,
    COALESCE(SUM(l.hours * COALESCE(NULLIF(ms.contribution_weight, 0), 1)), 0)::numeric
  FROM logs l
  JOIN motion_swells ms
    ON ms.motion_id = l.motion_id
   AND ms.swell_id = p_swell_id
  WHERE l.chapter_id = p_chapter_id
  GROUP BY l.motion_id;
$$;

-- Distinct Sunday-anchored (Sun–Sat) weeks in which any of this swell's
-- motions were logged, all-history. Needs the user's zone to bucket by local
-- week: `logged_at AT TIME ZONE p_tz` gives the local wall-clock instant;
-- adding one day shifts Postgres's Monday-anchored ISO week onto the app's
-- Sunday anchor, so the distinct count matches JS sundayOf() exactly.
CREATE OR REPLACE FUNCTION swell_weeks_active(
  p_swell_id   uuid,
  p_chapter_id uuid,
  p_tz         text
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT date_trunc(
           'week',
           (l.logged_at AT TIME ZONE p_tz) + interval '1 day'
         ))::int
  FROM logs l
  JOIN motion_swells ms
    ON ms.motion_id = l.motion_id
   AND ms.swell_id = p_swell_id
  WHERE l.chapter_id = p_chapter_id;
$$;
