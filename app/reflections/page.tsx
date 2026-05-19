import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart, getWeekStart } from '@/lib/timezone'
import { formatPts, formatHrs } from '@/lib/format'
import {
  ceilDisplay,
  consecutiveZeroDayStreak,
  dayKeyRange,
  monthStartKey,
  pacificDayKey,
  weeksSinceFirstLog,
  type DayKey,
} from '@/lib/periods'
import { bonusBySwell, type WaypointHitRow, type OneShotCompletionRow } from '@/lib/waypoints'
import { currentRamp, type WelcomeBackMode } from '@/lib/welcomeback'
import { SwellRadar, type RadarSwell } from '@/app/components/SwellRadar'
import { LockedCadenceTile } from './components/LockedCadenceTile'
import type { BuildKey } from '@/lib/builds'

type Period = 'week' | 'month' | 'lifetime'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'lifetime', label: 'All time' },
]

function parsePeriod(raw: string | undefined): Period {
  return raw === 'week' || raw === 'month' || raw === 'lifetime' ? raw : 'week'
}

export default async function ReflectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period = parsePeriod(rawPeriod)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayStart = await getTodayStart()
  const weekStart = await getWeekStart()
  const todayKey = pacificDayKey(todayStart)
  const monthStart = monthStartKey(todayKey)

  const [
    { data: allLogs },
    { data: allWaveCheckins },
    { data: swells },
    { data: settings },
    { data: firstLogRow },
    { data: allWaypointHits },
    { data: allOneShotCompletions },
  ] = await Promise.all([
    supabase
      .from('logs')
      .select('points, hours, logged_at, motions(name, motion_swells(contribution_weight, swells(id, name, color)))')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false }),
    supabase
      .from('wave_checkins')
      .select('energy, alignment, duration_seconds, checked_in_at')
      .order('checked_in_at', { ascending: false }),
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('sort_order'),
    supabase
      .from('user_settings')
      .select('tracking_mode, primary_build, secondary_build, welcome_back_mode, welcome_back_started_at')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('milestone_hits')
      .select('hit_at, milestones(swell_id, bonus_points)')
      .eq('user_id', user.id),
    supabase
      .from('milestones')
      .select('swell_id, bonus_points, completed_at')
      .eq('user_id', user.id)
      .eq('kind', 'one_shot')
      .not('completed_at', 'is', null),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'
  const formatValue = (n: number) => (isHours ? formatHrs(ceilDisplay(n, true)) : formatPts(ceilDisplay(n)))
  const primaryBuild = (settings?.primary_build as BuildKey | null) ?? null
  const secondaryBuild = (settings?.secondary_build as BuildKey | null) ?? null
  const welcomeBackMode = (settings?.welcome_back_mode as WelcomeBackMode | null) ?? null
  const welcomeBackStartedKey = settings?.welcome_back_started_at
    ? pacificDayKey(settings.welcome_back_started_at as string)
    : null
  const weeklyRamp = currentRamp(welcomeBackMode, welcomeBackStartedKey, todayKey)

  const firstLogKey: DayKey | null = firstLogRow?.logged_at ? pacificDayKey(firstLogRow.logged_at) : null
  const weeksSince = weeksSinceFirstLog(firstLogKey, todayKey)

  // Period filtering against the unified all-logs fetch above.
  const weekStartMs = weekStart.getTime()
  const allLogsList = allLogs ?? []

  function inPeriod(log: { logged_at: string }, p: Period): boolean {
    if (p === 'lifetime') return true
    if (p === 'week') return new Date(log.logged_at).getTime() >= weekStartMs
    return pacificDayKey(log.logged_at) >= monthStart
  }

  type LogRow = typeof allLogsList[number]
  type MotionShape = {
    name?: string
    motion_swells?: {
      contribution_weight: number
      swells: { id: string; name: string; color: string } | null
    }[]
  } | null
  const readMotion = (log: LogRow): MotionShape =>
    (Array.isArray(log.motions) ? log.motions[0] : log.motions) as unknown as MotionShape

  function actualsFor(logs: LogRow[]): Map<string, number> {
    const acc = new Map<string, number>()
    swells?.forEach(s => acc.set(s.id, 0))
    for (const log of logs) {
      const motion = readMotion(log)
      motion?.motion_swells?.forEach(ms => {
        if (!ms.swells) return
        const weight = Number(ms.contribution_weight) || 1
        const inc = isHours ? Number(log.hours) * weight : Math.floor(log.points * weight)
        acc.set(ms.swells.id, (acc.get(ms.swells.id) ?? 0) + inc)
      })
    }
    return acc
  }

  const periodLogs = allLogsList.filter(l => inPeriod(l, period))
  const radarSourceLogs =
    period === 'week'
      ? allLogsList.filter(l => inPeriod(l, 'week'))
      : period === 'month'
      ? allLogsList.filter(l => inPeriod(l, 'month'))
      : allLogsList
  const radarActualsMap = actualsFor(radarSourceLogs)

  // Bonus points per swell for the active period. Filter raw hit/completion
  // rows by Pacific day key against the period window, then aggregate.
  // Points-mode only — bonus_points doesn't currency-translate to hours
  // (see ADR 0004 §7; the integer column can't carry 0.25-hr precision).
  const weekStartKey = pacificDayKey(weekStart)
  const periodStartKey: DayKey | null =
    period === 'week' ? weekStartKey : period === 'month' ? monthStart : null
  const filterByPeriodKey = <T extends { hit_at?: string; completed_at?: string | null }>(rows: T[], readAt: (r: T) => string | null | undefined): T[] => {
    if (!periodStartKey) return rows
    return rows.filter(r => {
      const at = readAt(r)
      if (!at) return false
      return pacificDayKey(at) >= periodStartKey
    })
  }
  const hitsInPeriod = filterByPeriodKey(
    (allWaypointHits ?? []) as WaypointHitRow[],
    h => h.hit_at,
  )
  const oneShotsInPeriod = filterByPeriodKey(
    (allOneShotCompletions ?? []) as OneShotCompletionRow[],
    m => m.completed_at,
  )
  const periodBonusBySwell = isHours
    ? new Map<string, number>()
    : bonusBySwell(hitsInPeriod, oneShotsInPeriod)
  for (const [swellId, bonus] of periodBonusBySwell) {
    radarActualsMap.set(swellId, (radarActualsMap.get(swellId) ?? 0) + bonus)
  }

  // Wave-month detection runs off the calendar-month log-day set.
  const monthLogs = period === 'month' ? radarSourceLogs : allLogsList.filter(l => inPeriod(l, 'month'))
  const monthLogDays = new Set<DayKey>()
  monthLogs.forEach(l => monthLogDays.add(pacificDayKey(l.logged_at)))
  const waveMonthStreak = consecutiveZeroDayStreak(monthLogDays, monthStart, todayKey)
  const waveMonthActive = waveMonthStreak >= 7

  // Welcome-back ramp drives the soft wash on week view. Month view uses
  // wave_month_active as its own binary gate (the calendar-month wash isn't
  // ramp-shaped). Lifetime never washes.
  const waveRamp: number | null =
    period === 'week' ? weeklyRamp : period === 'month' ? (waveMonthActive ? 1 : null) : null

  const radarSwells: RadarSwell[] = (swells ?? []).map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    target: (isHours ? s.target_hours : s.target_points) ?? 0,
  }))
  const radarActuals: number[] = (swells ?? []).map(s => radarActualsMap.get(s.id) ?? 0)

  const totalPoints = periodLogs.reduce((sum, l) => sum + l.points, 0)
  const totalHours = periodLogs.reduce((sum, l) => sum + Number(l.hours), 0)
  // Bonus accrues to swell totals; total stat should include it (points only).
  const periodBonusTotal = isHours
    ? 0
    : Array.from(periodBonusBySwell.values()).reduce((s, v) => s + v, 0)
  const totalValue = isHours ? totalHours : totalPoints + periodBonusTotal

  // Swells breakdown — period-filtered.
  const swellAccum = new Map<string, { name: string; color: string; points: number; hours: number }>()
  swells?.forEach(s => swellAccum.set(s.id, { name: s.name, color: s.color, points: 0, hours: 0 }))
  for (const log of periodLogs) {
    const motion = readMotion(log)
    motion?.motion_swells?.forEach(ms => {
      if (!ms.swells) return
      const weight = Number(ms.contribution_weight) || 1
      const existing = swellAccum.get(ms.swells.id)
      if (existing) {
        existing.points += Math.floor(log.points * weight)
        existing.hours += Number(log.hours) * weight
      }
    })
  }

  // Fold period-bonus into per-swell breakdown totals (points mode only).
  if (!isHours) {
    for (const [swellId, bonus] of periodBonusBySwell) {
      const existing = swellAccum.get(swellId)
      if (existing) existing.points += bonus
    }
  }

  const swellBreakdown = Array.from(swellAccum.values())
    .map(s => ({ ...s, value: isHours ? s.hours : s.points }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value)
  const maxSwellValue = swellBreakdown[0]?.value ?? 1

  // Daily chart: anchor to the calendar window. Week → weekStart..today,
  // month → 1st-of-month..today, lifetime → no chart.
  const dayMap = new Map<DayKey, number>()
  if (period !== 'lifetime') {
    const startKey: DayKey = period === 'week' ? pacificDayKey(weekStart) : monthStart
    for (const k of dayKeyRange(startKey, todayKey)) dayMap.set(k, 0)
  }
  for (const log of periodLogs) {
    const day = pacificDayKey(log.logged_at)
    if (dayMap.has(day)) {
      const inc = isHours ? Number(log.hours) : log.points
      dayMap.set(day, dayMap.get(day)! + inc)
    }
  }
  const days = Array.from(dayMap.entries())
  const maxDayValue = Math.max(...days.map(([, v]) => v), 1)

  const activeDays = days.filter(([, v]) => v > 0).length
  const avgValue = activeDays > 0 ? ceilDisplay(totalValue / activeDays, isHours) : 0

  const waveCheckins = period === 'lifetime'
    ? allWaveCheckins ?? []
    : (allWaveCheckins ?? []).filter(c => {
        if (period === 'week') return new Date(c.checked_in_at).getTime() >= weekStartMs
        return pacificDayKey(c.checked_in_at) >= monthStart
      })

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link href="/dashboard" className="hidden text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97] sm:inline">
            ← Back
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Reflections</h1>

        {radarSwells.length >= 3 && (
          <SwellRadar
            swells={radarSwells}
            actuals={radarActuals}
            period={period}
            primaryBuild={primaryBuild}
            secondaryBuild={secondaryBuild}
            trackingMode={trackingMode}
            waveRamp={waveRamp}
            weeksSinceFirstLog={weeksSince}
            todayKey={todayKey}
          />
        )}

        <div className="mb-8 flex gap-2">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <Link
              key={value}
              href={`/reflections?period=${value}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                period === value
                  ? 'border-th-text bg-th-text text-th-bg'
                  : 'border-th-border text-th-muted hover:bg-th-surface'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {totalValue === 0 ? (
          <p className="text-sm text-th-muted">No motions logged for this period.</p>
        ) : (
          <>
            {period !== 'lifetime' && (
              <div className="mb-8 grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{ceilDisplay(totalValue, isHours)}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                    {isHours ? 'hrs total' : 'pts total'}
                  </p>
                </div>
                <div className="rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{avgValue}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                    {isHours ? 'hrs / active day' : 'pts / active day'}
                  </p>
                </div>
                <div className="rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{activeDays}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                    active days
                  </p>
                </div>
              </div>
            )}

            {swellBreakdown.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">By swell</h2>
                <div className="flex flex-col gap-3">
                  {swellBreakdown.map(s => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="w-20 shrink-0 truncate text-xs text-th-secondary">{s.name}</span>
                      <div className="flex-1 rounded-full bg-th-surface" style={{ height: '6px' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(s.value / maxSwellValue) * 100}%`, backgroundColor: s.color }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-th-faint">{formatValue(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {period !== 'lifetime' && days.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">
                  {period === 'week' ? 'This week' : 'This month'}
                </h2>
                <div className="flex flex-col gap-2">
                  {days.map(([date, val]) => {
                    const d = new Date(date + 'T00:00:00Z')
                    const label =
                      period === 'week'
                        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                    return (
                      <div key={date} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-th-muted">{label}</span>
                        <div className="flex-1 rounded-full bg-th-surface" style={{ height: '6px' }}>
                          {val > 0 && (
                            <div
                              className="h-full rounded-full bg-th-btn"
                              style={{ width: `${(val / maxDayValue) * 100}%` }}
                            />
                          )}
                        </div>
                        <span className="w-14 text-right text-xs text-th-faint">
                          {val > 0 ? formatValue(val) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="mb-3 text-sm font-medium text-th-text">
                {period === 'lifetime' ? 'All activity' : 'Recent'}
              </h2>
              <div className="flex flex-col gap-2">
                {periodLogs.slice(0, 40).map((log, i) => {
                  const motion = readMotion(log)
                  const dateLabel = new Date(log.logged_at as string).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Los_Angeles',
                  })
                  const entryValue = isHours ? ceilDisplay(Number(log.hours), true) : log.points
                  return (
                    <div key={`${log.logged_at}-${i}`} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-th-border" />
                      <span className="flex-1 truncate text-xs text-th-muted">{motion?.name ?? '—'}</span>
                      <span className="text-xs text-th-faint">{dateLabel}</span>
                      <span className="w-12 text-right text-xs text-th-faint">+{entryValue}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {waveCheckins.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium text-th-text">Waves</h2>
                <div className="flex flex-col gap-3">
                  {waveCheckins.map((checkin, i) => {
                    const dateLabel = new Date(checkin.checked_in_at as string).toLocaleDateString(
                      'en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' },
                    )
                    const waveDays = checkin.duration_seconds
                      ? Math.round(checkin.duration_seconds / 86400)
                      : null
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="relative h-8 w-8 shrink-0 rounded border border-th-border bg-th-surface">
                          <div className="pointer-events-none absolute inset-0 flex items-center">
                            <div className="h-px w-full bg-th-border" />
                          </div>
                          <div className="pointer-events-none absolute inset-0 flex justify-center">
                            <div className="h-full w-px bg-th-border" />
                          </div>
                          <div
                            className="absolute h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-th-btn"
                            style={{
                              left: `${checkin.energy * 100}%`,
                              bottom: `${checkin.alignment * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-th-muted">{dateLabel}</p>
                          {waveDays !== null && (
                            <p className="text-xs text-th-faint">
                              {waveDays} day{waveDays !== 1 ? 's' : ''} away
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Locked-cadence anticipation tiles (ADR 0007). Vibe-only — blurred
           radar silhouettes + drifting tide lines, no dates, no counters.
           Unlock logic lands in a later session; for now everything past
           weekly stays locked. */}
        <div className="mt-12 flex flex-col gap-3 pb-12">
          <p className="text-[10px] uppercase tracking-widest text-th-muted">Coming together</p>
          <LockedCadenceTile cadence="month" />
          <LockedCadenceTile cadence="quarter" />
          <LockedCadenceTile cadence="year" />
        </div>
      </div>
    </div>
  )
}
