import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { AddDomainForm } from './components/AddDomainForm'
import { DomainCard } from './components/DomainCard'

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
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Your domains
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>

        {todayPoints > 0 && (
          <div className="mb-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Today — {todayPoints} pts
            </p>
            <div className="flex flex-col gap-1.5">
              {todayLogs?.map(log => (
                <div key={`${log.logged_at}-${Math.random()}`} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: (Array.isArray(log.domains) ? log.domains[0] : log.domains as { color: string } | null)?.color ?? '#a1a1aa' }}
                  />
                  <span className="flex-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {(Array.isArray(log.activities) ? log.activities[0] : log.activities as { name: string } | null)?.name}
                  </span>
                  <span className="text-xs capitalize text-zinc-400">{log.difficulty}</span>
                  <span className="text-xs text-zinc-400">+{log.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {domains && domains.length > 0 ? (
          <div className="mb-8 flex flex-col gap-2">
            {domains.map(domain => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        ) : (
          <p className="mb-8 text-sm text-zinc-500">
            No domains yet. Add your first one below.
          </p>
        )}

        <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800">
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Add a domain
          </h2>
          <AddDomainForm />
        </div>
      </div>
    </div>
  )
}
