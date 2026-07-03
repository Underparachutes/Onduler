// "Today" / "week start" as UTC Dates for a given IANA timezone, independent of
// the server's local zone. Default is America/Los_Angeles so untouched callers
// keep the app's historical Pacific behavior while the per-user-timezone
// migration (Phase B) threads the user's real zone through. See
// docs/specs/per-user-timezone-2026-07-03.md.

const DEFAULT_TZ = 'America/Los_Angeles'

// How far `tz` is ahead of UTC at `date`, in ms (e.g. New York in winter → -5h).
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, number> = {}
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10)
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
  return asUtc - date.getTime()
}

// Midnight of `dateStr` (YYYY-MM-DD) in `tz`, as a UTC Date. Solves for the UTC
// instant whose local wall clock is 00:00 on that date.
function zonedMidnight(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const guessUtc = Date.UTC(y, m - 1, d)
  const offset = tzOffsetMs(new Date(guessUtc), tz)
  return new Date(guessUtc - offset)
}

// Today's calendar date (YYYY-MM-DD) in `tz`.
function zonedToday(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

// Sunday (or `weeksBack` Sundays ago) of the week containing `dateStr`.
function sundayOf(dateStr: string, weeksBack = 0): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const jsDay = date.getDay()
  date.setDate(date.getDate() - jsDay - weeksBack * 7)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function getTodayStart(tz: string = DEFAULT_TZ): Promise<Date> {
  return zonedMidnight(zonedToday(tz), tz)
}

// Sunday 00:00 (local) of the current week (Sun–Sat cycle).
export async function getWeekStart(tz: string = DEFAULT_TZ): Promise<Date> {
  return zonedMidnight(sundayOf(zonedToday(tz)), tz)
}

// Sunday 00:00 (local) of the previous week.
export async function getLastWeekStart(tz: string = DEFAULT_TZ): Promise<Date> {
  return zonedMidnight(sundayOf(zonedToday(tz), 1), tz)
}
