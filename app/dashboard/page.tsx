import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { AddDomainForm } from './components/AddDomainForm'
import { SortableDomainList } from './components/SortableDomainList'
import { ThemeSwitcher } from './components/ThemeSwitcher'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: domains } = await supabase
    .from('domains')
    .select('*')
    .order('created_at', { ascending: true })

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: todayLogs } = await supabase
    .from('logs')
    .select('points, difficulty, logged_at, activities(name), domains(name, color)')
    .gte('logged_at', todayStart.toISOString())
    .order('logged_at', { ascending: false })

  const todayPoints = todayLogs?.reduce((sum, log) => sum + log.points, 0) ?? 0

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-24">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-th-text">
              Your domains
            </h1>
            <p className="mt-1 text-sm text-th-muted">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
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

        {todayPoints > 0 && (
          <div className="mb-8 rounded-lg border border-th-border p-4">
            <p className="mb-3 text-sm font-medium text-th-text">
              Today — {todayPoints} pts
            </p>
            <div className="flex flex-col gap-1.5">
              {todayLogs?.map(log => (
                <div key={`${log.logged_at}-${Math.random()}`} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: (Array.isArray(log.domains) ? log.domains[0] : log.domains as { color: string } | null)?.color ?? '#a1a1aa' }}
                  />
                  <span className="flex-1 text-xs text-th-muted">
                    {(Array.isArray(log.activities) ? log.activities[0] : log.activities as { name: string } | null)?.name}
                  </span>
                  <span className="text-xs capitalize text-th-faint">{log.difficulty}</span>
                  <span className="text-xs text-th-faint">+{log.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {domains && domains.length > 0 ? (
          <div className="mb-8">
            <SortableDomainList domains={domains} />
          </div>
        ) : (
          <p className="mb-8 text-sm text-th-muted">
            No domains yet. Add your first one below.
          </p>
        )}

        <div className="border-t border-th-border pt-8">
          <h2 className="mb-4 text-sm font-medium text-th-text">
            Add a domain
          </h2>
          <AddDomainForm />
        </div>
      </div>
    </div>
  )
}
