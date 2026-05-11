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
