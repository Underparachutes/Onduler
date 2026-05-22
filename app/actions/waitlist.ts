'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinWaitlist(
  email: string,
  frustration: string | null,
  source: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) {
    return { ok: false, error: 'Enter a valid email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('waitlist')
    .upsert({ email: trimmed, frustration, source }, { onConflict: 'email' })

  if (error) return { ok: false, error: 'Something went wrong. Try again.' }
  return { ok: true }
}
