// Calendar-month period helpers. See docs/decisions/0005-monthly-cycle-and-wave-month.md.
// Pure functions only — no React, no Supabase, no DOM. All date inputs are
// 'YYYY-MM-DD' calendar-date strings (DayKey); callers produce these from
// the user's local timezone (the project uses Pacific date keys throughout).

export type DayKey = string

const MS_PER_DAY = 86_400_000

function parts(key: DayKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m, d]
}

function toUtcMs(key: DayKey): number {
  const [y, m, d] = parts(key)
  return Date.UTC(y, m - 1, d)
}

function fromUtcMs(ms: number): DayKey {
  const d = new Date(ms)
  const yy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// Days in the calendar month containing `key` (28, 29, 30, or 31).
export function daysInMonth(key: DayKey): number {
  const [y, m] = parts(key)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

// First-of-month day key for the month containing `key`.
export function monthStartKey(key: DayKey): DayKey {
  const [y, m] = parts(key)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

// Inclusive day diff (to - from) in calendar days. Negative if to < from.
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

// ceil(days_since / 7). Same-day → 0; drives the lifetime absolute-display
// fallback (display ratio only when result > 1). Returns 0 when firstLog
// is missing — a user with no logs has no lifetime ratio to show.
export function weeksSinceFirstLog(firstLog: DayKey | null, today: DayKey): number {
  if (!firstLog) return 0
  const diff = daysBetween(firstLog, today)
  if (diff <= 0) return 0
  return Math.ceil(diff / 7)
}

// Inclusive day keys from `startKey` to `endKey`, in calendar order.
export function dayKeyRange(startKey: DayKey, endKey: DayKey): DayKey[] {
  const startMs = toUtcMs(startKey)
  const endMs = toUtcMs(endKey)
  if (endMs < startMs) return []
  const out: DayKey[] = []
  for (let ms = startMs; ms <= endMs; ms += MS_PER_DAY) {
    out.push(fromUtcMs(ms))
  }
  return out
}

// Longest consecutive zero-log streak inside [windowStart, windowEnd]
// inclusive, in days. `loggedDayKeys` is the set of day keys that had at
// least one log. Days outside the window are ignored.
export function consecutiveZeroDayStreak(
  loggedDayKeys: Set<DayKey>,
  windowStart: DayKey,
  windowEnd: DayKey,
): number {
  let longest = 0
  let run = 0
  for (const key of dayKeyRange(windowStart, windowEnd)) {
    if (loggedDayKeys.has(key)) {
      run = 0
    } else {
      run += 1
      if (run > longest) longest = run
    }
  }
  return longest
}

// ceil for display. Negative or non-finite → 0. Points mode rounds up to
// whole units; hours mode rounds up to 0.25 (15-min granularity), then callers
// format via formatHrs() for HH:MM display. ADR 0005 §6.
export function ceilDisplay(n: number, isHours: boolean = false): number {
  if (!isFinite(n) || n <= 0) return 0
  return isHours ? Math.ceil(n * 4) / 4 : Math.ceil(n)
}

// ceil(weekly_target × days_in_month / 7) for the month containing `today`.
// Display-only — weekly target stays the source of truth.
export function monthlyTargetDisplay(weeklyTarget: number, today: DayKey, isHours: boolean = false): number {
  if (!isFinite(weeklyTarget) || weeklyTarget <= 0) return 0
  return ceilDisplay((weeklyTarget * daysInMonth(today)) / 7, isHours)
}

// ceil(weekly_target × weeks_since_first_log). Display-only.
export function lifetimeTargetDisplay(weeklyTarget: number, weeksSince: number, isHours: boolean = false): number {
  if (!isFinite(weeklyTarget) || weeklyTarget <= 0) return 0
  if (!isFinite(weeksSince) || weeksSince <= 0) return 0
  return ceilDisplay(weeklyTarget * weeksSince, isHours)
}

export function daysInQuarter(key: DayKey): number {
  const [y, m] = parts(key)
  const q = Math.floor((m - 1) / 3)
  const startMonth = q * 3 + 1
  const endMonth = startMonth + 3
  return Math.round((Date.UTC(y, endMonth - 1, 1) - Date.UTC(y, startMonth - 1, 1)) / MS_PER_DAY)
}

export function daysInYear(key: DayKey): number {
  const [y] = parts(key)
  return Math.round((Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / MS_PER_DAY)
}

export function quarterStartKey(key: DayKey): DayKey {
  const [y, m] = parts(key)
  const q = Math.floor((m - 1) / 3)
  const startMonth = q * 3 + 1
  return `${y}-${String(startMonth).padStart(2, '0')}-01`
}

export function yearStartKey(key: DayKey): DayKey {
  const [y] = parts(key)
  return `${y}-01-01`
}

export function quarterlyTargetDisplay(weeklyTarget: number, today: DayKey, isHours: boolean = false): number {
  if (!isFinite(weeklyTarget) || weeklyTarget <= 0) return 0
  return ceilDisplay((weeklyTarget * daysInQuarter(today)) / 7, isHours)
}

export function yearlyTargetDisplay(weeklyTarget: number, today: DayKey, isHours: boolean = false): number {
  if (!isFinite(weeklyTarget) || weeklyTarget <= 0) return 0
  return ceilDisplay((weeklyTarget * daysInYear(today)) / 7, isHours)
}

export function addDays(key: DayKey, n: number): DayKey {
  return fromUtcMs(toUtcMs(key) + n * MS_PER_DAY)
}

export function sundayOf(key: DayKey): DayKey {
  const ms = toUtcMs(key)
  const jsDay = new Date(ms).getUTCDay()
  return fromUtcMs(ms - jsDay * MS_PER_DAY)
}

export function monthEndKey(key: DayKey): DayKey {
  const [y, m] = parts(key)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export function quarterEndKey(key: DayKey): DayKey {
  const [y, m] = parts(key)
  const q = Math.floor((m - 1) / 3)
  const endMonth = (q + 1) * 3
  const lastDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate()
  return `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// Parse hours input accepting both HH:MM ("0:30") and decimal ("0.5") forms.
// Returns the float value or null if the input is invalid.
export function parseHoursInput(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.includes(':')) {
    const [hStr, mStr] = trimmed.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    if (isNaN(h) || isNaN(m) || h < 0 || m < 0 || m >= 60) return null
    return h + m / 60
  }
  const n = parseFloat(trimmed)
  return isNaN(n) || n < 0 ? null : n
}

// Calendar day key (YYYY-MM-DD) for a timestamp, in the given IANA timezone.
// Per-tz Intl formatters are cached so tight loops don't re-instantiate.
const dayFmtCache = new Map<string, Intl.DateTimeFormat>()
function dayFmt(tz: string): Intl.DateTimeFormat {
  let f = dayFmtCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    dayFmtCache.set(tz, f)
  }
  return f
}

export function dayKey(loggedAt: string | Date, tz: string = 'America/Los_Angeles'): DayKey {
  return dayFmt(tz).format(typeof loggedAt === 'string' ? new Date(loggedAt) : loggedAt)
}

// Sunday (week start) day key for the week containing `loggedAt`, in `tz`.
export function sundayKey(loggedAt: string | Date, tz: string = 'America/Los_Angeles'): DayKey {
  return sundayOf(dayKey(loggedAt, tz))
}

// Deprecated alias — Pacific-hardcoded. Being replaced by dayKey(ts, tz) as the
// per-user-timezone migration (Phase B) threads the user's zone through call
// sites. See docs/specs/per-user-timezone-2026-07-03.md.
export function pacificDayKey(loggedAt: string | Date): DayKey {
  return dayKey(loggedAt, 'America/Los_Angeles')
}
