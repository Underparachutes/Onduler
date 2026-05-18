// Geometry + scale helpers for the Logs radar (docs/logs-radar-spec.md).
// Pure functions only — no React, no DOM, no Supabase.

export type Currency = 'points' | 'hours'

export type Point = { x: number; y: number }

// Axes start at the top (-90°) and go clockwise. SVG y points down, so
// a clockwise visual rotation is increasing angle in the same sense.
export function axisAngleRad(index: number, count: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / count
}

// Vertex along an axis at a given value. value=0 returns the center.
export function vertexAt(
  index: number,
  count: number,
  value: number,
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): Point {
  const r = chartMax <= 0 ? 0 : (Math.max(0, value) / chartMax) * radius
  const angle = axisAngleRad(index, count)
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// Kite-shaped wedge for axis `index`: center → mid(prev,this) → this → mid(this,next) → center.
// The N wedges tile the target polygon's interior with no gaps or overlaps.
export function wedgePath(
  index: number,
  targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const count = targets.length
  if (count === 0) return ''
  const prevIdx = (index - 1 + count) % count
  const nextIdx = (index + 1) % count
  const vThis = vertexAt(index, count, targets[index], chartMax, radius, center)
  const mPrev = midpoint(
    vertexAt(prevIdx, count, targets[prevIdx], chartMax, radius, center),
    vThis,
  )
  const mNext = midpoint(
    vThis,
    vertexAt(nextIdx, count, targets[nextIdx], chartMax, radius, center),
  )
  return `M ${center.x},${center.y} L ${mPrev.x},${mPrev.y} L ${vThis.x},${vThis.y} L ${mNext.x},${mNext.y} Z`
}

// Closed polygon through every axis vertex at its value. Used for the
// stroke-only actual polygon — unfed axes collapse the vertex to center,
// pinching the line diagonally across the wedge (the gap-as-signal).
export function polygonPath(
  values: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  if (values.length === 0) return ''
  const pts = values.map((v, i) => vertexAt(i, values.length, v, chartMax, radius, center))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z'
}

// Per-axis max blend of primary and secondary build targets. Secondary
// only pulls outward, never shrinks. Missing axis on either side is 0.
export function blendTargets(primary: number[], secondary: number[] | null): number[] {
  if (!secondary) return primary.slice()
  if (primary.length !== secondary.length) {
    throw new Error('blendTargets: arrays must have the same length')
  }
  return primary.map((p, i) => Math.max(p, secondary[i] ?? 0))
}

export type ScaleConfig = {
  initialCeiling: number
  floor: number
  hardCeiling: number
  // When auto-rescaling, the largest vertex lands at this fraction of the
  // chart radius. Leaves headroom so an over-target polygon stays inside.
  overshootHeadroomPct: number
}

export const POINTS_SCALE: ScaleConfig = {
  initialCeiling: 200,
  floor: 100,
  hardCeiling: 1000,
  overshootHeadroomPct: 0.85,
}

export const HOURS_SCALE: ScaleConfig = {
  initialCeiling: 10,
  floor: 5,
  hardCeiling: 50,
  overshootHeadroomPct: 0.85,
}

export function scaleConfigFor(currency: Currency): ScaleConfig {
  return currency === 'hours' ? HOURS_SCALE : POINTS_SCALE
}

// Pick a chart ceiling that contains the largest vertex with headroom.
// Pass [...targets, ...actuals] so both kinds of vertex are considered.
export function chartCeiling(values: number[], config: ScaleConfig): number {
  const max = values.reduce((m, v) => (v > m ? v : m), 0)
  if (max <= config.initialCeiling * config.overshootHeadroomPct) {
    return Math.max(config.initialCeiling, config.floor)
  }
  const rescaled = max / config.overshootHeadroomPct
  return Math.min(config.hardCeiling, Math.max(config.floor, rescaled))
}

// Project a pointer position onto the axis direction relative to center.
// Returns signed px from center along the axis. Negative = pulled past
// center (treated as 0 by the caller); positive = outward along the axis.
export function projectOnAxis(
  pointer: Point,
  index: number,
  count: number,
  center: Point = { x: 0, y: 0 },
): number {
  const angle = axisAngleRad(index, count)
  const dx = pointer.x - center.x
  const dy = pointer.y - center.y
  return dx * Math.cos(angle) + dy * Math.sin(angle)
}

// Convert a radial distance (px) to a target value in the current scale,
// clamped to [0, hardCeiling]. Used on drag.
export function radialToValue(
  pxFromCenter: number,
  chartMax: number,
  radius: number,
  hardCeiling: number,
): number {
  if (radius <= 0 || chartMax <= 0) return 0
  const raw = (pxFromCenter / radius) * chartMax
  if (raw <= 0) return 0
  if (raw > hardCeiling) return hardCeiling
  return raw
}

// Apply a wave-week ramp to a target. ramp=1 → unchanged; ramp=0.4 → 40%.
// Out-of-range ramps are normalized to [0, 1].
export function applyRamp(target: number, ramp: number): number {
  if (!isFinite(ramp) || ramp <= 0) return 0
  if (ramp >= 1) return target
  return target * ramp
}
