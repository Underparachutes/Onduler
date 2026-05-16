import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'
import { DashboardView } from './components/DashboardView'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('groups_enabled, onboarding_complete, daily_goal, daily_goal_hours, tracking_mode, celebration_enabled, haptic_enabled')
    .eq('user_id', user.id)
    .single()

  if (!settings?.onboarding_complete) redirect('/onboarding')

  const groupsEnabled = settings?.groups_enabled ?? false
  const dailyGoal = settings?.daily_goal ?? 20
  const dailyGoalHours = Number(settings?.daily_goal_hours ?? 4)
  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const celebrationEnabled = settings?.celebration_enabled ?? true
  const hapticEnabled = settings?.haptic_enabled ?? true

  // Wave detection
  const { data: lastLogData } = await supabase
    .from('logs')
    .select('logged_at')
    .order('logged_at', { ascending: false })
    .limit(1)

  const lastLog = lastLogData?.[0] ?? null
  let showWavePrompt = false
  let waveDurationSeconds: number | null = null

  if (lastLog) {
    const hoursSinceLog =
      (Date.now() - new Date(lastLog.logged_at).getTime()) / (1000 * 60 * 60)
    if (hoursSinceLog >= 72) {
      const { data: recentCheckinData } = await supabase
        .from('wave_checkins')
        .select('id')
        .gt('checked_in_at', lastLog.logged_at)
        .limit(1)
      if (!recentCheckinData || recentCheckinData.length === 0) {
        showWavePrompt = true
        waveDurationSeconds = Math.floor(
          (Date.now() - new Date(lastLog.logged_at).getTime()) / 1000,
        )
      }
    }
  }

  // Today's logs
  const todayStart = await getTodayStart()
  const { data: todayLogs } = await supabase
    .from('logs')
    .select('motion_id, points, hours')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())

  const todayPoints = todayLogs?.reduce((sum, l) => sum + l.points, 0) ?? 0
  const todayHours = todayLogs?.reduce((sum, l) => sum + Number(l.hours), 0) ?? 0
  const doneMotionIds = (todayLogs ?? []).map(l => l.motion_id).filter(Boolean) as string[]

  // Fetch top-level motions with swell and group data
  const { data: motionsRaw } = await supabase
    .from('motions')
    .select('id, name, default_points, default_hours, group_id, motion_swells(contribution_weight, swells(id, name, color))')
    .eq('user_id', user.id)
    .eq('hidden', false)
    .is('parent_id', null)
    .order('sort_order', { ascending: true, nullsFirst: false })

  // Fetch submotions separately (not shown in checklist, shown in detail sheet)
  const { data: submotionsRaw } = await supabase
    .from('motions')
    .select('id, name, default_points, default_hours, parent_id')
    .eq('user_id', user.id)
    .eq('hidden', false)
    .not('parent_id', 'is', null)
    .order('sort_order', { ascending: true, nullsFirst: false })

  const submotionsMap: Record<string, { id: string; name: string; default_points: number; default_hours: number }[]> = {}
  submotionsRaw?.forEach(m => {
    if (!m.parent_id) return
    if (!submotionsMap[m.parent_id]) submotionsMap[m.parent_id] = []
    submotionsMap[m.parent_id].push({ id: m.id, name: m.name, default_points: m.default_points, default_hours: m.default_hours })
  })

  const motions = (motionsRaw ?? []).map(m => {
    const rawJunctions = (m.motion_swells ?? []) as unknown as { contribution_weight: number; swells: { id: string; name: string; color: string } | null }[]
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
      swells: rawJunctions
        .filter(ms => ms.swells !== null)
        .map(ms => ({ ...ms.swells!, weight: Number(ms.contribution_weight) || 1 })),
      swellWeights,
    }
  })

  const { data: swellsData } = await supabase
    .from('swells')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  let groupsData: { id: string; name: string; color: string }[] = []
  if (groupsEnabled) {
    const { data } = await supabase
      .from('groups')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    groupsData = data ?? []
  }

  const groupsWithMotions = groupsData.map(g => ({
    ...g,
    motions: motions.filter(m => m.groupId === g.id),
  }))
  const ungroupedMotions = motions.filter(m => m.groupId === null)

  return (
    <DashboardView
      groupsEnabled={groupsEnabled}
      motions={motions}
      groups={groupsWithMotions}
      ungroupedMotions={ungroupedMotions}
      submotionsMap={submotionsMap}
      todayPoints={todayPoints}
      todayHours={todayHours}
      doneMotionIds={doneMotionIds}
      dailyGoal={dailyGoal}
      dailyGoalHours={dailyGoalHours}
      trackingMode={trackingMode}
      celebrationEnabled={celebrationEnabled}
      hapticEnabled={hapticEnabled}
      allSwells={swellsData ?? []}
      allGroups={groupsData}
      showWavePrompt={showWavePrompt}
      waveDurationSeconds={waveDurationSeconds}
    />
  )
}
