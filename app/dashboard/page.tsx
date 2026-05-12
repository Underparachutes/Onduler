import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { DailyChecklist } from './components/DailyChecklist'
import { WavePrompt } from './components/WavePrompt'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Wave detection — show inline prompt if away 72+ hrs with no checkin since last log
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

  // Domains with their activities
  const { data: domains } = await supabase
    .from('domains')
    .select('id, name, color, activities(id, name, default_points)')
    .order('created_at', { ascending: true })

  // Today's logs
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: todayLogs } = await supabase
    .from('logs')
    .select('activity_id, points')
    .gte('logged_at', todayStart.toISOString())

  const todayPoints = todayLogs?.reduce((sum, l) => sum + l.points, 0) ?? 0
  const doneActivityIds = (todayLogs ?? []).map(l => l.activity_id).filter(Boolean) as string[]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const hasActivities = domains?.some(d =>
    Array.isArray(d.activities) && d.activities.length > 0,
  )

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Link
              href="/log"
              className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface"
            >
              Log
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Date + pts header */}
        <div className="mb-8 flex items-end justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-th-text">{today}</h1>
          <div className="text-right">
            <p className="text-2xl font-semibold leading-none text-th-text">{todayPoints}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-th-muted">pts today</p>
          </div>
        </div>

        {showWavePrompt && <WavePrompt durationSeconds={waveDurationSeconds} />}

        {hasActivities ? (
          <DailyChecklist
            domains={(domains ?? []) as any}
            todayPoints={todayPoints}
            doneActivityIds={doneActivityIds}
          />
        ) : (
          <div className="rounded-lg border border-th-border p-6 text-center">
            <p className="mb-1 text-sm font-medium text-th-text">Nothing here yet.</p>
            <p className="mb-4 text-sm text-th-muted">
              Set up your domains and activities to start tracking.
            </p>
            <Link
              href="/dashboard/manage"
              className="text-sm font-medium text-th-secondary underline"
            >
              Set up →
            </Link>
          </div>
        )}

        <div className="mt-10 border-t border-th-border pt-6">
          <Link
            href="/dashboard/manage"
            className="text-xs text-th-faint transition-colors hover:text-th-secondary"
          >
            Manage domains & activities →
          </Link>
        </div>
      </div>
    </div>
  )
}
