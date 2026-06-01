import { axisAngleRad, type Point } from './radar'

// Wake polygon — 3N-vertex shoulder polygon. Each swell fills its own pie
// wedge independently: CCW shoulder and CW shoulder both at that swell's
// own radius. Adjacent swells at different heights create a radial step
// at the boundary — the high swell doesn't drag down the low one.

export function wakePolygonPath(
  actuals: number[],
  radius: number,
  center: Point = { x: 0, y: 0 },
): string {
  const n = actuals.length
  if (n === 0) return ''
  const max = actuals.reduce((m, v) => (v > m ? v : m), 0)
  if (max <= 0) return ''

  const minR = radius * 0.12
  const half = Math.PI / n
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.max((actuals[i] / max) * radius, minR)
    const axisAng = axisAngleRad(i, n)
    const ccwAng = axisAng - half
    const cwAng = axisAng + half

    const ccw = { x: center.x + Math.cos(ccwAng) * r, y: center.y + Math.sin(ccwAng) * r }
    const peak = { x: center.x + Math.cos(axisAng) * r, y: center.y + Math.sin(axisAng) * r }
    const cw = { x: center.x + Math.cos(cwAng) * r, y: center.y + Math.sin(cwAng) * r }

    parts.push(`${i === 0 ? 'M' : 'L'} ${ccw.x.toFixed(2)},${ccw.y.toFixed(2)}`)
    parts.push(`L ${peak.x.toFixed(2)},${peak.y.toFixed(2)}`)
    parts.push(`L ${cw.x.toFixed(2)},${cw.y.toFixed(2)}`)
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
// full polygon. Uses the same 3N-vertex shoulder geometry as wakePolygonPath.
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
  const minR = radius * 0.12
  const half = Math.PI / n
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const wakeR = Math.max((actuals[i] / max) * radius, minR)
    const r = radius + (wakeR - radius) * clampedT
    const axisAng = axisAngleRad(i, n)
    const ccwAng = axisAng - half
    const cwAng = axisAng + half

    parts.push(`${i === 0 ? 'M' : 'L'} ${(center.x + Math.cos(ccwAng) * r).toFixed(2)},${(center.y + Math.sin(ccwAng) * r).toFixed(2)}`)
    parts.push(`L ${(center.x + Math.cos(axisAng) * r).toFixed(2)},${(center.y + Math.sin(axisAng) * r).toFixed(2)}`)
    parts.push(`L ${(center.x + Math.cos(cwAng) * r).toFixed(2)},${(center.y + Math.sin(cwAng) * r).toFixed(2)}`)
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

export function wakeToSvg(
  seed: number,
  n: number,
  size: number = 400,
  bg: string = '#000000',
  stroke: string = '#e8e6e1',
): string {
  const r = size * 0.35
  const c: Point = { x: size / 2, y: size / 2 }
  const d = generateRandomWake(seed, n, r, c)
  const blurD = generateRandomWake(seed, n, r * 0.98, c)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `  <rect width="${size}" height="${size}" fill="${bg}"/>`,
    `  <defs><filter id="glow"><feGaussianBlur stdDeviation="${size * 0.02}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`,
    `  <path d="${blurD}" fill="${stroke}" fill-opacity="0.06" stroke="none" filter="url(#glow)"/>`,
    `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="0.8" opacity="0.55"/>`,
    `</svg>`,
  ].join('\n')
}
