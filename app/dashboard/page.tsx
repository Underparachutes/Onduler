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
    .select('domains_enabled, onboarding_complete, daily_goal')
    .eq('user_id', user.id)
    .single()

  if (!settings?.onboarding_complete) redirect('/onboarding')

  const domainsEnabled = settings?.domains_enabled ?? false
  const dailyGoal = settings?.daily_goal ?? 20

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
    .select('activity_id, points')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())

  const todayPoints = todayLogs?.reduce((sum, l) => sum + l.points, 0) ?? 0
  const doneActivityIds = (todayLogs ?? []).map(l => l.activity_id).filter(Boolean) as string[]

  // Fetch activities based on domains mode
  let domainsData: any[] | null = null
  let activitiesData: any[] | null = null

  if (domainsEnabled) {
    const { data } = await supabase
      .from('domains')
      .select('id, name, color, activities(id, name, default_points)')
      .order('sort_order', { ascending: true })
    domainsData = data
  } else {
    const { data } = await supabase
      .from('activities')
      .select('id, name, default_points')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    activitiesData = data
  }

  const hasActivities = domainsEnabled
    ? (domainsData ?? []).some(d => Array.isArray(d.activities) && d.activities.length > 0)
    : (activitiesData?.length ?? 0) > 0

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <div className="flex items-center gap-2">
            <Link
              href="/goals"
              className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface"
            >
              Goals
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

        {hasActivities ? (
          domainsEnabled ? (
            <DailyChecklist
              domainsEnabled={true}
              domains={(domainsData ?? []) as any}
              todayPoints={todayPoints}
              doneActivityIds={doneActivityIds}
              dailyGoal={dailyGoal}
            />
          ) : (
            <DailyChecklist
              domainsEnabled={false}
              activities={(activitiesData ?? []) as any}
              todayPoints={todayPoints}
              doneActivityIds={doneActivityIds}
              dailyGoal={dailyGoal}
            />
          )
        ) : (
          <div className="rounded-lg border border-th-border p-6 text-center">
            <p className="mb-1 text-sm font-medium text-th-text">Nothing here yet.</p>
            <p className="mb-4 text-sm text-th-muted">
              Add your first activity to start tracking.
            </p>
            <Link
              href="/dashboard/manage"
              className="text-sm font-medium text-th-secondary underline"
            >
              Add activities →
            </Link>
          </div>
        )}

        <div className="mt-10 border-t border-th-border pt-6">
          <Link
            href="/dashboard/manage"
            className="text-xs text-th-faint transition-colors hover:text-th-secondary"
          >
            {domainsEnabled ? 'Manage domains & activities →' : 'Manage activities →'}
          </Link>
        </div>
      </div>
    </div>
  )
}
