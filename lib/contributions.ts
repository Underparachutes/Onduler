// Normalized contribution model (ADR 0003).
// A motion's contribution_weight across its swells sums to ≤ 1.0.
// Weights are stored as 0..1 in the DB. UI surfaces them as 0..100%.

export type WeightEntry = { swellId: string; weight: number }

const EPS = 1e-6

function clamp01(n: number): number {
  if (!isFinite(n) || n < 0) return 0
  if (n > 1) return 1
  return n
}

// Last-resort guard on persist. If the client somehow submits entries
// that violate the constraint, clamp each to [0, 1] and scale down so
// the sum is ≤ 1, preserving proportions.
export function normalizeEntries(entries: WeightEntry[]): WeightEntry[] {
  const clamped = entries.map(e => ({ swellId: e.swellId, weight: clamp01(e.weight) }))
  const sum = clamped.reduce((s, e) => s + e.weight, 0)
  if (sum <= 1 + EPS) return clamped
  return clamped.map(e => ({ swellId: e.swellId, weight: e.weight / sum }))
}

// Smart default for a newly-toggled-on swell: take whatever capacity is
// left on the motion. Filled motion → new swell starts at 0% and the
// user drags allocation off the others to make room.
export function defaultWeightForNewSwell(weights: Map<string, number>): number {
  let sum = 0
  for (const w of weights.values()) sum += w
  return clamp01(1 - sum)
}

// Apply an edit to one swell's weight on a motion, rebalancing the
// others proportionally so the sum stays ≤ 1.
//
// Rule: if the edited value + sum-of-others would exceed 1, scale the
// others so their sum equals (1 - edited). If it fits under 1, leave
// the others alone — the user is freeing capacity, not stealing it.
export function applyWeightEdit(
  weights: Map<string, number>,
  swellId: string,
  newWeight: number,
): Map<string, number> {
  const edited = clamp01(newWeight)
  const next = new Map(weights)
  if (!next.has(swellId)) return weights

  let othersSum = 0
  for (const [id, w] of next.entries()) {
    if (id !== swellId) othersSum += w
  }

  if (edited + othersSum <= 1 + EPS) {
    next.set(swellId, edited)
    return next
  }

  const targetOthers = Math.max(0, 1 - edited)
  if (othersSum <= EPS) {
    next.set(swellId, edited)
    return next
  }

  const scale = targetOthers / othersSum
  for (const [id, w] of next.entries()) {
    if (id === swellId) next.set(id, edited)
    else next.set(id, w * scale)
  }
  return next
}

export function totalAllocation(weights: Map<string, number>): number {
  let sum = 0
  for (const w of weights.values()) sum += w
  return clamp01(sum)
}
