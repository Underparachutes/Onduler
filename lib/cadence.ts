// Cadence helpers for recurring waypoints (table: `milestones`).
// Pure functions, no React/Supabase/DOM. The server actions and aggregation
// paths consume these to detect cycle hits and render partial-ring progress.
//
// All cycle math operates on Pacific day keys (YYYY-MM-DD) — the same shape
// `lib/periods.ts` uses everywhere else — so callers don't need to wrestle
// with timezone-aware Date math.

import { monthStartKey, pacificDayKey, type DayKey } from './periods'

export type Cadence = 'weekly' | 'monthly'

// The Pacific day key at the start of the cadence's current cycle.
//   weekly  → caller-provided weekStartKey (the project's Monday-anchored
//             week-start; let consumers stay aligned with the existing
//             `getWeekStart` source-of-truth without re-deriving it here)
//   monthly → 1st-of-month for the month containing `todayKey`
export function cycleStartKey(
  cadence: Cadence,
  weekStartKey: DayKey,
  todayKey: DayKey,
): DayKey {
  if (cadence === 'monthly') return monthStartKey(todayKey)
  return weekStartKey
}

// Count logs of a given motion that fall in [cycleStartKey, today]. Used by
// the auto-progress hook and the partial-ring visual on motion-linked
// recurring waypoints.
type LogLike = { motion_id?: string | null; logged_at: string }
export function logsInCycle(
  logs: LogLike[],
  motionId: string,
  cycleStartKey: DayKey,
): number {
  let count = 0
  for (const l of logs) {
    if (l.motion_id !== motionId) continue
    if (pacificDayKey(l.logged_at) >= cycleStartKey) count += 1
  }
  return count
}

// True iff the given milestone already has a hit row in the current cycle.
// Gates re-firing the celebration when the user logs additional times after
// crossing the threshold.
type HitLike = { milestone_id: string; hit_at: string }
export function hasHitInCycle(
  hits: HitLike[],
  milestoneId: string,
  cycleStartKey: DayKey,
): boolean {
  for (const h of hits) {
    if (h.milestone_id !== milestoneId) continue
    if (pacificDayKey(h.hit_at) >= cycleStartKey) return true
  }
  return false
}

// Partial-ring progress for a motion-linked recurring waypoint. `current`
// is the log count in the cycle; `target` is the waypoint's target_count.
// `ratio` clamps to [0, 1] for SVG arc rendering.
export function cycleProgress(current: number, target: number): {
  current: number
  target: number
  ratio: number
  hit: boolean
} {
  const t = target > 0 ? target : 1
  const c = current > 0 ? current : 0
  return {
    current: c,
    target: t,
    ratio: Math.min(1, c / t),
    hit: c >= t,
  }
}
