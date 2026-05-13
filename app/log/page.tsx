import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'

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

  const [{ data: settings }, todayStart] = await Promise.all([
    supabase.from('user_settings').select('domains_enabled').eq('user_id', user.id).single(),
    getTodayStart(),
  ])
  const domainsEnabled = settings?.domains_enabled ?? false

  const startDate =
    period === 'all'
      ? null
      : new Date(todayStart.getTime() - (parseInt(period) - 1) * 24 * 60 * 60 * 1000)

  let logsQuery = supabase
    .from('logs')
    .select('points, logged_at, activities(name, goal_id), domains(name, color)')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })

  if (startDate) logsQuery = logsQuery.gte('logged_at', startDate.toISOString())

  let checkinQuery = supabase
    .from('wave_checkins')
    .select('energy, alignment, duration_seconds, checked_in_at')
    .order('checked_in_at', { ascending: false })

  if (startDate) checkinQuery = checkinQuery.gte('checked_in_at', startDate.toISOString())

  const [{ data: logs }, { data: waveCheckins }, { data: goals }] = await Promise.all([
    logsQuery,
    checkinQuery,
    supabase.from('goals').select('id, name, color').eq('user_id', user.id).order('sort_order', { ascending: true }),
  ])

  const totalPoints = logs?.reduce((sum, l) => sum + l.points, 0) ?? 0

  // --- Goals breakdown ---
  const goalAccum = new Map<string, { name: string; color: string; points: number }>()
  goals?.forEach(g => goalAccum.set(g.id, { name: g.name, color: g.color, points: 0 }))
  logs?.forEach(log => {
    const activity = Array.isArray(log.activities) ? log.activities[0] : (log.activities as { name: string; goal_id: string | null } | null)
    if (activity?.goal_id) {
      const g = goalAccum.get(activity.goal_id)
      if (g) g.points += log.points
    }
  })
  const goalBreakdown = Array.from(goalAccum.values()).filter(g => g.points > 0).sort((a, b) => b.points - a.points)
  const maxGoalPoints = goalBreakdown[0]?.points ?? 1

  // --- Domain breakdown ---
  const domainMap = new Map<string, { name: string; color: string; points: number }>()
  logs?.forEach(log => {
    const domain = Array.isArray(log.domains)
      ? log.domains[0]
      : (log.domains as { name: string; color: string } | null)
    if (!domain) return
    const existing = domainMap.get(domain.name)
    if (existing) existing.points += log.points
    else domainMap.set(domain.name, { name: domain.name, color: domain.color, points: log.points })
  })
  const domainBreakdown = Array.from(domainMap.values()).sort((a, b) => b.points - a.points)
  const maxDomainPoints = domainBreakdown[0]?.points ?? 1

  // --- Daily chart ---
  const dayMap = new Map<string, number>()
  if (period !== 'all') {
    const numDays = parseInt(period)
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000)
      dayMap.set(d.toISOString().slice(0, 10), 0)
    }
  }
  logs?.forEach(log => {
    const day = (log.logged_at as string).slice(0, 10)
    dayMap.set(day, (dayMap.get(day) ?? 0) + log.points)
  })
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  const maxDayPoints = Math.max(...days.map(([, pts]) => pts), 1)

  // --- Summary stats ---
  const activeDays = days.filter(([, pts]) => pts > 0).length
  const avgPts = activeDays > 0 ? Math.round(totalPoints / activeDays) : 0

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link href="/dashboard" className="text-xs text-th-faint transition-colors hover:text-th-muted">
            ← Back
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Report</h1>

        {/* Period switcher */}
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

        {totalPoints === 0 ? (
          <p className="text-sm text-th-muted">No activity logged for this period.</p>
        ) : (
          <>
            {/* Summary stats */}
            {period !== 'all' && (
              <div className="mb-8 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-th-border p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{totalPoints}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">pts total</p>
                </div>
                <div className="rounded-lg border border-th-border p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{avgPts}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">pts / day</p>
                </div>
                <div className="rounded-lg border border-th-border p-3 text-center">
                  <p className="text-lg font-semibold text-th-text">{activeDays}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-th-muted">days active</p>
                </div>
              </div>
            )}

            {/* Goals breakdown */}
            {goalBreakdown.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">By goal</h2>
                <div className="flex flex-col gap-3">
                  {goalBreakdown.map(g => (
                    <div key={g.name} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="w-20 shrink-0 truncate text-xs text-th-secondary">{g.name}</span>
                      <div className="flex-1 rounded-full bg-th-surface" style={{ height: '6px' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(g.points / maxGoalPoints) * 100}%`, backgroundColor: g.color }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs text-th-faint">{g.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domain breakdown */}
            {domainsEnabled && domainBreakdown.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">By domain</h2>
                <div className="flex flex-col gap-3">
                  {domainBreakdown.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="w-20 shrink-0 truncate text-xs text-th-secondary">{d.name}</span>
                      <div className="flex-1 rounded-full bg-th-surface" style={{ height: '6px' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(d.points / maxDomainPoints) * 100}%`, backgroundColor: d.color }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs text-th-faint">{d.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily chart */}
            {period !== 'all' && days.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-medium text-th-text">
                  {period === '7' ? 'This week' : 'Past 30 days'}
                </h2>
                <div className="flex flex-col gap-2">
                  {days.map(([date, pts]) => {
                    const d = new Date(date + 'T00:00:00Z')
                    const label =
                      period === '7'
                        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                    return (
                      <div key={date} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-th-muted">{label}</span>
                        <div className="flex-1 rounded-full bg-th-surface" style={{ height: '6px' }}>
                          {pts > 0 && (
                            <div
                              className="h-full rounded-full bg-th-btn"
                              style={{ width: `${(pts / maxDayPoints) * 100}%` }}
                            />
                          )}
                        </div>
                        <span className="w-14 text-right text-xs text-th-faint">
                          {pts > 0 ? `${pts} pts` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Activity feed */}
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-medium text-th-text">
                {period === 'all' ? 'All activity' : 'Recent'}
              </h2>
              <div className="flex flex-col gap-2">
                {logs?.slice(0, 40).map((log, i) => {
                  const domain = Array.isArray(log.domains)
                    ? log.domains[0]
                    : (log.domains as { name: string; color: string } | null)
                  const activity = Array.isArray(log.activities)
                    ? log.activities[0]
                    : (log.activities as { name: string } | null)
                  const dateLabel = new Date(log.logged_at as string).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                  return (
                    <div key={`${log.logged_at}-${i}`} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: domain?.color ?? '#a1a1aa' }}
                      />
                      <span className="flex-1 truncate text-xs text-th-muted">{activity?.name}</span>
                      <span className="text-xs text-th-faint">{dateLabel}</span>
                      <span className="w-12 text-right text-xs text-th-faint">+{log.points}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Wave checkins */}
            {waveCheckins && waveCheckins.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium text-th-text">Waves</h2>
                <div className="flex flex-col gap-3">
                  {waveCheckins.map((checkin, i) => {
                    const dateLabel = new Date(checkin.checked_in_at as string).toLocaleDateString(
                      'en-US', { month: 'short', day: 'numeric' },
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
