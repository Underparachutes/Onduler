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
  let r: number
  if (sum <= 0) {
    r = 0
  } else if (rA <= 0 || rB <= 0) {
    r = Math.max(rA, rB) * Math.cos(half)
  } else {
    r = (2 * rA * rB / sum) * Math.cos(half)
  }
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
// `index` and its neighbor at `axisAngle ± π/N`. `side`: +1 for CW (between
// i and i+1), -1 for CCW (between i and i-1).
//
// Radial distance matches slicePath's chord-end rule: `min(actualR, wedgeBoundaryR)`
// where wedgeBoundaryR is the chord-bisector intersection of the two adjacent
// target peaks. This keeps the outline aligned with the slice fill in the
// under-target case (where actualR < boundaryR, both land at actualR — no
// bleed) and still lets the outline extend past the slice peak in overshoot
// (where actualR > targetR, slice caps at target but the outline rides up to
// the boundary along the bisector).
export function shoulderVertex(
  index: number,
  count: number,
  actualValue: number,
  targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
  side: number = 1,
): Point {
  if (count === 0 || chartMax <= 0) return center
  const half = Math.PI / count
  const angle = axisAngleRad(index, count) + side * half
  const actualR = (Math.max(0, actualValue) / chartMax) * radius
  // Boundary radial limit: chord intersection with the adjacent wedge on
  // the requested side. side=+1 uses boundary(i, i+1); side=-1 uses
  // boundary(i-1, i).
  const adjIdx = side > 0 ? index : (index - 1 + count) % count
  const b = wedgeBoundary(adjIdx, targets, chartMax, radius, center)
  const boundaryR = Math.hypot(b.x - center.x, b.y - center.y)
  const r = Math.min(actualR, boundaryR)
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
}

// 3N-vertex actuals polygon. Sequence around the chart:
//   Peak_0, S_CW(0), S_CCW(1), Peak_1, S_CW(1), S_CCW(2), ...
// Peaks sit at the raw actual value (so the outline extends past wedges in
// overshoot). Shoulders share slicePath's chord-clamp rule so the polygon
// boundary lines up with the slice fill boundary on the bisector radials.
// `targets` is required to compute the wedge boundary radii.
export function actualPolygonPath(
  actuals: number[],
  targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0) return ''
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const peak = vertexAt(i, n, actuals[i], chartMax, radius, center)
    const sCw = shoulderVertex(i, n, actuals[i], targets, chartMax, radius, center, 1)
    const next = (i + 1) % n
    const sCcwNext = shoulderVertex(next, n, actuals[next], targets, chartMax, radius, center, -1)
    parts.push(`${i === 0 ? 'M' : 'L'} ${peak.x},${peak.y}`)
    parts.push(`L ${sCw.x},${sCw.y}`)
    parts.push(`L ${sCcwNext.x},${sCcwNext.y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// One axis's filled slice: center → left chord-end → peak → right chord-end
// → center. Chord ends clamp to the neighbor wedge boundary radii so a
// large actual next to a small-target neighbor never bleeds past the
// bisector into the neighbor's wedge. Peak clamps at the swell's own
// target so the slice never overshoots its wedge — overshoot is read
// through the shoulder-polygon perimeter, not the per-axis fill.
// Returns empty path when there's nothing meaningful to render.
export function slicePath(
  index: number,
  actuals: number[],
  targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0 || chartMax <= 0) return ''
  const value = actuals[index]
  if (!isFinite(value) || value <= 0) return ''

  const targetR = (Math.min(Math.max(0, targets[index] ?? 0), chartMax) / chartMax) * radius
  const actualR = (Math.min(value, chartMax) / chartMax) * radius
  const fillR = Math.min(actualR, targetR)
  if (fillR < 4) return ''

  const prevIdx = (index - 1 + n) % n
  const leftBoundary = wedgeBoundary(prevIdx, targets, chartMax, radius, center)
  const rightBoundary = wedgeBoundary(index, targets, chartMax, radius, center)
  const leftBoundaryR = Math.hypot(leftBoundary.x - center.x, leftBoundary.y - center.y)
  const rightBoundaryR = Math.hypot(rightBoundary.x - center.x, rightBoundary.y - center.y)

  const half = Math.PI / n
  const a = axisAngleRad(index, n)
  const leftChordR = Math.min(fillR, leftBoundaryR)
  const rightChordR = Math.min(fillR, rightBoundaryR)

  const peakX = center.x + Math.cos(a) * fillR
  const peakY = center.y + Math.sin(a) * fillR
  const b1X = center.x + Math.cos(a - half) * leftChordR
  const b1Y = center.y + Math.sin(a - half) * leftChordR
  const b2X = center.x + Math.cos(a + half) * rightChordR
  const b2Y = center.y + Math.sin(a + half) * rightChordR

  return `M ${center.x},${center.y} L ${b1X},${b1Y} L ${peakX},${peakY} L ${b2X},${b2Y} Z`
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
// Scales tight to the actual data so users with low weekly targets don't
// see a pinhole polygon in the middle of an oversized chart — the floor
// still kicks in for empty / near-empty states.
export function chartCeiling(values: number[], config: ScaleConfig): number {
  const max = values.reduce((m, v) => (v > m ? v : m), 0)
  if (max <= 0) return config.floor
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

// HSL-based complementary color (hue + 180°). Input/output are #RRGGBB hex.
export function complementOf(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  h = (h + 0.5) % 1
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let ro: number, go: number, bo: number
  if (s === 0) {
    ro = go = bo = l
  } else {
    const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p2 = 2 * l - q2
    ro = hue2rgb(p2, q2, h + 1 / 3)
    go = hue2rgb(p2, q2, h)
    bo = hue2rgb(p2, q2, h - 1 / 3)
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  return `#${toHex(ro)}${toHex(go)}${toHex(bo)}`
}
