import { describe, it, expect } from 'vitest'
import {
  thisWeekSunday,
  closedWeekFor,
  closedMonthFor,
  closedQuarterFor,
  closedYearFor,
  closedCycleFor,
  cycleContaining,
  daysInCycle,
  formatWeekLabel,
  formatMonthLabel,
  formatQuarterLabel,
  formatYearLabel,
  formatCycleLabel,
} from './cycles'

// Fixed reference dates (all verified against a calendar):
//   2025-05-27 was a Tuesday (the example in closedWeekFor's doc comment)
//   2026-07-04 is a Saturday, so 2026-06-28 is its Sunday
//   2024 was a leap year; 2026 is not

describe('thisWeekSunday', () => {
  it('returns the day itself when it is a Sunday', () => {
    expect(thisWeekSunday('2026-06-28')).toBe('2026-06-28')
  })

  it('walks a mid-week day back to its Sunday', () => {
    expect(thisWeekSunday('2025-05-27')).toBe('2025-05-25')
  })

  it('walks a Saturday back six days', () => {
    expect(thisWeekSunday('2026-07-04')).toBe('2026-06-28')
  })

  it('crosses a month boundary', () => {
    // 2026-07-01 is a Wednesday; its Sunday is in June.
    expect(thisWeekSunday('2026-07-01')).toBe('2026-06-28')
  })

  it('crosses a year boundary', () => {
    // 2026-01-01 is a Thursday; its Sunday is 2025-12-28.
    expect(thisWeekSunday('2026-01-01')).toBe('2025-12-28')
  })
})

describe('closedWeekFor', () => {
  it('matches the doc example: Tuesday May 27 closes Sun May 18 – Sat May 24', () => {
    expect(closedWeekFor('2025-05-27')).toEqual({ cycleStart: '2025-05-18', cycleEnd: '2025-05-24' })
  })

  it('on a Sunday, the closed week ends yesterday', () => {
    expect(closedWeekFor('2026-06-28')).toEqual({ cycleStart: '2026-06-21', cycleEnd: '2026-06-27' })
  })

  it('always spans exactly 7 days', () => {
    expect(daysInCycle(closedWeekFor('2026-07-04'))).toBe(7)
  })
})

describe('closedMonthFor', () => {
  it('returns the prior calendar month', () => {
    expect(closedMonthFor('2026-05-18')).toEqual({ cycleStart: '2026-04-01', cycleEnd: '2026-04-30' })
  })

  it('wraps January back to December of the prior year', () => {
    expect(closedMonthFor('2026-01-15')).toEqual({ cycleStart: '2025-12-01', cycleEnd: '2025-12-31' })
  })

  it('ends leap-year February on the 29th', () => {
    expect(closedMonthFor('2024-03-10')).toEqual({ cycleStart: '2024-02-01', cycleEnd: '2024-02-29' })
  })

  it('ends non-leap February on the 28th', () => {
    expect(closedMonthFor('2026-03-10')).toEqual({ cycleStart: '2026-02-01', cycleEnd: '2026-02-28' })
  })
})

describe('closedQuarterFor', () => {
  it('returns the prior quarter within the same year', () => {
    expect(closedQuarterFor('2026-05-18')).toEqual({ cycleStart: '2026-01-01', cycleEnd: '2026-03-31' })
  })

  it('wraps Q1 back to Q4 of the prior year', () => {
    expect(closedQuarterFor('2026-02-10')).toEqual({ cycleStart: '2025-10-01', cycleEnd: '2025-12-31' })
  })

  it('handles each quarter start month', () => {
    expect(closedQuarterFor('2026-07-04')).toEqual({ cycleStart: '2026-04-01', cycleEnd: '2026-06-30' })
    expect(closedQuarterFor('2026-11-20')).toEqual({ cycleStart: '2026-07-01', cycleEnd: '2026-09-30' })
  })
})

describe('closedYearFor', () => {
  it('returns the prior calendar year', () => {
    expect(closedYearFor('2026-05-18')).toEqual({ cycleStart: '2025-01-01', cycleEnd: '2025-12-31' })
  })
})

describe('closedCycleFor dispatcher', () => {
  it('routes each cadence to its helper', () => {
    const today = '2026-07-04'
    expect(closedCycleFor(today, 'week')).toEqual(closedWeekFor(today))
    expect(closedCycleFor(today, 'month')).toEqual(closedMonthFor(today))
    expect(closedCycleFor(today, 'quarter')).toEqual(closedQuarterFor(today))
    expect(closedCycleFor(today, 'year')).toEqual(closedYearFor(today))
  })
})

describe('cycleContaining', () => {
  it('week: contains the day, Sunday-anchored', () => {
    expect(cycleContaining('2026-07-04', 'week')).toEqual({ cycleStart: '2026-06-28', cycleEnd: '2026-07-04' })
    // A Sunday starts its own week.
    expect(cycleContaining('2026-06-28', 'week')).toEqual({ cycleStart: '2026-06-28', cycleEnd: '2026-07-04' })
  })

  it('month: the calendar month of the day, leap-aware', () => {
    expect(cycleContaining('2024-02-15', 'month')).toEqual({ cycleStart: '2024-02-01', cycleEnd: '2024-02-29' })
    expect(cycleContaining('2026-02-15', 'month')).toEqual({ cycleStart: '2026-02-01', cycleEnd: '2026-02-28' })
  })

  it('quarter: the calendar quarter of the day', () => {
    expect(cycleContaining('2026-07-04', 'quarter')).toEqual({ cycleStart: '2026-07-01', cycleEnd: '2026-09-30' })
    expect(cycleContaining('2026-12-31', 'quarter')).toEqual({ cycleStart: '2026-10-01', cycleEnd: '2026-12-31' })
  })

  it('year: the calendar year of the day', () => {
    expect(cycleContaining('2026-07-04', 'year')).toEqual({ cycleStart: '2026-01-01', cycleEnd: '2026-12-31' })
  })
})

describe('daysInCycle', () => {
  it('counts inclusively', () => {
    expect(daysInCycle({ cycleStart: '2026-06-28', cycleEnd: '2026-07-04' })).toBe(7)
    expect(daysInCycle({ cycleStart: '2026-07-04', cycleEnd: '2026-07-04' })).toBe(1)
  })

  it('knows leap years', () => {
    expect(daysInCycle({ cycleStart: '2024-01-01', cycleEnd: '2024-12-31' })).toBe(366)
    expect(daysInCycle({ cycleStart: '2026-01-01', cycleEnd: '2026-12-31' })).toBe(365)
  })

  it('quarter lengths differ by quarter', () => {
    expect(daysInCycle(cycleContaining('2026-02-01', 'quarter'))).toBe(90) // Q1 non-leap
    expect(daysInCycle(cycleContaining('2024-02-01', 'quarter'))).toBe(91) // Q1 leap
    expect(daysInCycle(cycleContaining('2026-08-01', 'quarter'))).toBe(92) // Q3
  })
})

describe('labels', () => {
  it('formats a week span', () => {
    expect(formatWeekLabel({ cycleStart: '2025-05-11', cycleEnd: '2025-05-17' })).toBe('May 11 – May 17')
  })

  it('formats month, quarter, and year', () => {
    expect(formatMonthLabel({ cycleStart: '2026-04-01', cycleEnd: '2026-04-30' })).toBe('April 2026')
    expect(formatQuarterLabel({ cycleStart: '2026-01-01', cycleEnd: '2026-03-31' })).toBe('Q1 2026')
    expect(formatYearLabel({ cycleStart: '2025-01-01', cycleEnd: '2025-12-31' })).toBe('2025')
  })

  it('dispatches by cadence', () => {
    expect(formatCycleLabel({ cycleStart: '2025-05-11', cycleEnd: '2025-05-17' }, 'week')).toBe('May 11 – May 17')
    expect(formatCycleLabel({ cycleStart: '2026-04-01', cycleEnd: '2026-04-30' }, 'month')).toBe('April 2026')
    expect(formatCycleLabel({ cycleStart: '2026-01-01', cycleEnd: '2026-03-31' }, 'quarter')).toBe('Q1 2026')
    expect(formatCycleLabel({ cycleStart: '2025-01-01', cycleEnd: '2025-12-31' }, 'year')).toBe('2025')
  })
})
