import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEncSetupState, getKeyEnvelope } from '@/app/actions/keys'
import { ProtectFlow } from './ProtectFlow'

// The privacy gate. New users land here (post email-confirm) BEFORE onboarding
// or any content flow: they create their passkey + recovery code here. Returning
// users with an uncached DEK unlock here. Nothing content-creating runs until a
// DEK exists.
export default async function ProtectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('onboarding_complete')
    .eq('user_id', user.id)
    .single()

  // Where to go once a DEK is in hand.
  const nextHref = settings?.onboarding_complete ? '/dashboard' : '/onboarding'

  const state = await getEncSetupState()

  if (state.complete) {
    const envelope = await getKeyEnvelope()
    return (
      <ProtectFlow
        mode="unlock"
        nextHref={nextHref}
        userId={user.id}
        email={user.email ?? ''}
        encEnabled={state.encEnabled}
        envelope={{
          passkeys: envelope.passkeys,
          recovery: envelope.recovery,
          password: envelope.password,
        }}
      />
    )
  }

  return (
    <ProtectFlow mode="setup" nextHref={nextHref} userId={user.id} email={user.email ?? ''} encEnabled={state.encEnabled} />
  )
}
