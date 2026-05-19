import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLastWeekStart, getWeekStart } from '@/lib/timezone'
import { pacificDayKey } from '@/lib/periods'
import { formatWeekLabel } from '@/lib/cycles'
import { getWeekCeremonyState } from '@/app/actions/reflections'
import { WeekCeremony } from './WeekCeremony'

export default async function WeekCeremonyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayKey = pacificDayKey(new Date())
  const { state, cycleStart, cycleEnd } = await getWeekCeremonyState(supabase, user.id, todayKey)

  // Only a pending ceremony renders here. Already-completed weeks and
  // wave-cycle weeks both route the user back to the main surface — the
  // ceremony is a one-time invitation, not a re-runnable flow.
  if (state !== 'pending') {
    redirect('/reflections')
  }

  const [lastWeekStartDate, thisWeekStartDate] = await Promise.all([getLastWeekStart(), getWeekStart()])

  const [
    { data: swells },
    { data: lastWeekLogs },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('sort_order'),
    supabase
      .from('logs')
      .select('points, hours, motions(motion_swells(contribution_weight, swells(id)))')
      .eq('user_id', user.id)
      .gte('logged_at', lastWeekStartDate.toISOString())
      .lt('logged_at', thisWeekStartDate.toISOString()),
    supabase
      .from('user_settings')
      .select('tracking_mode, primary_build, secondary_build')
      .eq('user_id', user.id)
      .single(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'

  type LogRow = NonNullable<typeof lastWeekLogs>[number]
  type MotionShape = {
    motion_swells?: { contribution_weight: number; swells: { id: string } | null }[]
  } | null
  const readMotion = (log: LogRow): MotionShape =>
    (Array.isArray(log.motions) ? log.motions[0] : log.motions) as unknown as MotionShape

  // Per-swell actuals across the closed week. Bonus accrual is omitted in v1
  // — the ceremony is a contemplative read, not a precision metric.
  const actualsMap = new Map<string, number>()
  swells?.forEach(s => actualsMap.set(s.id, 0))
  for (const log of lastWeekLogs ?? []) {
    const motion = readMotion(log)
    motion?.motion_swells?.forEach(ms => {
      if (!ms.swells) return
      const weight = Number(ms.contribution_weight) || 1
      const inc = isHours ? Number(log.hours) * weight : Math.floor(log.points * weight)
      actualsMap.set(ms.swells.id, (actualsMap.get(ms.swells.id) ?? 0) + inc)
    })
  }

  const radarSwells = (swells ?? []).map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    target: (isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0)),
  }))
  const radarActuals = (swells ?? []).map(s => actualsMap.get(s.id) ?? 0)

  return (
    <WeekCeremony
      cycleStart={cycleStart}
      cycleEnd={cycleEnd}
      weekLabel={formatWeekLabel({ cycleStart, cycleEnd })}
      swells={radarSwells}
      actuals={radarActuals}
      trackingMode={trackingMode}
    />
  )
}
