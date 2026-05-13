import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { SettingsPanel } from './SettingsPanel'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('theme, domains_enabled, daily_goal, celebration_enabled, haptic_enabled')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link
            href="/dashboard"
            className="text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            ← Back
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-th-text">Settings</h1>

        <SettingsPanel
          theme={settings?.theme ?? 'default'}
          domainsEnabled={settings?.domains_enabled ?? false}
          dailyGoal={settings?.daily_goal ?? 20}
          celebrationEnabled={settings?.celebration_enabled ?? true}
          hapticEnabled={settings?.haptic_enabled ?? true}
          email={user.email ?? ''}
        />

        <div className="mt-8 border-t border-th-border pt-6">
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-th-faint transition-colors hover:text-red-500"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
