import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getTodayStart, getWeekStart } from '@/lib/timezone'
import { pacificDayKey } from '@/lib/periods'
import { bonusBySwell } from '@/lib/waypoints'
import { currentRamp, type WelcomeBackMode } from '@/lib/welcomeback'
import { DashboardView } from './components/DashboardView'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function detectWave(
  supabase: SupabaseClient,
  chapterId: string,
): Promise<{ showWavePrompt: boolean; waveDurationSeconds: number | null }> {
  const { data: lastLogData } = await supabase
    .from('logs')
    .select('logged_at')
    .eq('chapter_id', chapterId)
    .order('logged_at', { ascending: false })
    .limit(1)

  const lastLog = lastLogData?.[0] ?? null
  if (!lastLog) return { showWavePrompt: false, waveDurationSeconds: null }

  const msSinceLog = Date.now() - new Date(lastLog.logged_at).getTime()
  const hoursSinceLog = msSinceLog / (1000 * 60 * 60)
  if (hoursSinceLog < 72) return { showWavePrompt: false, waveDurationSeconds: null }

  const { data: recentCheckinData } = await supabase
    .from('wave_checkins')
    .select('id')
    .eq('chapter_id', chapterId)
    .gt('checked_in_at', lastLog.logged_at)
    .limit(1)

  if (recentCheckinData && recentCheckinData.length > 0) {
    return { showWavePrompt: false, waveDurationSeconds: null }
  }

  return {
    showWavePrompt: true,
    waveDurationSeconds: Math.floor(msSinceLog / 1000),
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('groups_enabled, submotions_enabled, onboarding_complete, daily_goal, daily_goal_hours, tracking_mode, celebration_enabled, haptic_enabled, welcome_back_mode, welcome_back_started_at')
    .eq('user_id', user.id)
    .single()

  if (!settings?.onboarding_complete) redirect('/onboarding')

  const groupsEnabled = settings?.groups_enabled ?? false
  const submotionsEnabled = settings?.submotions_enabled ?? false
  const dailyGoal = settings?.daily_goal ?? 20
  const dailyGoalHours = Number(settings?.daily_goal_hours ?? 4)
  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const celebrationEnabled = settings?.celebration_enabled ?? true
  const hapticEnabled = settings?.haptic_enabled ?? true

  const [todayStart, weekStart, chapterId] = await Promise.all([
    getTodayStart(),
    getWeekStart(),
    getActiveChapterId(supabase, user.id),
  ])

  const [
    { data: todayLogs },
    { data: weekLogs },
    { data: motionsRaw },
    { data: submotionsRaw },
    { data: swellsData },
    { data: weekWaypointHits },
    { data: weekOneShots },
    groupsResult,
    waveResult,
  ] = await Promise.all([
    supabase
      .from('logs')
      .select('motion_id, points, hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .gte('logged_at', todayStart.toISOString()),
    supabase
      .from('logs')
      .select('motion_id, points, hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .gte('logged_at', weekStart.toISOString()),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, group_id, submotion_mode, motion_swells(contribution_weight, swells(id, name, color))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .is('parent_id', null)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, parent_id, motion_swells(contribution_weight, swells(id, name, color))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .not('parent_id', 'is', null)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .order('sort_order', { ascending: true }),
    supabase
      .from('milestone_hits')
      .select('hit_at, milestones(swell_id, bonus_points)')
      .eq('user_id', user.id)
      .gte('hit_at', weekStart.toISOString()),
    supabase
      .from('milestones')
      .select('swell_id, bonus_points, completed_at')
      .eq('user_id', user.id)
      .eq('kind', 'one_shot')
      .not('completed_at', 'is', null)
      .gte('completed_at', weekStart.toISOString()),
    groupsEnabled
      ? supabase
          .from('groups')
          .select('id, name, color')
          .eq('user_id', user.id)
          .eq('chapter_id', chapterId)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string; color: string }[] }),
    detectWave(supabase, chapterId),
  ])

  const groupsData = groupsResult.data ?? []
  const { showWavePrompt, waveDurationSeconds } = waveResult

  const todayPoints = todayLogs?.reduce((sum, l) => sum + l.points, 0) ?? 0
  const todayHours = todayLogs?.reduce((sum, l) => sum + Number(l.hours), 0) ?? 0
  const doneMotionIds = (todayLogs ?? []).map(l => l.motion_id).filter(Boolean) as string[]

  const ptsThisWeek: Record<string, number> = {}
  const hrsThisWeek: Record<string, number> = {}
  for (const log of weekLogs ?? []) {
    if (log.motion_id) {
      ptsThisWeek[log.motion_id] = (ptsThisWeek[log.motion_id] ?? 0) + log.points
      hrsThisWeek[log.motion_id] = (hrsThisWeek[log.motion_id] ?? 0) + Number(log.hours)
    }
  }

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
      submotionMode: (m.submotion_mode as 'distribute' | 'rollup' | null) ?? null,
      swells: rawJunctions
        .filter(ms => ms.swells !== null)
        .map(ms => ({ ...ms.swells!, weight: Number(ms.contribution_weight) || 1 })),
      swellWeights,
    }
  })

  const groupsWithMotions = groupsData.map(g => ({
    ...g,
    motions: motions.filter(m => m.groupId === g.id),
  }))
  const ungroupedMotions = motions.filter(m => m.groupId === null)

  // Bonus points from waypoint hits + one-shot completions this week. Points
  // mode only — the bonus_points column is integer points; hours-mode bonus
  // accrual is a future polish (the column doesn't map cleanly to 0.25-hr
  // increments). See ADR 0004 §7.
  const weeklyBonusBySwell = bonusBySwell(
    weekWaypointHits ?? [],
    weekOneShots ?? [],
    weekStart.toISOString(),
  )

  // Welcome-back ramp (ADR 0004 §8): if the user picked 'Ease back in' on the
  // welcome screen, weekly targets soften over 3 weeks (40% → 70% → 100%) so
  // celebration is reachable while they re-acclimate. After 3 weeks, ramp
  // returns null and full targets resume.
  const todayKey = pacificDayKey(todayStart)
  const welcomeBackMode = (settings?.welcome_back_mode as WelcomeBackMode | null) ?? null
  const welcomeBackStartedKey = settings?.welcome_back_started_at
    ? pacificDayKey(settings.welcome_back_started_at as string)
    : null
  const weeklyRamp = currentRamp(welcomeBackMode, welcomeBackStartedKey, todayKey)

  // Compute per-swell weekly progress for celebration trigger
  const swellWeeklyProgress: Record<string, number> = {}
  const swellTargets: Record<string, number> = {}
  for (const swell of swellsData ?? []) {
    const isHrs = trackingMode === 'hours'
    const rawTarget = isHrs ? (swell.target_hours ? Number(swell.target_hours) : null) : swell.target_points
    const target = rawTarget !== null && weeklyRamp !== null && weeklyRamp < 1
      ? rawTarget * weeklyRamp
      : rawTarget
    if (target !== null) swellTargets[swell.id] = target

    const contributing = motions.filter(m => m.swellWeights[swell.id] !== undefined)
    const progress = contributing.reduce((sum, m) => {
      const w = m.swellWeights[swell.id] ?? 1
      const motionVal = isHrs ? (hrsThisWeek[m.id] ?? 0) : (ptsThisWeek[m.id] ?? 0)
      return sum + motionVal * w
    }, 0)
    const bonus = isHrs ? 0 : (weeklyBonusBySwell.get(swell.id) ?? 0)
    swellWeeklyProgress[swell.id] = isHrs ? progress : Math.floor(progress) + bonus
  }

  return (
    <DashboardView
      groupsEnabled={groupsEnabled}
      submotionsEnabled={submotionsEnabled}
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
      swellWeeklyProgress={swellWeeklyProgress}
      swellTargets={swellTargets}
    />
  )
}
