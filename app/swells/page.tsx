import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'
import { SwellsView } from './SwellsView'

export default async function SwellsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: swells },
    { data: motionsRaw },
    { data: submotionsRaw },
    { data: settings },
    { data: groups },
    todayStart,
  ] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, group_id, motion_swells(contribution_weight, swells(id, name, color))')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('default_points', { ascending: false }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, parent_id, motion_swells(contribution_weight, swells(id, name, color))')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .not('parent_id', 'is', null)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('user_settings')
      .select('groups_enabled, tracking_mode')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('groups')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    getTodayStart(),
  ])

  const { data: todayLogs } = await supabase
    .from('logs')
    .select('motion_id, points, hours')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())

  const ptsToday: Record<string, number> = {}
  const hrsToday: Record<string, number> = {}
  for (const log of todayLogs ?? []) {
    if (log.motion_id) {
      ptsToday[log.motion_id] = (ptsToday[log.motion_id] ?? 0) + log.points
      hrsToday[log.motion_id] = (hrsToday[log.motion_id] ?? 0) + Number(log.hours)
    }
  }

  const doneMotionIds = Array.from(
    new Set((todayLogs ?? []).map(l => l.motion_id).filter(Boolean) as string[])
  )

  const submotionsMap: Record<string, { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }[]> = {}
  submotionsRaw?.forEach(m => {
    if (!m.parent_id) return
    if (!submotionsMap[m.parent_id]) submotionsMap[m.parent_id] = []
    const rawJunctions = (m.motion_swells ?? []) as unknown as { contribution_weight: number; swells: { id: string; name: string; color: string } | null }[]
    submotionsMap[m.parent_id].push({
      id: m.id,
      name: m.name,
      default_points: m.default_points,
      default_hours: m.default_hours,
      swells: rawJunctions.filter(ms => ms.swells !== null).map(ms => ({ ...ms.swells!, weight: Number(ms.contribution_weight) || 1 })),
    })
  })

  const motions = (motionsRaw ?? []).map(m => {
    const rawJunctions = (m.motion_swells ?? []) as unknown as { contribution_weight: number; swells: { id: string; name: string; color: string } | null }[]
    const motionSwells = rawJunctions
      .filter(ms => ms.swells !== null)
      .map(ms => ({ ...ms.swells!, weight: Number(ms.contribution_weight) || 1 }))
    const swellWeights: Record<string, number> = {}
    rawJunctions.forEach(ms => {
      if (ms.swells) swellWeights[ms.swells.id] = Number(ms.contribution_weight) || 1
    })
    return {
      id: m.id,
      name: m.name,
      default_points: m.default_points,
      default_hours: m.default_hours,
      groupId: m.group_id as string | null,
      swells: motionSwells,
      swellIds: motionSwells.map(s => s.id),
      swellWeights,
    }
  })

  const swellList = (swells ?? []).map(s => ({
    ...s,
    motions: motions.filter(m => m.swellIds.includes(s.id)),
  }))

  const unassigned = motions.filter(m => m.swellIds.length === 0)
  const swellStubs = (swells ?? []).map(s => ({ id: s.id, name: s.name, color: s.color }))
  const groupsEnabled = settings?.groups_enabled ?? false
  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const allGroups = groups ?? []

  return (
    <SwellsView
      swells={swellList}
      unassigned={unassigned}
      ptsToday={ptsToday}
      hrsToday={hrsToday}
      swellStubs={swellStubs}
      submotionsMap={submotionsMap}
      doneMotionIds={doneMotionIds}
      allGroups={allGroups}
      groupsEnabled={groupsEnabled}
      trackingMode={trackingMode}
      hasAnyMotions={motions.length > 0}
    />
  )
}
