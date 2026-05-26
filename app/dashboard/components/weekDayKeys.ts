export function getWeekDayKeys(offset: number): string[] {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const jsDay = now.getDay()
  const daysSinceSun = jsDay
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - daysSinceSun + (offset * 7))
  const keys: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    keys.push(`${y}-${m}-${day}`)
  }
  return keys
}
