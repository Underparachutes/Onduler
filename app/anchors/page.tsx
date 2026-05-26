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
  quarterStartKey,
  yearStartKey,
  type DayKey,
} from '@/lib/periods'
import { bonusBySwell, type WaypointHitRow, type OneShotCompletionRow } from '@/lib/waypoints'
import { currentRamp, type WelcomeBackMode } from '@/lib/welcomeback'
import { SwellRadar, type RadarSwell } from '@/app/components/SwellRadar'
import { LockedCadenceTile } from './components/LockedCadenceTile'
import { WaveField, type WaveLine } from '@/app/components/WaveField'
import { LockedPage } from './components/LockedPage'
import { getActiveChapterId } from '@/lib/chapters'
import { getCeremonyState, getUnlockState, type CeremonyState } from '@/app/actions/reflections'
import { formatCycleLabel, type Cadence } from '@/lib/cycles'
import type { BuildKey } from '@/lib/builds'
import { HintCard } from '@/app/components/HintCard'
import { markHintSeen } from '@/app/actions/settings'

type CeremonyResult = { state: CeremonyState; cycleStart: string; cycleEnd: string; chapterId: string | null }

const COMING_TOGETHER_WAVES: WaveLine[] = [
  { yBase: 0.18, amplitude: 10, frequency: 0.020, speed: 0.0012, phase: 0.0, width: 0.5, opacity: 0.05 },
  { yBase: 0.21, amplitude: 12, frequency: 0.030, speed: 0.0038, phase: 1.2, width: 0.5, opacity: 0.06 },
  { yBase: 0.24, amplitude: 11, frequency: 0.025, speed: 0.0022, phase: 2.8, width: 0.6, opacity: 0.07 },
  { yBase: 0.28, amplitude: 12, frequency: 0.022, speed: 0.0045, phase: 0.5, width: 0.6, opacity: 0.08 },
  { yBase: 0.31, amplitude: 14, frequency: 0.032, speed: 0.0015, phase: 1.8, width: 0.7, opacity: 0.09 },
  { yBase: 0.34, amplitude: 13, frequency: 0.027, speed: 0.0032, phase: 3.4, width: 0.7, opacity: 0.10 },
  { yBase: 0.38, amplitude: 14, frequency: 0.024, speed: 0.0050, phase: 0.9, width: 0.8, opacity: 0.13 },
  { yBase: 0.41, amplitude: 16, frequency: 0.034, speed: 0.0018, phase: 2.2, width: 0.8, opacity: 0.15 },
  { yBase: 0.44, amplitude: 15, frequency: 0.028, speed: 0.0040, phase: 4.0, width: 0.9, opacity: 0.17 },
  { yBase: 0.48, amplitude: 16, frequency: 0.020, speed: 0.0014, phase: 1.4, width: 1.0, opacity: 0.19 },
  { yBase: 0.51, amplitude: 18, frequency: 0.030, speed: 0.0048, phase: 2.8, width: 1.0, opacity: 0.21 },
  { yBase: 0.54, amplitude: 17, frequency: 0.025, speed: 0.0028, phase: 0.3, width: 1.1, opacity: 0.23 },
  { yBase: 0.58, amplitude: 18, frequency: 0.022, speed: 0.0055, phase: 1.9, width: 1.2, opacity: 0.26 },
  { yBase: 0.61, amplitude: 20, frequency: 0.032, speed: 0.0020, phase: 3.2, width: 1.3, opacity: 0.29 },
  { yBase: 0.64, amplitude: 19, frequency: 0.026, speed: 0.0042, phase: 0.7, width: 1.4, opacity: 0.32 },
  { yBase: 0.68, amplitude: 20, frequency: 0.018, speed: 0.0016, phase: 2.5, width: 1.6, opacity: 0.35 },
  { yBase: 0.71, amplitude: 22, frequency: 0.028, speed: 0.0052, phase: 0.1, width: 1.7, opacity: 0.38 },
  { yBase: 0.74, amplitude: 21, frequency: 0.023, speed: 0.0035, phase: 3.8, width: 1.8, opacity: 0.41 },
  { yBase: 0.78, amplitude: 22, frequency: 0.020, speed: 0.0058, phase: 1.6, width: 2.0, opacity: 0.44 },
  { yBase: 0.81, amplitude: 24, frequency: 0.030, speed: 0.0024, phase: 3.0, width: 2.2, opacity: 0.47 },
  { yBase: 0.84, amplitude: 23, frequency: 0.024, speed: 0.0046, phase: 0.4, width: 2.3, opacity: 0.50 },
  { yBase: 0.88, amplitude: 24, frequency: 0.016, speed: 0.0030, phase: 2.2, width: 2.6, opacity: 0.53 },
  { yBase: 0.92, amplitude: 26, frequency: 0.026, speed: 0.0060, phase: 0.8, width: 2.8, opacity: 0.56 },
  { yBase: 0.96, amplitude: 28, frequency: 0.021, speed: 0.0019, phase: 3.5, width: 3.2, opacity: 0.60 },
]

const CADENCES: Cadence[] = ['week', 'month', 'quarter', 'year']
const CADENCE_LABEL: Record<Cadence, string> = {
  week: 'Last week',
  month: 'Last month',
  quarter: 'Last quarter',
  year: 'Last year',
}

type Period = 'week' | 'month' | 'quarter' | 'year'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]

function parsePeriod(raw: string | undefined): Period {
  return raw === 'week' || raw === 'month' || raw === 'quarter' || raw === 'year' ? raw : 'week'
}

function periodDateLabel(todayKey: DayKey, period: Period, weekStart: Date): string {
  const [y, m] = todayKey.split('-').map(Number)
  if (period === 'week') {
    return `Week of ${weekStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })}`
  }
  if (period === 'month') {
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
  if (period === 'quarter') {
    const q = Math.floor((m - 1) / 3)
    const startMonthIdx = q * 3
    const endMonthIdx = startMonthIdx + 2
    const startName = new Date(Date.UTC(y, startMonthIdx, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
    const endName = new Date(Date.UTC(y, endMonthIdx, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
    return `${startName}-${endName} ${y}`
  }
  return String(y)
}

export default async function AnchorsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  let period = parsePeriod(rawPeriod)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [chapterId, todayStart, weekStart] = await Promise.all([
    getActiveChapterId(supabase, user.id),
    getTodayStart(),
    getWeekStart(),
  ])
  const todayKey = pacificDayKey(todayStart)
  const monthStart = monthStartKey(todayKey)

  const [ceremonies, unlocks] = await Promise.all([
    Promise.all(CADENCES.map(c => getCeremonyState(supabase, user.id, c, todayKey))) as Promise<CeremonyResult[]>,
    getUnlockState(supabase, user.id, todayKey),
  ])
  const ceremonyByCadence: Record<Cadence, CeremonyResult> = {
    week: ceremonies[0], month: ceremonies[1], quarter: ceremonies[2], year: ceremonies[3],
  }
  const pendingCadences: Cadence[] = CADENCES.filter(c => ceremonyByCadence[c].state === 'pending')

  if (!unlocks[period]) period = 'week'

  // Wave detection: 72+ hours since last log with no wave_checkin after.
  const { data: lastLogRow } = await supabase
    .from('logs')
    .select('logged_at')
    .eq('chapter_id', chapterId)
    .order('logged_at', { ascending: false })
    .limit(1)
  let inWave = false
  if (lastLogRow?.[0]) {
    const hoursSince = (Date.now() - new Date(lastLogRow[0].logged_at).getTime()) / 3_600_000
    if (hoursSince >= 72) {
      const { data: checkin } = await supabase
        .from('wave_checkins')
        .select('id')
        .eq('chapter_id', chapterId)
        .gt('checked_in_at', lastLogRow[0].logged_at)
        .limit(1)
      inWave = !checkin || checkin.length === 0
    }
  }

  // Weekly is the gate. Until the user has lived through a full Sun-Sat
  // with the engagement floor met, /anchors is vibe-only mystery.
  // Even locked, fetch this week's swell actuals so the Wake renders live data.
  if (!unlocks.week) {
    const [{ data: lockSwells }, { data: lockLogs }] = await Promise.all([
      supabase
        .from('swells')
        .select('id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .eq('hidden', false)
        .order('sort_order'),
      supabase
        .from('logs')
        .select('points, hours, logged_at, motions(motion_swells(contribution_weight, swells(id)))')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .gte('logged_at', weekStart.toISOString()),
    ])
    const { data: lockSettings } = await supabase
      .from('user_settings')
      .select('tracking_mode, hints_seen')
      .eq('user_id', user.id)
      .single()
    const lockIsHours = lockSettings?.tracking_mode === 'hours'
    const lockHintsSeen = (lockSettings?.hints_seen as Record<string, boolean>) ?? {}
    const lockActuals = new Map<string, number>()
    lockSwells?.forEach(s => lockActuals.set(s.id, 0))
    for (const log of lockLogs ?? []) {
      const motion = Array.isArray(log.motions) ? log.motions[0] : log.motions
      const ms = (motion as any)?.motion_swells as { contribution_weight: number; swells: { id: string } | null }[] | undefined
      ms?.forEach(link => {
        if (!link.swells) return
        const w = Number(link.contribution_weight) || 1
        const inc = lockIsHours ? Number(log.hours) * w : Math.floor(log.points * w)
        lockActuals.set(link.swells.id, (lockActuals.get(link.swells.id) ?? 0) + inc)
      })
    }
    const wakeActuals = (lockSwells ?? []).map(s => lockActuals.get(s.id) ?? 0)
    return <LockedPage actuals={wakeActuals} inWave={inWave} hintSeen={!!lockHintsSeen.anchors_locked} />
  }

  const [
    { data: allLogs },
    { data: allWaveCheckins },
    { data: swells },
    { data: settings },
    { data: allWaypointHits },
    { data: allOneShotCompletions },
  ] = await Promise.all([
    supabase
      .from('logs')
      .select('points, hours, logged_at, motions(name, motion_swells(contribution_weight, swells(id, name, color)))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('logged_at', { ascending: false }),
    supabase
      .from('wave_checkins')
      .select('energy, alignment, duration_seconds, checked_in_at')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('checked_in_at', { ascending: false }),
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .order('sort_order'),
    supabase
      .from('user_settings')
      .select('tracking_mode, primary_build, secondary_build, welcome_back_mode, welcome_back_started_at, hints_seen')
      .eq('user_id', user.id)
      .single(),
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
  const hintsSeen = (settings?.hints_seen as Record<string, boolean>) ?? {}
  if (!hintsSeen.anchors_locked) markHintSeen('anchors_locked')
  const welcomeBackMode = (settings?.welcome_back_mode as WelcomeBackMode | null) ?? null
  const welcomeBackStartedKey = settings?.welcome_back_started_at
    ? pacificDayKey(settings.welcome_back_started_at as string)
    : null
  const weeklyRamp = currentRamp(welcomeBackMode, welcomeBackStartedKey, todayKey)

  const quarterStart = quarterStartKey(todayKey)
  const yearStart = yearStartKey(todayKey)

  // Period filtering against the unified all-logs fetch above.
  const weekStartMs = weekStart.getTime()
  const allLogsList = allLogs ?? []

  function inPeriod(log: { logged_at: string }, p: Period): boolean {
    if (p === 'week') return new Date(log.logged_at).getTime() >= weekStartMs
    if (p === 'month') return pacificDayKey(log.logged_at) >= monthStart
    if (p === 'quarter') return pacificDayKey(log.logged_at) >= quarterStart
    return pacificDayKey(log.logged_at) >= yearStart
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
  const radarActualsMap = actualsFor(periodLogs)

  // Bonus points per swell for the active period. Filter raw hit/completion
  // rows by Pacific day key against the period window, then aggregate.
  // Points-mode only — bonus_points doesn't currency-translate to hours
  // (see ADR 0004 §7; the integer column can't carry 0.25-hr precision).
  const weekStartKey = pacificDayKey(weekStart)
  const periodStartKey: DayKey =
    period === 'week' ? weekStartKey : period === 'month' ? monthStart : period === 'quarter' ? quarterStart : yearStart
  const filterByPeriodKey = <T extends { hit_at?: string; completed_at?: string | null }>(rows: T[], readAt: (r: T) => string | null | undefined): T[] => {
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
  const monthLogs = period === 'month' ? periodLogs : allLogsList.filter(l => inPeriod(l, 'month'))
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

  const activeDaySet = new Set<DayKey>()
  periodLogs.forEach(l => activeDaySet.add(pacificDayKey(l.logged_at)))
  const activeDays = activeDaySet.size
  const avgValue = activeDays > 0 ? ceilDisplay(totalValue / activeDays, isHours) : 0

  // Daily chart: anchor to the calendar window (week/month only).
  const dayMap = new Map<DayKey, number>()
  if (period === 'week' || period === 'month') {
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

  const waveCheckins = (allWaveCheckins ?? []).filter(c => {
    if (period === 'week') return new Date(c.checked_in_at).getTime() >= weekStartMs
    if (period === 'month') return pacificDayKey(c.checked_in_at) >= monthStart
    if (period === 'quarter') return pacificDayKey(c.checked_in_at) >= quarterStart
    return pacificDayKey(c.checked_in_at) >= yearStart
  })

  const headerDate = periodDateLabel(todayKey, period, weekStart)

  return (
    <div className="flex min-h-full flex-col items-center px-4 pb-12">
      <div className="w-full max-w-[22rem] lg:max-w-none">
        {/* Sticky header: onduler + date + stats + filters */}
        <div className="sticky top-0 z-10 bg-th-bg pb-4 pt-8">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
            <Link
              href="/anchors/new"
              aria-label="Drop an anchor"
              className="flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
            >
              +
            </Link>
          </div>

          <h1 className="mb-4 text-lg font-semibold text-th-text">{headerDate}</h1>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-semibold text-th-text">{ceilDisplay(totalValue, isHours)}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                {isHours ? 'hrs total' : 'pts total'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-th-text">{avgValue}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                {isHours ? 'hrs / active day' : 'pts / active day'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-th-text">{activeDays}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                active days
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {PERIOD_OPTIONS.filter(o => unlocks[o.value]).map(({ value, label }) => (
              <Link
                key={value}
                href={`/anchors?period=${value}`}
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
        </div>

        {pendingCadences.length > 0 && (
          <div className="mb-8 flex flex-col gap-3">
            {pendingCadences.map(c => {
              const cer = ceremonyByCadence[c]
              return (
                <Link
                  key={c}
                  href={`/anchors/ceremony/${c}`}
                  className="block rounded-xl border border-th-border bg-th-surface/50 px-4 py-4 transition-colors hover:bg-th-surface active:scale-[0.99]"
                >
                  <p className="text-[10px] uppercase tracking-widest text-th-muted">{CADENCE_LABEL[c]}</p>
                  <p className="mt-1.5 text-sm text-th-text">
                    {formatCycleLabel({ cycleStart: cer.cycleStart, cycleEnd: cer.cycleEnd }, c)} is ready to be seen.
                  </p>
                  <p className="mt-2 text-xs text-th-faint">Drop your anchor →</p>
                </Link>
              )
            })}
          </div>
        )}

        <HintCard hintKey="anchors_unlocked" title="You unlocked Anchors." seen={!!hintsSeen.anchors_unlocked}>
          <p>Each week you can drop an anchor, a marker for what you noticed. Onduler holds the mirror; you do the noticing.</p>
        </HintCard>

        {radarSwells.length >= 3 && (
          <SwellRadar
            swells={radarSwells}
            actuals={radarActuals}
            period={period}
            primaryBuild={primaryBuild}
            secondaryBuild={secondaryBuild}
            trackingMode={trackingMode}
            waveRamp={waveRamp}
            todayKey={todayKey}
          />
        )}

        {totalValue === 0 ? (
          <p className="text-sm text-th-muted">No motions logged for this period.</p>
        ) : (
          <>
            {swellBreakdown.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">By swell</h2>
                <div className="flex flex-col gap-3">
                  {swellBreakdown.map(s => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="w-20 shrink-0 truncate text-xs text-th-secondary">{s.name}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-th-surface" style={{ height: '6px' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(s.value / maxSwellValue) * 100}%`,
                            background: `linear-gradient(to right, color-mix(in oklch, ${s.color} 35%, var(--th-surface)), ${s.color})`,
                            backgroundSize: `${(maxSwellValue / s.value) * 100}% 100%`,
                          }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs text-th-faint">{formatValue(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(period === 'week' || period === 'month') && days.length > 0 && (
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
                              className="h-full rounded-full"
                              style={{ width: `${(val / maxDayValue) * 100}%`, background: 'linear-gradient(to right, color-mix(in oklch, var(--th-accent) 35%, var(--th-surface)), var(--th-accent))', backgroundSize: `${(maxDayValue / val) * 100}% 100%` }}
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
              <h2 className="mb-3 text-sm font-medium text-th-text">Recent</h2>
              <div className="flex flex-col gap-2">
                {periodLogs.slice(0, 10).map((log, i) => {
                  const motion = readMotion(log)
                  const logDate = new Date(log.logged_at as string).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Los_Angeles',
                  })
                  const entryValue = isHours ? ceilDisplay(Number(log.hours), true) : log.points
                  return (
                    <div key={`${log.logged_at}-${i}`} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-th-border" />
                      <span className="flex-1 truncate text-xs text-th-muted">{motion?.name ?? '—'}</span>
                      <span className="text-xs text-th-faint">{logDate}</span>
                      <span className="w-12 text-right text-xs text-th-faint">+{entryValue}</span>
                    </div>
                  )
                })}
              </div>
              {periodLogs.length > 10 && (
                <details className="mt-3">
                  <summary className="cursor-pointer list-none text-xs text-th-muted hover:text-th-text">
                    {periodLogs.length - 10} more
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {periodLogs.slice(10).map((log, i) => {
                      const motion = readMotion(log)
                      const logDate = new Date(log.logged_at as string).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'America/Los_Angeles',
                      })
                      const entryValue = isHours ? ceilDisplay(Number(log.hours), true) : log.points
                      return (
                        <div key={`${log.logged_at}-${i}-more`} className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-th-border" />
                          <span className="flex-1 truncate text-xs text-th-muted">{motion?.name ?? '—'}</span>
                          <span className="text-xs text-th-faint">{logDate}</span>
                          <span className="w-12 text-right text-xs text-th-faint">+{entryValue}</span>
                        </div>
                      )
                    })}
                  </div>
                </details>
              )}
            </div>

            {waveCheckins.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium text-th-text">Waves</h2>
                <div className="flex flex-col gap-3">
                  {waveCheckins.map((checkin, i) => {
                    const checkinDate = new Date(checkin.checked_in_at as string).toLocaleDateString(
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
                          <p className="text-xs text-th-muted">{checkinDate}</p>
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

        {(() => {
          const locked: ('month' | 'quarter' | 'year')[] = []
          if (!unlocks.month) locked.push('month')
          if (!unlocks.quarter) locked.push('quarter')
          if (!unlocks.year) locked.push('year')
          if (locked.length === 0) return null
          return (
            <div className="mt-12 pb-12">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-th-muted">Coming together</p>
              <div className="relative overflow-hidden rounded-xl bg-th-surface/60">
                <WaveField lines={COMING_TOGETHER_WAVES} />
                <div className="relative" style={{ zIndex: 1 }}>
                  {locked.map(c => (
                    <LockedCadenceTile key={c} cadence={c} />
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
