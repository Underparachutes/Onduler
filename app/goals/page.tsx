import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'
import { AddGoalForm } from './AddGoalForm'
import { GoalRow } from './GoalRow'
import { ActivityAssignSelect } from './ActivityAssignSelect'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: goals }, { data: allActivities }, todayStart] = await Promise.all([
    supabase
      .from('goals')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('activities')
      .select('id, name, default_points, goal_id')
      .eq('user_id', user.id)
      .order('default_points', { ascending: false }),
    getTodayStart(),
  ])

  const { data: todayLogs } = await supabase
    .from('logs')
    .select('activity_id, points')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())

  // Build a map of activityId → pts logged today
  const ptsToday = new Map<string, number>()
  for (const log of todayLogs ?? []) {
    if (log.activity_id) {
      ptsToday.set(log.activity_id, (ptsToday.get(log.activity_id) ?? 0) + log.points)
    }
  }

  const activities = allActivities ?? []
  const unassigned = activities.filter(a => !a.goal_id)
  const goalList = (goals ?? []).map(g => ({
    ...g,
    activities: activities.filter(a => a.goal_id === g.id),
  }))
  const goalStubs = goalList.map(g => ({ id: g.id, name: g.name }))

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link href="/dashboard" className="text-xs text-th-faint transition-colors hover:text-th-muted">
            ← Back
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Goals</h1>

        {goalList.length === 0 && unassigned.length === 0 && (
          <p className="mb-8 text-sm text-th-muted">No activities yet. Add some from the dashboard first.</p>
        )}

        {/* Goals */}
        <div className="mb-8 flex flex-col gap-6">
          {goalList.map(goal => (
            <GoalRow
              key={goal.id}
              goal={goal}
              goalPts={goal.activities.reduce((sum, a) => sum + (ptsToday.get(a.id) ?? 0), 0)}
              ptsToday={ptsToday}
              goalStubs={goalStubs}
            />
          ))}
        </div>

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">Unassigned</p>
            <div className="flex flex-col gap-2">
              {unassigned.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-th-text truncate">{activity.name}</p>
                    <p className="text-xs text-th-faint">{activity.default_points} pts</p>
                  </div>
                  {ptsToday.get(activity.id) ? (
                    <span className="text-xs font-medium text-th-secondary shrink-0">
                      +{ptsToday.get(activity.id)} today
                    </span>
                  ) : null}
                  {goalList.length > 0 && (
                    <ActivityAssignSelect
                      activityId={activity.id}
                      currentGoalId={null}
                      goals={goalStubs}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add goal */}
        <div className="border-t border-th-border pt-6">
          <p className="mb-4 text-sm font-medium text-th-text">Add a goal</p>
          <AddGoalForm />
        </div>
      </div>
    </div>
  )
}
