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

// Where the chord between the two adjacent target peaks (axis `index` at R_a
// and axis `index+1` at R_b) crosses the bisector radial between them.
// Reduces to R × cos(π/N) when R_a = R_b = R (the regular-N-gon case).
// Used for both wedge corners and the wedge separator endpoints, so wedges
// and slices share the same boundary geometry even when targets differ.
export function wedgeBoundary(
  index: number,
  targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): Point {
  const count = targets.length
  if (count === 0 || chartMax <= 0) return center
  const next = (index + 1) % count
  const half = Math.PI / count
  const rA = (Math.max(0, targets[index]) / chartMax) * radius
  const rB = (Math.max(0, targets[next]) / chartMax) * radius
  const sum = rA + rB
  const r = sum <= 0 ? 0 : (2 * rA * rB / sum) * Math.cos(half)
  const angle = axisAngleRad(index, count) + half
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
}

// Pie-slice wedge for axis `index`: center → boundary(prev,this) → peak →
// boundary(this,next) → center. Boundaries are the chord-bisector
// intersections, so the wedge and slice geometries share the same radial
// boundaries even when adjacent targets differ.
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
  const ccw = wedgeBoundary(prevIdx, targets, chartMax, radius, center)
  const peak = vertexAt(index, count, targets[index], chartMax, radius, center)
  const cw = wedgeBoundary(index, targets, chartMax, radius, center)
  return `M ${center.x},${center.y} L ${ccw.x},${ccw.y} L ${peak.x},${peak.y} L ${cw.x},${cw.y} Z`
}

// Shoulder vertex for an axis: sits on the boundary radial between axis
// `index` and its neighbor at `axisAngle ± π/N`, at radius
// `cos(π/N) × actualRadius`. `side`: +1 for CW (between i and i+1), -1
// for CCW (between i and i-1). The cos factor lands the shoulder on the
// boundary radial in a way that, when peaks are equal, the polygon becomes
// the regular N-gon.
export function shoulderVertex(
  index: number,
  count: number,
  actualValue: number,
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
  side: number = 1,
): Point {
  if (count === 0 || chartMax <= 0) return center
  const half = Math.PI / count
  const angle = axisAngleRad(index, count) + side * half
  const r = (Math.max(0, actualValue) / chartMax) * radius * Math.cos(half)
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
}

// 3N-vertex actuals polygon. Sequence around the chart:
//   Peak_0, S_CW(0), S_CCW(1), Peak_1, S_CW(1), S_CCW(2), ...
// The "dive" between adjacent peaks happens along their shared boundary
// radial (from S_CW(i) to S_CCW(i+1)), never across a wedge interior.
// Unfed axes collapse peak + both shoulders to center — the dive stays on
// the boundary radials of that axis's wedge, preserving gap-as-signal.
export function actualPolygonPath(
  actuals: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0) return ''
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const peak = vertexAt(i, n, actuals[i], chartMax, radius, center)
    const sCw = shoulderVertex(i, n, actuals[i], chartMax, radius, center, 1)
    const next = (i + 1) % n
    const sCcwNext = shoulderVertex(next, n, actuals[next], chartMax, radius, center, -1)
    parts.push(`${i === 0 ? 'M' : 'L'} ${peak.x},${peak.y}`)
    parts.push(`L ${sCw.x},${sCw.y}`)
    parts.push(`L ${sCcwNext.x},${sCcwNext.y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// One axis's filled slice: center → S_CCW(i) → Peak_i → S_CW(i) → center.
// Returns empty path when actual ≤ 0 (degenerate, nothing to render).
export function slicePath(
  index: number,
  actuals: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0 || chartMax <= 0) return ''
  const value = actuals[index]
  if (!isFinite(value) || value <= 0) return ''
  const sCcw = shoulderVertex(index, n, value, chartMax, radius, center, -1)
  const peak = vertexAt(index, n, value, chartMax, radius, center)
  const sCw = shoulderVertex(index, n, value, chartMax, radius, center, 1)
  return `M ${center.x},${center.y} L ${sCcw.x},${sCcw.y} L ${peak.x},${peak.y} L ${sCw.x},${sCw.y} Z`
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
