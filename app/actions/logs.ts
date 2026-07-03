'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getTodayStart, getWeekStart } from '@/lib/timezone'
import { dayKey } from '@/lib/periods'
import { getUserTimezone } from '@/lib/user-timezone'
import { cycleStartKey, type Cadence } from '@/lib/cadence'

import { INTENSITY_MULTIPLIER, type Intensity } from '@/lib/intensity'

export async function quickLogMotion(motionId: string, intensity: Intensity = 'medium') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tz = await getUserTimezone(user.id)
  const chapterId = await getActiveChapterId(supabase, user.id)

  const { data: motion } = await supabase
    .from('motions')
    .select('default_points, default_hours')
    .eq('id', motionId)
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .single()

  if (!motion) return { error: 'Motion not found' }

  const todayStart = await getTodayStart(tz)
  const { count } = await supabase
    .from('logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('motion_id', motionId)
    .gte('logged_at', todayStart.toISOString())

  if ((count ?? 0) > 0) return { success: true }

  const mult = INTENSITY_MULTIPLIER[intensity]
  const { error } = await supabase
    .from('logs')
    .insert({
      user_id: user.id,
      chapter_id: chapterId,
      motion_id: motionId,
      points: Math.round(motion.default_points * mult),
      hours: Math.round(motion.default_hours * mult * 4) / 4,
      intensity,
    })

  if (error) return { error: error.message }

  // Auto-progress: if this motion has any linked recurring waypoints with a
  // target_count, check whether the latest log just crossed the threshold
  // for the active cycle. One hit per cycle (gated by the latest hit's day
  // key, not row count). Bonus points accrue via the existing aggregation
  // paths — the dashboard's celebration trigger fires when the resulting
  // swell total crosses its weekly target.
  await maybeRecordWaypointHits(supabase, user.id, motionId, tz)

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  revalidatePath('/swells')
  return { success: true }
}

async function maybeRecordWaypointHits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  motionId: string,
  tz: string,
) {
  const { data: linked } = await supabase
    .from('milestones')
    .select('id, swell_id, cadence, target_count')
    .eq('user_id', userId)
    .eq('motion_id', motionId)
    .eq('kind', 'recurring')
    .not('target_count', 'is', null)
  if (!linked || linked.length === 0) return

  const [weekStartDate, todayStart] = await Promise.all([getWeekStart(tz), getTodayStart(tz)])
  const weekStartKey = dayKey(weekStartDate, tz)
  const todayKey = dayKey(todayStart, tz)

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

  const logDayKeysByMotion = (motionLogs ?? []).map(l => dayKey(l.logged_at, tz))
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
    if (latestHit && dayKey(latestHit, tz) >= cycleStart) continue // already hit this cycle
    const inCycleCount = logDayKeysByMotion.filter(k => k >= cycleStart).length
    if (inCycleCount >= (m.target_count ?? Infinity)) {
      newHits.push({ user_id: userId, milestone_id: m.id })
    }
  }

  if (newHits.length > 0) {
    const { error: hitErr } = await supabase.from('milestone_hits').insert(newHits)
    // Don't fail the action — the log itself succeeded; the hit can re-fire next log.
    if (hitErr) console.error('milestone_hits insert failed:', hitErr.message)
  }
}

export async function logMotionOnDay(motionId: string, dayKeyStr: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tz = await getUserTimezone(user.id)
  const chapterId = await getActiveChapterId(supabase, user.id)

  const { data: motion } = await supabase
    .from('motions')
    .select('default_points, default_hours')
    .eq('id', motionId)
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)
    .single()

  if (!motion) return { error: 'Motion not found' }

  // Anchor the backfilled log at ~noon in the user's timezone on the chosen day
  // (noon has enough slack that DST never bumps it to an adjacent date).
  const [y, m, d] = dayKeyStr.split('-').map(Number)
  const utcNow = new Date()
  const localMs = new Date(utcNow.toLocaleString('en-US', { timeZone: tz })).getTime()
  const offsetMs = utcNow.getTime() - localMs
  const loggedAt = new Date(Date.UTC(y, m - 1, d, 12) + offsetMs)

  const { error } = await supabase.from('logs').insert({
    user_id: user.id,
    chapter_id: chapterId,
    motion_id: motionId,
    points: motion.default_points,
    hours: motion.default_hours,
    logged_at: loggedAt.toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  revalidatePath('/swells')
  return { success: true }
}

export async function removeLogById(logId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: delErr } = await supabase.from('logs').delete().eq('id', logId).eq('user_id', user.id)
  if (delErr) return { error: delErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  revalidatePath('/swells')
  return { success: true }
}

export async function unlogMotion(motionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const tz = await getUserTimezone(user.id)
  const todayStart = await getTodayStart(tz)

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

  const { error: unlogErr } = await supabase.from('logs').delete().eq('id', log.id)
  if (unlogErr) return { error: unlogErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  return { success: true }
}
