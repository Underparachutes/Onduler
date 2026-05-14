import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'
import { AddSwellForm } from './AddSwellForm'
import { SwellRow } from './SwellRow'
import { MotionSwellToggle } from './MotionSwellToggle'

export default async function SwellsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: swells }, { data: motionsRaw }, todayStart] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, motion_swells(swell_id)')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('default_points', { ascending: false }),
    getTodayStart(),
  ])

  const { data: todayLogs } = await supabase
    .from('logs')
    .select('motion_id, points, hours')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())

  const ptsToday = new Map<string, number>()
  const hrsToday = new Map<string, number>()
  for (const log of todayLogs ?? []) {
    if (log.motion_id) {
      ptsToday.set(log.motion_id, (ptsToday.get(log.motion_id) ?? 0) + log.points)
      hrsToday.set(log.motion_id, (hrsToday.get(log.motion_id) ?? 0) + log.hours)
    }
  }

  const motions = (motionsRaw ?? []).map(m => ({
    id: m.id,
    name: m.name,
    default_points: m.default_points,
    default_hours: m.default_hours,
    swellIds: (m.motion_swells ?? []).map((ms: { swell_id: string }) => ms.swell_id),
  }))

  const swellList = (swells ?? []).map(s => ({
    ...s,
    motions: motions.filter(m => m.swellIds.includes(s.id)),
  }))

  const unassigned = motions.filter(m => m.swellIds.length === 0)
  const swellStubs = (swells ?? []).map(s => ({ id: s.id, name: s.name, color: s.color }))

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link href="/dashboard" className="text-xs text-th-faint transition-colors hover:text-th-muted">
            ← Back
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Swells</h1>

        {swellList.length === 0 && motions.length === 0 && (
          <p className="mb-8 text-sm text-th-muted">No motions yet. Add some from the dashboard first.</p>
        )}

        <div className="mb-8 flex flex-col gap-6">
          {swellList.map(swell => (
            <SwellRow
              key={swell.id}
              swell={swell}
              swellPtsToday={swell.motions.reduce((sum, m) => sum + (ptsToday.get(m.id) ?? 0), 0)}
              swellHrsToday={swell.motions.reduce((sum, m) => sum + (hrsToday.get(m.id) ?? 0), 0)}
              ptsToday={ptsToday}
              hrsToday={hrsToday}
              allSwells={swellStubs}
            />
          ))}
        </div>

        {unassigned.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">Unassigned</p>
            <div className="flex flex-col gap-2">
              {unassigned.map(motion => (
                <div key={motion.id} className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-th-text truncate">{motion.name}</p>
                    <p className="text-xs text-th-faint">{motion.default_points} pts · {motion.default_hours} hrs</p>
                  </div>
                  {ptsToday.get(motion.id) ? (
                    <span className="text-xs font-medium text-th-secondary shrink-0">
                      +{ptsToday.get(motion.id)} today
                    </span>
                  ) : null}
                  {swellStubs.length > 0 && (
                    <MotionSwellToggle
                      motionId={motion.id}
                      allSwells={swellStubs}
                      currentSwellIds={[]}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-th-border pt-6">
          <p className="mb-4 text-sm font-medium text-th-text">Add a swell</p>
          <AddSwellForm />
        </div>
      </div>
    </div>
  )
}
