import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  return <OnboardingFlow />
}
