// Geometry + scale helpers for the Logs radar (docs/logs-radar-spec.md).
// Pure functions only — no React, no DOM, no Supabase.

export type Currency = 'points' | 'hours'

export type Point = { x: number; y: number }

// Axes start at the top (-90°) and go clockwise. SVG y points down, so
// a clockwise visual rotation is increasing angle in the same sense.
export function axisAngleRad(index: number, count: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / count
}

// Vertex along an axis at a given value. minR provides a floor so
// zero-value vertices don't collapse to the center (keeps the polygon
// visible as a small rounded shape).
export function vertexAt(
  index: number,
  count: number,
  value: number,
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
  minR: number = 0,
): Point {
  const raw = chartMax <= 0 ? 0 : (Math.max(0, value) / chartMax) * radius
  const r = Math.max(raw, minR)
  const angle = axisAngleRad(index, count)
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
}

// Separator endpoint between axis `index` and axis `index+1`. Extends
// to the longer of the two adjacent target radii so the separator fully
// covers both wedge edges.
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
  const r = Math.max(rA, rB)
  const angle = axisAngleRad(index, count) + half
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }
}

// Independent pie-slice wedge for axis `index`. The shape is determined
// solely by this axis's target — adjacent targets have no effect.
// center → (R, axis−π/N) → (R, axis) → (R, axis+π/N) → center.
export function wedgePath(
  index: number,
  targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const count = targets.length
  if (count === 0 || chartMax <= 0) return ''
  const half = Math.PI / count
  const a = axisAngleRad(index, count)
  const R = (Math.max(0, targets[index]) / chartMax) * radius
  return [
    `M ${center.x},${center.y}`,
    `L ${center.x + Math.cos(a - half) * R},${center.y + Math.sin(a - half) * R}`,
    `L ${center.x + Math.cos(a) * R},${center.y + Math.sin(a) * R}`,
    `L ${center.x + Math.cos(a + half) * R},${center.y + Math.sin(a + half) * R}`,
    'Z',
  ].join(' ')
}

// Shoulder vertex on the bisector radial between axis `index` and its
// neighbor. `side`: +1 for CW (between i and i+1), -1 for CCW (between
// i and i-1). Radial distance is purely this axis's actual value — no
// clamping to neighbor wedge boundaries.
export function shoulderVertex(
  index: number,
  count: number,
  actualValue: number,
  _targets: number[],
  chartMax: number,
  radius: number,
  center: Point = { x: 0, y: 0 },
  side: number = 1,
  minR: number = 0,
): Point {
  if (count === 0 || chartMax <= 0) return center
  const half = Math.PI / count
  const angle = axisAngleRad(index, count) + side * half
  const raw = (Math.max(0, actualValue) / chartMax) * radius
  const r = Math.max(raw, minR)
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
  const minR = radius * 0.06
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const peak = vertexAt(i, n, actuals[i], chartMax, radius, center, minR)
    const sCw = shoulderVertex(i, n, actuals[i], targets, chartMax, radius, center, 1, minR)
    const next = (i + 1) % n
    const sCcwNext = shoulderVertex(next, n, actuals[next], targets, chartMax, radius, center, -1, minR)
    parts.push(`${i === 0 ? 'M' : 'L'} ${peak.x},${peak.y}`)
    parts.push(`L ${sCw.x},${sCw.y}`)
    parts.push(`L ${sCcwNext.x},${sCcwNext.y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// Independent filled slice for one axis. All three outer points use the
// same radius (min of actual and target), so the shape is a uniform
// pie-slice that doesn't depend on neighboring targets.
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

  const half = Math.PI / n
  const a = axisAngleRad(index, n)

  return [
    `M ${center.x},${center.y}`,
    `L ${center.x + Math.cos(a - half) * fillR},${center.y + Math.sin(a - half) * fillR}`,
    `L ${center.x + Math.cos(a) * fillR},${center.y + Math.sin(a) * fillR}`,
    `L ${center.x + Math.cos(a + half) * fillR},${center.y + Math.sin(a + half) * fillR}`,
    'Z',
  ].join(' ')
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
  floor: 1,
  hardCeiling: Infinity,
  overshootHeadroomPct: 0.85,
}

export const HOURS_SCALE: ScaleConfig = {
  initialCeiling: 10,
  floor: 0.5,
  hardCeiling: Infinity,
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
