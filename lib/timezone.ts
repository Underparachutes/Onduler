// Midnight Pacific as a UTC Date, independent of the system's local timezone.
// Tries PDT (UTC-7) first, then PST (UTC-8).
function pacificMidnightOf(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const pdt = new Date(Date.UTC(y, m - 1, d, 7))
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' })
  if (fmt.format(pdt) === dateStr) return pdt
  return new Date(Date.UTC(y, m - 1, d, 8))
}

function pacificToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(new Date())
}

function mondayOf(dateStr: string, weeksBack = 0): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const jsDay = date.getDay()
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  date.setDate(date.getDate() - daysSinceMonday - weeksBack * 7)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function getTodayStart(): Promise<Date> {
  return pacificMidnightOf(pacificToday())
}

// Monday 00:00 Pacific of the current week (Mon–Sun cycle)
export async function getWeekStart(): Promise<Date> {
  return pacificMidnightOf(mondayOf(pacificToday()))
}

// Monday 00:00 Pacific of the previous week
export async function getLastWeekStart(): Promise<Date> {
  return pacificMidnightOf(mondayOf(pacificToday(), 1))
}
