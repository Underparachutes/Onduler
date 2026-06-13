'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WelcomeBackMode } from '@/lib/welcomeback'

export async function setWelcomeBackMode(mode: WelcomeBackMode) {
  if (mode !== 'ease' && mode !== 'full') return { error: 'Invalid mode' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: modeErr } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    welcome_back_mode: mode,
    welcome_back_started_at: new Date().toISOString(),
  })
  if (modeErr) return { error: modeErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  return { success: true }
}

export async function clearWelcomeBack() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: clearErr } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    welcome_back_mode: null,
    welcome_back_started_at: null,
  })
  if (clearErr) return { error: clearErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  return { success: true }
}

// Persists per-shape MVS-motion overrides — the motions that should "still
// show up" when the user returns from a wave. Stored as
// { "<build_key>": ["motion_id", ...] }. Passing motionIds=[] clears the
// override for that shape (the auto-default reapplies).
export async function setMvsMotions(shapeKey: string, motionIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('mvs_motions')
    .eq('user_id', user.id)
    .single()

  const current = (settings?.mvs_motions as Record<string, string[]> | null) ?? {}
  const next = { ...current }
  if (motionIds.length === 0) {
    delete next[shapeKey]
  } else {
    next[shapeKey] = motionIds
  }
  const persisted = Object.keys(next).length === 0 ? null : next

  const { error: mvsErr } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    mvs_motions: persisted,
  })
  if (mvsErr) return { error: mvsErr.message }

  revalidatePath('/settings/shape')
  revalidatePath('/wave/return/welcome')
  return { success: true }
}
