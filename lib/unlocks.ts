// First-time cadence unlock helpers (ADR 0007). Pure — takes a Set of day
// keys representing logged Pacific days and a closed-cycle window, returns
// whether the engagement floor was met for that cycle.
//
// Cycle resolution lives in lib/cycles.ts. The unlock *check* runs against
// a pre-computed set of log day keys; the server hands one in.

import { type DayKey } from './periods'
import { type Cycle, type Cadence } from './cycles'

export type { Cadence }

// Engagement floors from ADR 0007. Distinct days with at least one log
// inside the closed cycle window.
export const UNLOCK_FLOOR: Record<Cadence, number> = {
  week: 3,
  month: 8,
  quarter: 25,
  year: 80,
}

// Subsequent ceremonies (after first unlock) fire on a softer floor — the
// user logged at least once during the cycle. Wave-cycles (zero logs) get
// no ceremony, no indicator (ADR 0007).
export const CEREMONY_FLOOR: Record<Cadence, number> = {
  week: 1,
  month: 1,
  quarter: 1,
  year: 1,
}

// Count distinct log days that fall inside [cycleStart, cycleEnd] inclusive.
export function logDaysInCycle(loggedDayKeys: Set<DayKey>, cycle: Cycle): number {
  let count = 0
  for (const k of loggedDayKeys) {
    if (k >= cycle.cycleStart && k <= cycle.cycleEnd) count += 1
  }
  return count
}

export function meetsUnlockFloor(loggedDayKeys: Set<DayKey>, cycle: Cycle, cadence: Cadence): boolean {
  return logDaysInCycle(loggedDayKeys, cycle) >= UNLOCK_FLOOR[cadence]
}

export function meetsCeremonyFloor(loggedDayKeys: Set<DayKey>, cycle: Cycle, cadence: Cadence): boolean {
  return logDaysInCycle(loggedDayKeys, cycle) >= CEREMONY_FLOOR[cadence]
}

// True if there exists any fully-closed cycle of `cadence` (cycleEnd before
// `today`) in which the user logged ≥ UNLOCK_FLOOR[cadence] distinct days.
// Bucket logs by their cycle of origin, count per bucket, then check.
export function unlockedForCadence(
  loggedDayKeys: Set<DayKey>,
  cadence: Cadence,
  today: DayKey,
  cycleContaining: (day: DayKey, cadence: Cadence) => Cycle,
): boolean {
  const buckets = new Map<DayKey, { cycle: Cycle; count: number }>()
  for (const day of loggedDayKeys) {
    const cycle = cycleContaining(day, cadence)
    const entry = buckets.get(cycle.cycleStart)
    if (entry) entry.count += 1
    else buckets.set(cycle.cycleStart, { cycle, count: 1 })
  }
  const floor = UNLOCK_FLOOR[cadence]
  for (const { cycle, count } of buckets.values()) {
    if (cycle.cycleEnd >= today) continue // current cycle, not yet closed
    if (count >= floor) return true
  }
  return false
}
