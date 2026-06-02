import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { pacificDayKey, type DayKey } from '@/lib/periods'
import { daysInCycle, formatCycleLabel, type Cadence } from '@/lib/cycles'
import { getCeremonyState } from '@/app/actions/reflections'
import { CycleCeremony } from '../CycleCeremony'

const CADENCES: Cadence[] = ['week', 'month', 'quarter', 'year']

type MotionShape = {
  motion_swells?: { contribution_weight: number; swells: { id: string } | null }[]
} | null

export default async function CeremonyPage({
  params,
}: {
  params: Promise<{ cadence: string }>
}) {
  const { cadence: rawCadence } = await params
  if (!CADENCES.includes(rawCadence as Cadence)) notFound()
  const cadence = rawCadence as Cadence

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapterId = await getActiveChapterId(supabase, user.id)
  const todayKey = pacificDayKey(new Date())
  const { state, cycleStart, cycleEnd } = await getCeremonyState(supabase, user.id, cadence, todayKey)

  // Only a pending ceremony renders here. Already-completed cycles and
  // wave-cycles (zero logs) both route the user back — the ceremony is a
  // one-time invitation, not a re-runnable flow.
  if (state !== 'pending') {
    redirect('/anchors')
  }

  // Fetch logs with a generous timestamp bound (DST + Pacific offset safety),
  // then filter precisely in JS using the Pacific day key. Avoids constructing
  // PT-midnight Date objects per cycle.
  const fetchLowerBound = cycleStart // YYYY-MM-DD; pg casts to 00:00:00 UTC
  const fetchUpperBound = dayKeyPlusDays(cycleEnd, 2) // 2-day buffer

  const [
    { data: swells },
    { data: rawLogs },
    { data: settings },
    { data: priorReflection },
  ] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .order('sort_order'),
    supabase
      .from('logs')
      .select('points, hours, logged_at, motions(motion_swells(contribution_weight, swells(id)))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .gte('logged_at', fetchLowerBound)
      .lte('logged_at', fetchUpperBound),
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('reflections')
      .select('intention_text')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('cycle_type', cadence)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'

  // Precise filter in Pacific time.
  const inCycle = (loggedAt: string): boolean => {
    const key = pacificDayKey(loggedAt)
    return key >= cycleStart && key <= cycleEnd
  }

  // Per-swell actuals across the closed cycle. Bonus accrual omitted in v1.
  const actualsMap = new Map<string, number>()
  swells?.forEach(s => actualsMap.set(s.id, 0))
  for (const log of rawLogs ?? []) {
    if (!inCycle(log.logged_at)) continue
    const motion: MotionShape = (Array.isArray(log.motions) ? log.motions[0] : log.motions) as unknown as MotionShape
    motion?.motion_swells?.forEach(ms => {
      if (!ms.swells) return
      if (!actualsMap.has(ms.swells.id)) return
      const weight = Number(ms.contribution_weight) || 1
      const inc = isHours ? Number(log.hours) * weight : Math.floor(log.points * weight)
      actualsMap.set(ms.swells.id, (actualsMap.get(ms.swells.id) ?? 0) + inc)
    })
  }

  // Scale weekly targets to the cycle window. Weekly stays at face value;
  // month/quarter/year get target × days_in_cycle / 7 (ADR 0005 §3 + spec
  // for Anchors F — quarterly/yearly mirror the monthly rule).
  const cycleLen = daysInCycle({ cycleStart, cycleEnd })
  const targetScale = cadence === 'week' ? 1 : cycleLen / 7

  const radarSwells = (swells ?? []).map(s => {
    const weeklyTarget = isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0)
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      target: weeklyTarget * targetScale,
    }
  })
  const radarActuals = (swells ?? []).map(s => actualsMap.get(s.id) ?? 0)

  return (
    <CycleCeremony
      cadence={cadence}
      cycleStart={cycleStart}
      cycleEnd={cycleEnd}
      cycleLabel={formatCycleLabel({ cycleStart, cycleEnd }, cadence)}
      swells={radarSwells}
      actuals={radarActuals}
      trackingMode={trackingMode}
      priorIntention={priorReflection?.intention_text ?? null}
    />
  )
}

function dayKeyPlusDays(key: DayKey, days: number): DayKey {
  const [y, m, d] = key.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000
  const dt = new Date(ms)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
