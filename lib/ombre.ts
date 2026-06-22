// Multi-swell ombré for the daily progress bar: a left-to-right gradient where
// each swell's band is sized to its share of the day's earned value, so the fill
// reads as both how-much (width, set by the caller) and where-the-effort-went
// (color makeup). Pure + testable — the React wiring lives in DailyChecklist.
//
// Spec: docs/specs/multi-swell-ombre-bar-2026-06-21.md

export type SwellBand = { color: string; value: number }

// Smallest fraction of the fill any contributing swell is allowed to occupy, so a
// tiny band stays legible at a low total (the README's "thin sliver" limitation).
const DEFAULT_MIN_SHARE = 0.08

// Build a `linear-gradient(90deg, …)` across the swell bands, or null when there's
// nothing to show (caller falls back to the single-color bar). Bands are taken in
// the order given — pass them in stable on-screen swell order so a swell always
// reads in the same position and only its size changes between recalcs.
export function ombreGradient(
  bands: SwellBand[],
  opts: { minShare?: number } = {},
): string | null {
  const segs = bands.filter(b => b.value > 0)
  if (segs.length === 0) return null
  if (segs.length === 1) return segs[0].color

  const total = segs.reduce((sum, b) => sum + b.value, 0)
  const n = segs.length

  // Floor each band at minShare, then distribute the remainder by true share so
  // the shares always sum to 1. If the floor can't fit (n·minShare ≥ 1), split
  // evenly — the most legible thing left to do.
  const minShare = opts.minShare ?? DEFAULT_MIN_SHARE
  const canFloor = n * minShare < 1
  const shares = segs.map(b =>
    canFloor ? minShare + (1 - n * minShare) * (b.value / total) : 1 / n,
  )

  // Anchor the first color at 0% and the last at 100%; place every band's color at
  // its cumulative midpoint so neighbors blend smoothly instead of hard-edging.
  const stops = [`${segs[0].color} 0%`]
  let cum = 0
  segs.forEach((b, i) => {
    const mid = (cum + shares[i] / 2) * 100
    stops.push(`${b.color} ${mid.toFixed(1)}%`)
    cum += shares[i]
  })
  stops.push(`${segs[n - 1].color} 100%`)

  return `linear-gradient(90deg, ${stops.join(', ')})`
}
