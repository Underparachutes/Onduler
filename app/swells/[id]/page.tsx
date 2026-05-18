import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart, getWeekStart } from '@/lib/timezone'
import {
  monthStartKey,
  pacificDayKey,
  weeksSinceFirstLog as weeksSinceFirstLogFn,
} from '@/lib/periods'
import { cycleStartKey, type Cadence } from '@/lib/cadence'
import { bonusBySwell } from '@/lib/waypoints'
import { SwellProficiencyView } from './SwellProficiencyView'

type RawJunction = {
  contribution_weight: number
  motions: { id: string; name: string; default_points: number; default_hours: number } | null
}

function pacificMondayKey(date: Date): string {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date)
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const jsDay = dt.getDay()
  const daysSinceMonday = jsDay === 0 ? 6 : jsDay - 1
  dt.setDate(dt.getDate() - daysSinceMonday)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export default async function SwellDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: swell },
    { data: junctions },
    { data: milestonesRaw },
    { data: settings },
    { data: firstLogRow },
    weekStart,
    todayStart,
  ] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours, hidden')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('motion_swells')
      .select('contribution_weight, motions(id, name, default_points, default_hours)')
      .eq('swell_id', id),
    supabase
      .from('milestones')
      .select('id, name, kind, cadence, target_count, bonus_points, motion_id, completed_at, sort_order, motions(id, name)')
      .eq('user_id', user.id)
      .eq('swell_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    getWeekStart(),
    getTodayStart(),
  ])
  const todayKey = pacificDayKey(todayStart)
  const monthStartK = monthStartKey(todayKey)

  if (!swell) notFound()

  const motions = ((junctions ?? []) as unknown as RawJunction[])
    .filter(j => j.motions !== null)
    .map(j => ({
      id: j.motions!.id,
      name: j.motions!.name,
      default_points: j.motions!.default_points,
      default_hours: Number(j.motions!.default_hours),
      weight: Number(j.contribution_weight) || 1,
    }))

  const weights: Record<string, number> = {}
  motions.forEach(m => { weights[m.id] = m.weight })
  const motionIds = motions.map(m => m.id)

  type RawMilestoneJoin = {
    id: string
    name: string
    kind: 'recurring' | 'one_shot'
    cadence: string | null
    target_count: number | null
    bonus_points: number
    motion_id: string | null
    completed_at: string | null
    sort_order: number
    motions: { id: string; name: string } | { id: string; name: string }[] | null
  }
  const rawMilestones = (milestonesRaw ?? []) as RawMilestoneJoin[]
  const milestoneIds = rawMilestones.map(m => m.id)

  const [{ data: allLogs }, { data: hitsForSwell }] = await Promise.all([
    motionIds.length > 0
      ? supabase
          .from('logs')
          .select('motion_id, points, hours, logged_at')
          .eq('user_id', user.id)
          .in('motion_id', motionIds)
      : Promise.resolve({ data: [] as { motion_id: string | null; points: number; hours: number; logged_at: string }[] }),
    milestoneIds.length > 0
      ? supabase
          .from('milestone_hits')
          .select('hit_at, milestone_id, milestones(swell_id, bonus_points)')
          .eq('user_id', user.id)
          .in('milestone_id', milestoneIds)
      : Promise.resolve({ data: [] as { hit_at: string; milestone_id: string; milestones: { swell_id: string; bonus_points: number } | null }[] }),
  ])

  // "Month" view = the calendar month containing today (1st-of-month → today).
  // ADR 0005 §1; replaces the prior "last 4 ISO weeks" rolling window.

  type Bucket = { count: number; pts: number; hrs: number }
  const emptyBucket = (): Bucket => ({ count: 0, pts: 0, hrs: 0 })
  const perMotion: Record<string, { week: Bucket; month: Bucket; lifetime: Bucket }> = {}
  for (const id of motionIds) {
    perMotion[id] = { week: emptyBucket(), month: emptyBucket(), lifetime: emptyBucket() }
  }

  let weekPts = 0, weekHrs = 0, lifetimePts = 0, lifetimeHrs = 0
  const weekKeys = new Set<string>()
  for (const log of allLogs ?? []) {
    if (!log.motion_id) continue
    const w = weights[log.motion_id] ?? 1
    const wPts = Math.floor(log.points * w)
    const wHrs = Number(log.hours) * w
    const stats = perMotion[log.motion_id]
    if (stats) {
      stats.lifetime.count += 1
      stats.lifetime.pts += wPts
      stats.lifetime.hrs += wHrs
    }
    lifetimePts += wPts
    lifetimeHrs += wHrs
    const loggedAt = new Date(log.logged_at)
    weekKeys.add(pacificMondayKey(loggedAt))
    if (pacificDayKey(loggedAt) >= monthStartK && stats) {
      stats.month.count += 1
      stats.month.pts += wPts
      stats.month.hrs += wHrs
    }
    if (loggedAt >= weekStart) {
      weekPts += wPts
      weekHrs += wHrs
      if (stats) {
        stats.week.count += 1
        stats.week.pts += wPts
        stats.week.hrs += wHrs
      }
    }
  }

  const motionList = motions.map(m => ({
    id: m.id,
    name: m.name,
    weight: m.weight,
    default_points: m.default_points,
    default_hours: m.default_hours,
    week: perMotion[m.id].week,
    month: perMotion[m.id].month,
    lifetime: perMotion[m.id].lifetime,
  }))

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'

  // Weeks-since-app-start anchors the Lifetime target (weekly target × weeks elapsed).
  // Distinct from weeksActive on this swell — Lifetime is meant to be honest about
  // the whole journey, including swells you haven't fed yet. ceil(days_since/7);
  // ≤ 1 → proficiency view falls back to showing absolute lifetime totals.
  const firstLogKey = firstLogRow?.logged_at ? pacificDayKey(firstLogRow.logged_at) : null
  const weeksSinceFirstLog = weeksSinceFirstLogFn(firstLogKey, todayKey)

  // Bonus points for THIS swell, per window. Points mode only (see ADR 0004 §7).
  // One-shots are pulled from rawMilestones directly (completed_at-shaped).
  const isHours = trackingMode === 'hours'
  const weekStartIso = weekStart.toISOString()
  // Pacific 1st-of-month — pass undefined for monthStartIso; we filter the
  // hits/one-shots client-side by Pacific day key instead of by UTC instant.
  const weekStartKey = pacificDayKey(weekStart)
  const monthStartKeyForCycles = monthStartK

  type HitRow = {
    hit_at: string
    milestone_id: string
    milestones: { swell_id: string; bonus_points: number } | { swell_id: string; bonus_points: number }[] | null
  }
  const hitsLifetime = (hitsForSwell ?? []) as HitRow[]
  const oneShotsCompleted = rawMilestones
    .filter(m => m.kind === 'one_shot' && m.completed_at)
    .map(m => ({ swell_id: id, bonus_points: m.bonus_points, completed_at: m.completed_at }))

  // Filter by Pacific day key for week and month windows.
  const weekHits = hitsLifetime.filter(h => pacificDayKey(h.hit_at) >= weekStartKey)
  const monthHits = hitsLifetime.filter(h => pacificDayKey(h.hit_at) >= monthStartKeyForCycles)
  const weekOneShots = oneShotsCompleted.filter(m => m.completed_at && pacificDayKey(m.completed_at) >= weekStartKey)
  const monthOneShots = oneShotsCompleted.filter(m => m.completed_at && pacificDayKey(m.completed_at) >= monthStartKeyForCycles)

  // For this swell, bonusBySwell returns a single-entry Map keyed by swellId.
  const bonusWeek = isHours ? 0 : (bonusBySwell(weekHits, weekOneShots, weekStartIso).get(id) ?? 0)
  const bonusMonth = isHours ? 0 : (bonusBySwell(monthHits, monthOneShots).get(id) ?? 0)
  const bonusLifetime = isHours ? 0 : (bonusBySwell(hitsLifetime, oneShotsCompleted).get(id) ?? 0)

  // Apply bonus to points-mode totals.
  if (!isHours) {
    weekPts += bonusWeek
    lifetimePts += bonusLifetime
  }

  // Per-milestone enrichment for the View: linked motion name + current-cycle
  // progress (motion-linked auto-progress; otherwise just hit count this cycle).
  const motionLogsByMotion = new Map<string, string[]>() // motion_id → day keys
  for (const l of allLogs ?? []) {
    if (!l.motion_id) continue
    const k = pacificDayKey(l.logged_at)
    const arr = motionLogsByMotion.get(l.motion_id) ?? []
    arr.push(k)
    motionLogsByMotion.set(l.motion_id, arr)
  }
  const hitsByMilestone = new Map<string, string[]>() // milestone_id → hit day keys
  for (const h of hitsLifetime) {
    const arr = hitsByMilestone.get(h.milestone_id) ?? []
    arr.push(pacificDayKey(h.hit_at))
    hitsByMilestone.set(h.milestone_id, arr)
  }

  const milestones = rawMilestones.map(m => {
    const motionRef = Array.isArray(m.motions) ? m.motions[0] : m.motions
    let currentCycleCount = 0
    let cycleHit = false
    if (m.kind === 'recurring') {
      const cadence: Cadence = (m.cadence as Cadence) ?? 'weekly'
      const cycleStart = cycleStartKey(cadence, weekStartKey, todayKey)
      if (m.motion_id) {
        const dayKeys = motionLogsByMotion.get(m.motion_id) ?? []
        currentCycleCount = dayKeys.filter(k => k >= cycleStart).length
      } else {
        const hitKeys = hitsByMilestone.get(m.id) ?? []
        currentCycleCount = hitKeys.filter(k => k >= cycleStart).length
      }
      const hitKeys = hitsByMilestone.get(m.id) ?? []
      cycleHit = hitKeys.some(k => k >= cycleStart)
    }
    return {
      id: m.id,
      name: m.name,
      kind: m.kind,
      cadence: m.cadence,
      targetCount: m.target_count,
      bonusPoints: m.bonus_points,
      motionId: m.motion_id,
      motionName: motionRef?.name ?? null,
      completedAt: m.completed_at,
      sortOrder: m.sort_order,
      currentCycleCount,
      cycleHit,
    }
  })

  return (
    <SwellProficiencyView
      swell={{
        id: swell.id,
        name: swell.name,
        color: swell.color,
        target_points: swell.target_points,
        target_hours: swell.target_hours !== null ? Number(swell.target_hours) : null,
        hidden: !!(swell as { hidden?: boolean }).hidden,
      }}
      weekPts={weekPts}
      weekHrs={weekHrs}
      lifetimePts={lifetimePts}
      lifetimeHrs={lifetimeHrs}
      monthBonus={bonusMonth}
      weeksActive={weekKeys.size}
      weeksSinceFirstLog={weeksSinceFirstLog}
      motions={motionList}
      milestones={milestones}
      trackingMode={trackingMode}
      todayKey={todayKey}
    />
  )
}
