# Lifetime aggregation — scoping

*Created 2026-07-03. Scopes the deferred **L** item from
[`backend-hardening-followups-2026-07-02.md`](./backend-hardening-followups-2026-07-02.md):
"Unbounded lifetime aggregation done in Node." Not yet started — this is the
design decision the other Tier-2 fixes push against.*

## The problem

Four read paths pull a user's **entire** log history into Node and reduce it in
JavaScript, even though each render shows one period:

| Site | Query | Reduced in JS to |
|------|-------|------------------|
| `app/anchors/page.tsx` (`allLogs`) | all chapter logs + `motions→motion_swells→swells` join | per-swell period totals, daily chart, radar |
| `app/anchors/journal/page.tsx:96` | **all** logs (every chapter) + same heavy join | per-week per-swell weighted totals |
| `app/actions/reflections.ts` `getJournalData` | **all** logs (every chapter), `logged_at, chapter_id` | per-week has-logs presence flags |
| `app/swells/[id]/page.tsx:139` | all chapter logs for the swell's motions | per-motion week / month / lifetime buckets |

The product is built for multi-year retention, so these grow without bound. At
tester scale they're fine; the ceiling is real users with years of logs and a
Vercel function memory/time budget.

## Two things that shape the fix

**1. The natural grain is `(motion, day)`, not `(swell, day)`.**
A log is per-motion (`points`, `hours`). A swell total is
`Σ over motions linked to the swell of floor(points × contribution_weight)`.
Contribution weights are **mutable** (`setMotionSwells` rewrites `motion_swells`)
and one motion fans out to several swells at different weights. Any rollup keyed
by swell bakes weights into history and would need a full recompute on every
weight edit. Keyed by motion, weights stay applied at **read time** (cheap join
to `motion_swells`) and history never needs touching.

**2. Logs are already ~one row per `(motion, day)`.**
`quickLogMotion` (`app/actions/logs.ts:30-37`) no-ops if the motion was already
logged today. So a per-`(motion, day)` rollup **table** has roughly the same row
count as `logs` itself — it barely reduces rows. The win that matters is not a
smaller table; it's **doing the SUM/GROUP BY in Postgres and returning only the
aggregate**, so Node never materializes full history regardless of table.

Together these say: reach for **SQL aggregation first, a rollup table only if
that isn't enough.**

## Decisions (Josh, 2026-07-03)

1. **Ship Phase 1 now** (don't leave the whole item deferred).
2. **Pass pre-resolved `date` bounds from Node** — no Pacific-day/timezone math
   in SQL. This means period-scoped sites are fixed by *bounding the fetch in
   Node* (no RPC), and RPCs are reserved for the genuinely-lifetime scalar sums.

### Phase 1 breakdown by site

- **`/anchors` page — DONE (bounding, no RPC).** Everything on the page derives
  from the selected period plus the current month (wave detection). Fetch is now
  bounded to `[min(periodStart, currentMonthStart), today]` with a DST buffer;
  the existing exact JS filters (`inPeriod`, month slice) trim. No DB change.
- **`/swells/[id]` — DONE (RPC), 2026-07-03.** Two `SECURITY INVOKER` RPCs in
  `scripts/migrate-swell-aggregation.sql`: `swell_lifetime_totals` (per-motion
  all-history `count/pts/hrs`, weights + per-log points floor, no TZ — grouped by
  motion) and `swell_weeks_active` (distinct Sunday weeks, parameterized TZ).
  Week/month buckets + milestone cycle progress moved to a bounded Node fetch
  (`>= min(weekStart, monthStart)`, since cadence is only weekly/monthly). Note:
  `weeks_active` is the one genuinely-lifetime local-week group-by with no
  Node-passable bound, so it does parameterized-TZ bucketing in SQL — a scoped
  departure from decision #2, resolved by passing the user's zone (not hardcoding
  Pacific), per the line 96–99 option. Verified against the old full scan on prod
  data before swapping.
- **journal (`getJournalData` + `/anchors/journal`) — DONE (RPC), 2026-07-03.**
  Went with RPC-aggregates over the lazy-load direction (lighter, no UX change).
  Two functions in `scripts/migrate-journal-aggregation.sql`: `log_days_by_chapter(tz)`
  → distinct `(chapter, local-day)` for `getJournalData`'s presence flags (all
  logs, no swell join); `swell_actuals_by_day(tz)` → per-`(local-day, swell)`
  weighted totals, summed in Node over each rendered `[cycleStart, cycleEnd]`
  window (day grain, because ceremony anchors carry month/quarter/year windows).
  Per-log points floor preserved; verified against the old raw floor-sum on prod.
  **Follow-up spotted:** `fetchLogDays` (`reflections.ts`) is a 5th unbounded
  per-chapter distinct-days scan (feeds `/anchors` unlock/ceremony state) not in
  this spec's original four — a chapter-filtered `log_days_by_chapter` closes it.

## Recommendation: RPCs first, rollup table as escalation

### Phase 1 — aggregate in Postgres via `SECURITY INVOKER` RPCs (no new table)

Add functions that group over the raw `logs` table and return a handful of rows.
`SECURITY INVOKER` (default) means the existing `own logs` RLS applies as the
caller — same pattern as the motion RPCs in
[`migrate-motion-swells-atomic.sql`](../../scripts/migrate-motion-swells-atomic.sql),
so no `user_id` is trusted from the client. The existing
`logs_user_chapter_idx (user_id, chapter_id, logged_at DESC)` index already
supports the scans.

Proposed surface (names/shapes, not final SQL):

- `swell_totals(p_chapter_id uuid, p_start date, p_end date)`
  → `(swell_id uuid, points_sum bigint, hours_sum numeric, log_count int)`
  Joins `logs → motion_swells`, groups by swell. **Per-log floor matters**:
  points are `SUM(FLOOR(l.points * ms.contribution_weight))` (floor per
  log×link row, matching the JS `Math.floor(log.points * w)`); hours are
  `SUM(l.hours * ms.contribution_weight)` (no floor). Serves the `/anchors`
  radar + by-swell breakdown.
- `swell_totals_by_day(p_chapter_id, p_start, p_end)`
  → adds a `day date` (Pacific) group key. Serves the `/anchors` daily chart.
- `motion_totals_for_swell(p_swell_id, p_week_start, p_month_start)`
  → per-motion `count/pts/hrs` for week / month / lifetime in one call. Serves
  `/swells/[id]`.
- `logged_weeks(p_start date)` (or reuse `swell_totals_by_day` with no swell
  filter) → distinct Pacific log-days per chapter for the journal presence flags.

Timezone: aggregation must bucket by **Pacific** day, not UTC. Either compute
`(logged_at AT TIME ZONE 'America/Los_Angeles')::date` in SQL, or keep the
existing generous-timestamp-bound + exact-JS-key pattern and let the RPC take
pre-resolved `date` bounds (simpler, matches `getAnchorsForPeriod`).

Migrate the four read sites one at a time — each is independently shippable and
verifiable against the current JS output before deleting the JS reducer.

### Phase 2 — rollup table, only if Phase 1 latency isn't enough

If, at real scale, the GROUP-BY scans get slow (unlikely before thousands of
active-years), add `motion_day_rollup (user_id, motion_id, chapter_id, day,
points_sum, hours_sum, log_count)` maintained by an `AFTER INSERT/UPDATE/DELETE`
trigger on `logs`, and point the same RPCs at the rollup instead of raw `logs`.
Because Phase 1 hid aggregation behind RPCs, the read sites don't change — only
the RPC bodies do. Phase 2 also needs a **backfill migration** (populate the
rollup from existing logs) and careful trigger accounting on the mutable paths
(`removeLogById`, `unlogMotion`, `logMotionOnDay`).

## Why not table-first

- A per-`(motion, day)` table ≈ current `logs` row count (see finding 2), so the
  table alone changes little; the RPC is doing the actual work.
- Triggers + backfill + delete/update accounting are the expensive, bug-prone
  parts. Deferring them until RPC latency proves insufficient avoids paying that
  cost speculatively.
- Phase 1 is reversible and low-risk (additive functions, no data migration);
  Phase 2 builds on it without reworking the read sites.

## Effort & risk

- **Phase 1: M–L.** ~4 RPCs + migrating 4 read sites. Main risk is
  reproducing the JS math **exactly** (per-log points floor, hours no-floor,
  Pacific day bucketing, weight application). Mitigation: keep each JS reducer in
  place, diff its output against the RPC on real data, then delete.
- **Phase 2: L, deferred.** Only if measured. Trigger correctness on
  delete/update + backfill are the load-bearing risks.

## Out of scope

- **Bonus points** (`milestone_hits` / one-shot `milestones`) — already bounded
  to the period (commit `ab319e3`); the rollup is logs-only.
- Chapter resolution and the per-render single log-day fetch — already fixed
  (commit `d14ada0`).

## Open questions for Josh

1. Ship Phase 1 now, or leave the whole item deferred until a real user actually
   accumulates enough history to feel it? (Nothing hurts at tester scale.)
2. Pacific-day bucketing in SQL vs. passing pre-resolved `date` bounds from Node
   — fine to decide per-RPC when we build it.
