import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'
import { formatPts, formatHrs } from '@/lib/format'

type Period = '7' | '30' | 'all'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: 'all', label: 'All time' },
]

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod = '7' } = await searchParams
  const period: Period =
    rawPeriod === '7' || rawPeriod === '30' || rawPeriod === 'all' ? rawPeriod : '7'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayStart = await getTodayStart()
  const startDate =
    period === 'all'
      ? null
      : new Date(todayStart.getTime() - (parseInt(period) - 1) * 24 * 60 * 60 * 1000)

  let logsQuery = supabase
    .from('logs')
    .select('points, hours, logged_at, motions(name, motion_swells(contribution_weight, swells(id, name, color)))')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })

  if (startDate) logsQuery = logsQuery.gte('logged_at', startDate.toISOString())

  let checkinQuery = supabase
    .from('wave_checkins')
    .select('energy, alignment, duration_seconds, checked_in_at')
    .order('checked_in_at', { ascending: false })

  if (startDate) checkinQuery = checkinQuery.gte('checked_in_at', startDate.toISOString())

  const [
    { data: logs },
    { data: waveCheckins },
    { data: swells },
    { data: settings },
  ] = await Promise.all([
    logsQuery,
    checkinQuery,
    supabase.from('swells').select('id, name, color, target_points, target_hours').eq('user_id', user.id).order('sort_order'),
    supabase.from('user_settings').select('tracking_mode').eq('user_id', user.id).single(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'
  const formatValue = (n: number) => isHours ? formatHrs(round1(n)) : formatPts(n)

  const totalPoints = logs?.reduce((sum, l) => sum + l.points, 0) ?? 0
  const totalHours = logs?.reduce((sum, l) => sum + Number(l.hours), 0) ?? 0
  const totalValue = isHours ? totalHours : totalPoints

  // Swells breakdown
  const swellAccum = new Map<string, { name: string; color: string; points: number; hours: number }>()
  swells?.forEach(s => swellAccum.set(s.id, { name: s.name, color: s.color, points: 0, hours: 0 }))

  logs?.forEach(log => {
    const motion = (Array.isArray(log.motions) ? log.motions[0] : log.motions) as unknown as { motion_swells?: { contribution_weight: number; swells: { id: string; name: string; color: string } | null }[] } | null
    motion?.motion_swells?.forEach(ms => {
      if (!ms.swells) return
      const weight = Number(ms.contribution_weight) || 1
      const existing = swellAccum.get(ms.swells.id)
      if (existing) {
        existing.points += Math.floor(log.points * weight)
        existing.hours += Number(log.hours) * weight
      }
    })
  })

  const swellBreakdown = Array.from(swellAccum.values())
    .map(s => ({ ...s, value: isHours ? s.hours : s.points }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value)
  const maxSwellValue = swellBreakdown[0]?.value ?? 1

  // Daily chart — bucket everything by Pacific date, not UTC
  const pacificDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' })
  const dayMap = new Map<string, number>()
  if (period !== 'all') {
    const numDays = parseInt(period)
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000)
      dayMap.set(pacificDateFmt.format(d), 0)
    }
  }
  logs?.forEach(log => {
    const day = pacificDateFmt.format(new Date(log.logged_at as string))
    const inc = isHours ? Number(log.hours) : log.points
    if (dayMap.has(day)) dayMap.set(day, dayMap.get(day)! + inc)
  })
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  const maxDayValue = Math.max(...days.map(([, v]) => v), 1)

  const activeDays = days.filter(([, v]) => v > 0).length
  const avgValue = activeDays > 0
    ? (isHours ? round1(totalValue / activeDays) : Math.round(totalValue / activeDays))
    : 0

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link href="/dashboard" className="hidden text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97] sm:inline">
            ← Back
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Log</h1>

        <div className="mb-8 flex gap-2">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <Link
              key={value}
              href={`/log?period=${value}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                period === value
                  ? 'border-th-text bg-th-text text-th-btn-text'
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
            {period !== 'all' && (
              <div className="mb-8 grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{isHours ? round1(totalValue) : totalValue}</p>
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
                  <p className="text-lg font-semibold text-th-text">
                    {isHours ? totalPoints : round1(totalHours)}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">
                    {isHours ? 'pts total' : 'hrs total'}
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

            {period !== 'all' && days.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">
                  {period === '7' ? 'This week' : 'Past 30 days'}
                </h2>
                <div className="flex flex-col gap-2">
                  {days.map(([date, val]) => {
                    const d = new Date(date + 'T00:00:00Z')
                    const label =
                      period === '7'
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
                {period === 'all' ? 'All activity' : 'Recent'}
              </h2>
              <div className="flex flex-col gap-2">
                {logs?.slice(0, 40).map((log, i) => {
                  const motion = Array.isArray(log.motions) ? log.motions[0] : log.motions as { name: string } | null
                  const dateLabel = new Date(log.logged_at as string).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Los_Angeles',
                  })
                  const entryValue = isHours ? round1(Number(log.hours)) : log.points
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

            {waveCheckins && waveCheckins.length > 0 && (
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
      </div>
    </div>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
