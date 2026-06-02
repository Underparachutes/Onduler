import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BillingPanel } from './BillingPanel'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('is_admin, subscription_status, current_period_end')
    .eq('user_id', user.id)
    .single()

  if (!settings?.is_admin) redirect('/settings')

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12 lg:items-start">
      <div className="w-full max-w-[22rem] lg:max-w-none">
        <p className="mb-6 text-xs uppercase tracking-widest text-th-muted">Settings</p>
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Crew</h1>
        <p className="mb-8 text-sm text-th-muted">Support Onduler and unlock premium features.</p>

        <BillingPanel
          subscriptionStatus={settings?.subscription_status ?? 'none'}
          currentPeriodEnd={settings?.current_period_end ?? null}
        />
      </div>
    </div>
  )
}
