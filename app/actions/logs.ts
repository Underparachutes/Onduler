'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart, getWeekStart } from '@/lib/timezone'
import { pacificDayKey } from '@/lib/periods'
import { cycleStartKey, type Cadence } from '@/lib/cadence'

export async function quickLogMotion(motionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: motion } = await supabase
    .from('motions')
    .select('default_points, default_hours')
    .eq('id', motionId)
    .eq('user_id', user.id)
    .single()

  if (!motion) return { error: 'Motion not found' }

  const { error } = await supabase
    .from('logs')
    .insert({
      user_id: user.id,
      motion_id: motionId,
      points: motion.default_points,
      hours: motion.default_hours,
    })

  if (error) return { error: error.message }

  // Auto-progress: if this motion has any linked recurring waypoints with a
  // target_count, check whether the latest log just crossed the threshold
  // for the active cycle. One hit per cycle (gated by the latest hit's day
  // key, not row count). Bonus points accrue via the existing aggregation
  // paths — the dashboard's celebration trigger fires when the resulting
  // swell total crosses its weekly target.
  await maybeRecordWaypointHits(supabase, user.id, motionId)

  revalidatePath('/dashboard')
  revalidatePath('/reflections')
  revalidatePath('/swells')
  return { success: true }
}

async function maybeRecordWaypointHits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  motionId: string,
) {
  const { data: linked } = await supabase
    .from('milestones')
    .select('id, swell_id, cadence, target_count')
    .eq('user_id', userId)
    .eq('motion_id', motionId)
    .eq('kind', 'recurring')
    .not('target_count', 'is', null)
  if (!linked || linked.length === 0) return

  const [weekStartDate, todayStart] = await Promise.all([getWeekStart(), getTodayStart()])
  const weekStartKey = pacificDayKey(weekStartDate)
  const todayKey = pacificDayKey(todayStart)

  const milestoneIds = linked.map(m => m.id)

  // Two parallel reads: per-motion logs (to count this cycle) and the latest
  // hit per milestone (to gate re-firing within the same cycle).
  const earliestCycleStart = linked.some(m => m.cadence === 'monthly')
    ? cycleStartKey('monthly', weekStartKey, todayKey)
    : cycleStartKey('weekly', weekStartKey, todayKey)

  const [{ data: motionLogs }, { data: recentHits }] = await Promise.all([
    supabase
      .from('logs')
      .select('logged_at')
      .eq('user_id', userId)
      .eq('motion_id', motionId)
      .gte('logged_at', earliestCycleStart + 'T00:00:00Z'),
    supabase
      .from('milestone_hits')
      .select('milestone_id, hit_at')
      .eq('user_id', userId)
      .in('milestone_id', milestoneIds)
      .order('hit_at', { ascending: false }),
  ])

  const logDayKeysByMotion = (motionLogs ?? []).map(l => pacificDayKey(l.logged_at))
  const latestHitByMilestone = new Map<string, string>()
  for (const h of recentHits ?? []) {
    if (!latestHitByMilestone.has(h.milestone_id)) {
      latestHitByMilestone.set(h.milestone_id, h.hit_at)
    }
  }

  const newHits: { user_id: string; milestone_id: string }[] = []
  for (const m of linked) {
    const cadence = (m.cadence ?? 'weekly') as Cadence
    const cycleStart = cycleStartKey(cadence, weekStartKey, todayKey)
    const latestHit = latestHitByMilestone.get(m.id)
    if (latestHit && pacificDayKey(latestHit) >= cycleStart) continue // already hit this cycle
    const inCycleCount = logDayKeysByMotion.filter(k => k >= cycleStart).length
    if (inCycleCount >= (m.target_count ?? Infinity)) {
      newHits.push({ user_id: userId, milestone_id: m.id })
    }
  }

  if (newHits.length > 0) {
    await supabase.from('milestone_hits').insert(newHits)
  }
}

export async function unlogMotion(motionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const todayStart = await getTodayStart()

  const { data: logs } = await supabase
    .from('logs')
    .select('id')
    .eq('motion_id', motionId)
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())
    .order('logged_at', { ascending: false })
    .limit(1)

  const log = logs?.[0]
  if (!log) return { error: 'No log found' }

  await supabase.from('logs').delete().eq('id', log.id)

  revalidatePath('/dashboard')
  revalidatePath('/reflections')
  return { success: true }
}
