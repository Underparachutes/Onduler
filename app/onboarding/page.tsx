import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEncSetupState } from '@/app/actions/keys'
import { OnboardingFlow } from './OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('onboarding_complete')
    .eq('user_id', user.id)
    .single()

  if (settings?.onboarding_complete) redirect('/dashboard')

  // No content flow before encryption keys exist. A new user who hasn't set up
  // their passkey + recovery code yet gets sent to the privacy gate first.
  // (Already-onboarded users short-circuit above, so existing testers — who
  // predate encryption — are never trapped here; their migration is a later phase.)
  const enc = await getEncSetupState()
  if (!enc.complete) redirect('/protect')

  return <OnboardingFlow />
}
