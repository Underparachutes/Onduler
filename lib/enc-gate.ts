import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// One-time content-encryption gate for authenticated content surfaces. An
// onboarded user whose rows aren't yet ciphertext is routed to /protect, which
// sets up keys (if needed), unlocks, migrates their content, flips enc_enabled,
// then sends them back in. Un-onboarded users are left alone (they have no
// content yet — they migrate after onboarding). Spec: docs/specs/private-content-encryption.md
//
// The dashboard inlines this check (it already loads user_settings); call this
// helper from the other content entry points (swells, anchors, settings).
export async function gateContentEncryption(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from('user_settings')
    .select('onboarding_complete, enc_enabled')
    .eq('user_id', user.id)
    .single()

  if (data?.onboarding_complete && !data.enc_enabled) redirect('/protect')
}
