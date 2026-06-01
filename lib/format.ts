export function formatPts(n: number): string {
  return n === 1 ? '1 pt' : `${n} pts`
}

export function formatHrs(n: number): string {
  if (!isFinite(n) || n < 0) return '0:00'
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}
