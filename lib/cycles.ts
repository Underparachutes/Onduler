// Ceremony cycle helpers (ADR 0007). Pure date math on Pacific day keys.
// Weekly cycle is Mon → Sun (per project memory: cycle *ends* Sunday). A
// cycle "closes" when its Sunday end-date is in the past relative to today.

import { type DayKey } from './periods'

const MS_PER_DAY = 86_400_000

function partsOf(key: DayKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m, d]
}

function toUtcMs(key: DayKey): number {
  const [y, m, d] = partsOf(key)
  return Date.UTC(y, m - 1, d)
}

function fromUtcMs(ms: number): DayKey {
  const d = new Date(ms)
  const yy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// Monday on-or-before `today`, as a DayKey. `today` is a Pacific calendar
// date (the rest of the app already produces these from pacificDayKey).
export function thisWeekMonday(today: DayKey): DayKey {
  const ms = toUtcMs(today)
  const jsDay = new Date(ms).getUTCDay() // 0=Sun, 1=Mon, ...
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  return fromUtcMs(ms - daysSinceMonday * MS_PER_DAY)
}

export type WeekCycle = { cycleStart: DayKey; cycleEnd: DayKey }

// The just-closed week: Mon and Sun of the prior Mon→Sun span. If `today`
// is Tuesday May 19, the closed week is Mon May 11 → Sun May 17.
export function closedWeekFor(today: DayKey): WeekCycle {
  const monThisMs = toUtcMs(thisWeekMonday(today))
  return {
    cycleStart: fromUtcMs(monThisMs - 7 * MS_PER_DAY),
    cycleEnd: fromUtcMs(monThisMs - MS_PER_DAY),
  }
}

// Human-facing label for a closed week, e.g. "May 11 – May 17". Uses the
// caller's `Intl` to localize. Pure — no clock reads.
export function formatWeekLabel(cycle: WeekCycle, locale: string = 'en-US'): string {
  const start = new Date(toUtcMs(cycle.cycleStart))
  const end = new Date(toUtcMs(cycle.cycleEnd))
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}
