import { axisAngleRad, type Point } from './radar'

// Wake polygon — the actuals-only outline for the locked Anchors page.
// Monochrome, no wedges, no targets. Just the shape of what the user did.

export function wakePolygonPath(
  actuals: number[],
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0) return ''
  const max = actuals.reduce((m, v) => (v > m ? v : m), 0)
  if (max <= 0) return ''

  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const r = (actuals[i] / max) * radius
    const angle = axisAngleRad(i, n)
    const x = center.x + Math.cos(angle) * r
    const y = center.y + Math.sin(angle) * r
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// Circle path for the blank-slate pulsing state (zero logs).
export function circlePath(
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const cx = center.x
  const cy = center.y
  return [
    `M ${cx},${cy - radius}`,
    `A ${radius},${radius} 0 1,1 ${cx},${cy + radius}`,
    `A ${radius},${radius} 0 1,1 ${cx},${cy - radius}`,
    'Z',
  ].join(' ')
}

// Interpolate between a circle and the wake polygon. t=0 is circle, t=1 is
// full polygon. Used for the coalesce-from-circle animation as the user logs.
export function interpolatedWakePath(
  actuals: number[],
  radius: number,
  t: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0) return circlePath(radius, center)
  const max = actuals.reduce((m, v) => (v > m ? v : m), 0)
  if (max <= 0) return circlePath(radius, center)

  const clampedT = Math.max(0, Math.min(1, t))
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const wakeR = (actuals[i] / max) * radius
    const circleR = radius
    const r = circleR + (wakeR - circleR) * clampedT
    const angle = axisAngleRad(i, n)
    const x = center.x + Math.cos(angle) * r
    const y = center.y + Math.sin(angle) * r
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

// Seeded random wake for marketing surfaces (postcards, landing page, Instagram).
// Deterministic: same seed + n always produces the same shape.
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

export function generateRandomWake(
  seed: number,
  n: number,
  radius: number = 70,
  center: Point = { x: 0, y: 0 },
): string {
  const rand = seededRandom(seed)
  const actuals = Array.from({ length: n }, () => 0.3 + rand() * 0.7)
  return wakePolygonPath(actuals, radius, center)
}
