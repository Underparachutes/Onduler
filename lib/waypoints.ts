// Bonus-points aggregation. Pure helpers — pages do their own queries and
// pass raw rows in. Centralizing the math here so every aggregation path
// (dashboard, log, swells, proficiency) accrues bonus points the same way.
//
// Two sources of bonus points per swell:
//   1. Recurring cycle hits — one row in `milestone_hits` per hit
//   2. One-shot completions — `milestones.completed_at` set
// Both add `milestones.bonus_points` to the swell's total at the hit time.

export type WaypointHitRow = {
  hit_at: string
  // Supabase nests the join as an object when there's a single referenced row.
  milestones?: { swell_id: string; bonus_points: number } | { swell_id: string; bonus_points: number }[] | null
}

export type OneShotCompletionRow = {
  swell_id: string
  bonus_points: number
  completed_at: string | null
}

function readMilestone(h: WaypointHitRow): { swell_id: string; bonus_points: number } | null {
  const m = h.milestones
  if (!m) return null
  return Array.isArray(m) ? (m[0] ?? null) : m
}

// Bonus points per swell from hits and one-shot completions that fall within
// the optional ISO-timestamp window. Both bounds optional — pass neither for
// lifetime totals. String comparison works because ISO-8601 sorts lexically.
export function bonusBySwell(
  hits: WaypointHitRow[],
  oneShots: OneShotCompletionRow[],
  windowStartIso?: string,
  windowEndIso?: string,
): Map<string, number> {
  const totals = new Map<string, number>()
  const inWindow = (iso: string): boolean => {
    if (windowStartIso && iso < windowStartIso) return false
    if (windowEndIso && iso > windowEndIso) return false
    return true
  }
  for (const h of hits) {
    if (!inWindow(h.hit_at)) continue
    const m = readMilestone(h)
    if (!m) continue
    totals.set(m.swell_id, (totals.get(m.swell_id) ?? 0) + (m.bonus_points ?? 0))
  }
  for (const m of oneShots) {
    if (!m.completed_at) continue
    if (!inWindow(m.completed_at)) continue
    totals.set(m.swell_id, (totals.get(m.swell_id) ?? 0) + (m.bonus_points ?? 0))
  }
  return totals
}

// Sum of bonus points across all swells (or across the given swell set).
// Helper for surfaces that already filtered to one swell.
export function bonusTotal(byBucket: Map<string, number>, swellIds?: string[]): number {
  if (!swellIds) {
    let total = 0
    for (const v of byBucket.values()) total += v
    return total
  }
  let total = 0
  for (const id of swellIds) total += byBucket.get(id) ?? 0
  return total
}
