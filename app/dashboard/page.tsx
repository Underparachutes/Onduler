import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'
import { DailyChecklist } from './components/DailyChecklist'
import { WavePrompt } from './components/WavePrompt'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('groups_enabled, onboarding_complete, daily_goal, celebration_enabled, haptic_enabled')
    .eq('user_id', user.id)
    .single()

  if (!settings?.onboarding_complete) redirect('/onboarding')

  const groupsEnabled = settings?.groups_enabled ?? false
  const dailyGoal = settings?.daily_goal ?? 20
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
    .select('motion_id, points')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())

  const todayPoints = todayLogs?.reduce((sum, l) => sum + l.points, 0) ?? 0
  const doneMotionIds = (todayLogs ?? []).map(l => l.motion_id).filter(Boolean) as string[]

  // Fetch motions with swell and group data
  const { data: motionsRaw } = await supabase
    .from('motions')
    .select('id, name, default_points, default_hours, motion_groups(group_id), motion_swells(swells(id, name, color))')
    .eq('user_id', user.id)
    .eq('hidden', false)
    .order('default_points', { ascending: false })

  const motions = (motionsRaw ?? []).map(m => ({
    id: m.id,
    name: m.name,
    default_points: m.default_points,
    default_hours: m.default_hours,
    groupIds: (m.motion_groups ?? []).map((mg: { group_id: string }) => mg.group_id),
    swells: (m.motion_swells ?? [])
      .map((ms: unknown) => (ms as { swells: { id: string; name: string; color: string } | null }).swells)
      .filter(Boolean) as { id: string; name: string; color: string }[],
  }))

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
    motions: motions.filter(m => m.groupIds.includes(g.id)),
  }))
  const ungroupedMotions = motions.filter(m => m.groupIds.length === 0)

  const hasMotions = motions.length > 0

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <div className="flex items-center gap-2">
            <Link
              href="/swells"
              className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface"
            >
              Swells
            </Link>
            <Link
              href="/log"
              className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface"
            >
              Log
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface"
            >
              Settings
            </Link>
          </div>
        </div>

        {showWavePrompt && <WavePrompt durationSeconds={waveDurationSeconds} />}

        {hasMotions ? (
          <DailyChecklist
            groupsEnabled={groupsEnabled}
            motions={motions}
            groups={groupsWithMotions}
            ungroupedMotions={ungroupedMotions}
            todayPoints={todayPoints}
            doneMotionIds={doneMotionIds}
            dailyGoal={dailyGoal}
            celebrationEnabled={celebrationEnabled}
            hapticEnabled={hapticEnabled}
          />
        ) : (
          <div className="rounded-lg border border-th-border p-6 text-center">
            <p className="mb-1 text-sm font-medium text-th-text">Nothing here yet.</p>
            <p className="mb-4 text-sm text-th-muted">
              Add your first motion to start tracking.
            </p>
            <Link
              href="/dashboard/manage"
              className="text-sm font-medium text-th-secondary underline"
            >
              Add motions →
            </Link>
          </div>
        )}

        <div className="mt-10 border-t border-th-border pt-6">
          <Link
            href="/dashboard/manage"
            className="text-xs text-th-faint transition-colors hover:text-th-secondary"
          >
            {groupsEnabled ? 'Manage groups & motions →' : 'Manage motions →'}
          </Link>
        </div>
      </div>
    </div>
  )
}
