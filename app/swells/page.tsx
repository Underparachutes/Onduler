import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getTodayStart, getWeekStart, getLastWeekStart } from '@/lib/timezone'
import { bonusBySwell } from '@/lib/waypoints'
import { SwellsView } from './SwellsView'

export default async function SwellsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    chapterId,
    { data: settings },
    todayStart,
    weekStart,
    lastWeekStart,
  ] = await Promise.all([
    getActiveChapterId(supabase, user.id),
    supabase
      .from('user_settings')
      .select('groups_enabled, submotions_enabled, tracking_mode, hints_seen, progress_bar_color')
      .eq('user_id', user.id)
      .single(),
    getTodayStart(),
    getWeekStart(),
    getLastWeekStart(),
  ])

  const [
    { data: swells },
    { data: motionsRaw },
    { data: submotionsRaw },
    { data: groups },
    { data: todayLogs },
    { data: thisWeekLogs },
    { data: lastWeekLogs },
    { data: thisWeekHits },
    { data: lastWeekHits },
    { data: thisWeekOneShots },
    { data: lastWeekOneShots },
  ] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours, group_id, hidden, sort_order')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, group_id, submotion_mode, motion_swells(contribution_weight, swells(id, name, color))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .order('default_points', { ascending: false }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, parent_id, motion_swells(contribution_weight, swells(id, name, color))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .not('parent_id', 'is', null)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('groups')
      .select('id, name, color')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true }),
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
      .from('logs')
      .select('motion_id, points, hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .gte('logged_at', lastWeekStart.toISOString())
      .lt('logged_at', weekStart.toISOString()),
    supabase
      .from('milestone_hits')
      .select('hit_at, milestones(swell_id, bonus_points)')
      .eq('user_id', user.id)
      .gte('hit_at', weekStart.toISOString()),
    supabase
      .from('milestone_hits')
      .select('hit_at, milestones(swell_id, bonus_points)')
      .eq('user_id', user.id)
      .gte('hit_at', lastWeekStart.toISOString())
      .lt('hit_at', weekStart.toISOString()),
    supabase
      .from('milestones')
      .select('swell_id, bonus_points, completed_at')
      .eq('user_id', user.id)
      .eq('kind', 'one_shot')
      .not('completed_at', 'is', null)
      .gte('completed_at', weekStart.toISOString()),
    supabase
      .from('milestones')
      .select('swell_id, bonus_points, completed_at')
      .eq('user_id', user.id)
      .eq('kind', 'one_shot')
      .not('completed_at', 'is', null)
      .gte('completed_at', lastWeekStart.toISOString())
      .lt('completed_at', weekStart.toISOString()),
  ])

  // Bonus-points maps for the swells page aggregate header + per-swell rows.
  // Points-mode only — see ADR 0004 §7 (bonus_points int doesn't map to 0.25-hr
  // increments). The view ignores these maps in hours mode.
  const thisWeekBonusBySwell = bonusBySwell(thisWeekHits ?? [], thisWeekOneShots ?? [])
  const lastWeekBonusBySwell = bonusBySwell(lastWeekHits ?? [], lastWeekOneShots ?? [])
  const swellBonusThisWeek: Record<string, number> = {}
  const swellBonusLastWeek: Record<string, number> = {}
  for (const [k, v] of thisWeekBonusBySwell) swellBonusThisWeek[k] = v
  for (const [k, v] of lastWeekBonusBySwell) swellBonusLastWeek[k] = v

  const ptsThisWeek: Record<string, number> = {}
  const hrsThisWeek: Record<string, number> = {}
  for (const log of thisWeekLogs ?? []) {
    if (log.motion_id) {
      ptsThisWeek[log.motion_id] = (ptsThisWeek[log.motion_id] ?? 0) + log.points
      hrsThisWeek[log.motion_id] = (hrsThisWeek[log.motion_id] ?? 0) + Number(log.hours)
    }
  }

  const ptsLastWeek: Record<string, number> = {}
  const hrsLastWeek: Record<string, number> = {}
  for (const log of lastWeekLogs ?? []) {
    if (log.motion_id) {
      ptsLastWeek[log.motion_id] = (ptsLastWeek[log.motion_id] ?? 0) + log.points
      hrsLastWeek[log.motion_id] = (hrsLastWeek[log.motion_id] ?? 0) + Number(log.hours)
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

  // Partition visible / hidden swells. Hidden swells stay fetched so the
  // "Hidden swells" expander on the page can list them with a restore button;
  // motion-swell junctions touching a hidden swell are dropped from
  // motion.swells so the orphan diagnostic correctly counts motions that
  // only feed hidden swells as "not feeding any swell" from the user's view.
  const allSwells = swells ?? []
  const hiddenSwellIds = new Set(allSwells.filter(s => s.hidden).map(s => s.id))
  const visibleSwells = allSwells.filter(s => !s.hidden)
  const hiddenSwells = allSwells.filter(s => s.hidden)

  const motions = (motionsRaw ?? []).map(m => {
    const rawJunctions = (m.motion_swells ?? []) as unknown as { contribution_weight: number; swells: { id: string; name: string; color: string } | null }[]
    const motionSwells = rawJunctions
      .filter(ms => ms.swells !== null && !hiddenSwellIds.has(ms.swells.id))
      .map(ms => ({ ...ms.swells!, weight: Number(ms.contribution_weight) || 1 }))
    const swellWeights: Record<string, number> = {}
    rawJunctions.forEach(ms => {
      if (ms.swells && !hiddenSwellIds.has(ms.swells.id)) {
        swellWeights[ms.swells.id] = Number(ms.contribution_weight) || 1
      }
    })
    return {
      id: m.id,
      name: m.name,
      default_points: m.default_points,
      default_hours: m.default_hours,
      groupId: m.group_id as string | null,
      submotionMode: (m.submotion_mode as 'distribute' | 'rollup' | null) ?? null,
      swells: motionSwells,
      swellIds: motionSwells.map(s => s.id),
      swellWeights,
    }
  })

  const swellList = visibleSwells.map(s => ({
    ...s,
    groupId: (s as Record<string, unknown>).group_id as string | null,
    motions: motions.filter(m => m.swellIds.includes(s.id)),
  }))

  const unassigned = motions.filter(m => m.swellIds.length === 0)
  // swellStubs powers the "Add to a swell" detail-sheet picker — hidden
  // swells stay out so the user doesn't accidentally feed something they hid.
  const swellStubs = visibleSwells.map(s => ({ id: s.id, name: s.name, color: s.color }))
  const hiddenSwellsList = hiddenSwells.map(s => ({ id: s.id, name: s.name, color: s.color }))
  const groupsEnabled = settings?.groups_enabled ?? false
  const submotionsEnabled = settings?.submotions_enabled ?? false
  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const hintsSeen = (settings?.hints_seen as Record<string, boolean>) ?? {}
  const allGroups = groups ?? []

  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })}`

  return (
    <SwellsView
      swells={swellList}
      unassigned={unassigned}
      ptsThisWeek={ptsThisWeek}
      hrsThisWeek={hrsThisWeek}
      ptsLastWeek={ptsLastWeek}
      hrsLastWeek={hrsLastWeek}
      swellBonusThisWeek={swellBonusThisWeek}
      swellBonusLastWeek={swellBonusLastWeek}
      hiddenSwells={hiddenSwellsList}
      swellStubs={swellStubs}
      submotionsMap={submotionsMap}
      doneMotionIds={doneMotionIds}
      allGroups={allGroups}
      groupsEnabled={groupsEnabled}
      submotionsEnabled={submotionsEnabled}
      trackingMode={trackingMode}
      hasAnyMotions={motions.length > 0}
      weekLabel={weekLabel}
      hintSwellsSeen={!!hintsSeen.swells}
      progressBarColor={(settings?.progress_bar_color as string) ?? null}
    />
  )
}
