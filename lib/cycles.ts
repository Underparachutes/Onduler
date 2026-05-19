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

export type Cycle = { cycleStart: DayKey; cycleEnd: DayKey }

// The just-closed calendar month: 1st through last-day of the month before
// the month containing `today`. May 18 → Apr 1 – Apr 30.
export function closedMonthFor(today: DayKey): Cycle {
  const [y, m] = partsOf(today)
  // Previous month: subtract one from m, wrap to prior year if needed.
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  const lastDay = new Date(Date.UTC(py, pm, 0)).getUTCDate() // day 0 of next month
  const mm = String(pm).padStart(2, '0')
  return {
    cycleStart: `${py}-${mm}-01`,
    cycleEnd: `${py}-${mm}-${String(lastDay).padStart(2, '0')}`,
  }
}

// The just-closed calendar quarter: Q1=Jan–Mar, Q2=Apr–Jun, Q3=Jul–Sep,
// Q4=Oct–Dec. May 18 (Q2) → Q1 of same year (Jan 1 – Mar 31).
export function closedQuarterFor(today: DayKey): Cycle {
  const [y, m] = partsOf(today)
  const thisQ = Math.floor((m - 1) / 3) // 0..3
  const prevQ = thisQ === 0 ? 3 : thisQ - 1
  const prevYear = thisQ === 0 ? y - 1 : y
  const startMonth = prevQ * 3 + 1
  const endMonth = startMonth + 2
  const endDay = new Date(Date.UTC(prevYear, endMonth, 0)).getUTCDate()
  return {
    cycleStart: `${prevYear}-${String(startMonth).padStart(2, '0')}-01`,
    cycleEnd: `${prevYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  }
}

// The just-closed calendar year. May 2026 → Jan 1 – Dec 31 2025.
export function closedYearFor(today: DayKey): Cycle {
  const [y] = partsOf(today)
  const py = y - 1
  return { cycleStart: `${py}-01-01`, cycleEnd: `${py}-12-31` }
}

// Human-facing label for non-weekly cycles. "April 2026", "Q1 2026", "2025".
export function formatMonthLabel(cycle: Cycle, locale: string = 'en-US'): string {
  const start = new Date(toUtcMs(cycle.cycleStart))
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return fmt.format(start)
}

export function formatQuarterLabel(cycle: Cycle): string {
  const [y, m] = partsOf(cycle.cycleStart)
  const q = Math.floor((m - 1) / 3) + 1
  return `Q${q} ${y}`
}

export function formatYearLabel(cycle: Cycle): string {
  const [y] = partsOf(cycle.cycleStart)
  return String(y)
}

export type Cadence = 'week' | 'month' | 'quarter' | 'year'

// Cycle containing `day`, for the given cadence. Useful for bucketing logs
// into their cycle of origin.
export function cycleContaining(day: DayKey, cadence: Cadence): Cycle {
  if (cadence === 'week') {
    const monMs = toUtcMs(thisWeekMonday(day))
    const sunMs = monMs + 6 * MS_PER_DAY
    return { cycleStart: fromUtcMs(monMs), cycleEnd: fromUtcMs(sunMs) }
  }
  const [y, m] = partsOf(day)
  if (cadence === 'month') {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const mm = String(m).padStart(2, '0')
    return { cycleStart: `${y}-${mm}-01`, cycleEnd: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` }
  }
  if (cadence === 'quarter') {
    const q = Math.floor((m - 1) / 3)
    const startMonth = q * 3 + 1
    const endMonth = startMonth + 2
    const endDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate()
    return {
      cycleStart: `${y}-${String(startMonth).padStart(2, '0')}-01`,
      cycleEnd: `${y}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    }
  }
  // year
  return { cycleStart: `${y}-01-01`, cycleEnd: `${y}-12-31` }
}
