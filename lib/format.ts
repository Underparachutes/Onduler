export function formatPts(n: number): string {
  return n === 1 ? '1 pt' : `${n} pts`
}

export function formatHrs(n: number): string {
  return n === 1 ? '1 hr' : `${n} hrs`
}
