import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          You&apos;re in
        </h1>
        <p className="mb-8 text-sm text-zinc-500">{user.email}</p>

        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          The tide is steady. This is where your domains will live.
        </p>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
