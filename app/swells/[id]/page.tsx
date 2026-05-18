import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart, getWeekStart } from '@/lib/timezone'
import {
  monthStartKey,
  pacificDayKey,
  weeksSinceFirstLog as weeksSinceFirstLogFn,
} from '@/lib/periods'
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
      .select('id, name, color, target_points, target_hours')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('motion_swells')
      .select('contribution_weight, motions(id, name, default_points, default_hours)')
      .eq('swell_id', id),
    supabase
      .from('milestones')
      .select('id, name, kind, cadence, completed_at, sort_order')
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

  const { data: allLogs } = motionIds.length > 0
    ? await supabase
        .from('logs')
        .select('motion_id, points, hours, logged_at')
        .eq('user_id', user.id)
        .in('motion_id', motionIds)
    : { data: [] as { motion_id: string | null; points: number; hours: number; logged_at: string }[] }

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

  type RawMilestone = {
    id: string
    name: string
    kind: 'recurring' | 'one_shot'
    cadence: string | null
    completed_at: string | null
    sort_order: number
  }
  const milestones = ((milestonesRaw ?? []) as RawMilestone[]).map(m => ({
    id: m.id,
    name: m.name,
    kind: m.kind,
    cadence: m.cadence,
    completedAt: m.completed_at,
    sortOrder: m.sort_order,
  }))

  return (
    <SwellProficiencyView
      swell={{
        id: swell.id,
        name: swell.name,
        color: swell.color,
        target_points: swell.target_points,
        target_hours: swell.target_hours !== null ? Number(swell.target_hours) : null,
      }}
      weekPts={weekPts}
      weekHrs={weekHrs}
      lifetimePts={lifetimePts}
      lifetimeHrs={lifetimeHrs}
      weeksActive={weekKeys.size}
      weeksSinceFirstLog={weeksSinceFirstLog}
      motions={motionList}
      milestones={milestones}
      trackingMode={trackingMode}
      todayKey={todayKey}
    />
  )
}
