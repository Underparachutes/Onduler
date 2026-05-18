'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WelcomeBackMode } from '@/lib/welcomeback'

export async function setWelcomeBackMode(mode: WelcomeBackMode) {
  if (mode !== 'ease' && mode !== 'full') return { error: 'Invalid mode' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({
    user_id: user.id,
    welcome_back_mode: mode,
    welcome_back_started_at: new Date().toISOString(),
  })

  revalidatePath('/dashboard')
  revalidatePath('/log')
  return { success: true }
}

export async function clearWelcomeBack() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({
    user_id: user.id,
    welcome_back_mode: null,
    welcome_back_started_at: null,
  })

  revalidatePath('/dashboard')
  revalidatePath('/log')
  return { success: true }
}

// Persists per-shape anchor overrides. Anchors are stored as
// { "<build_key>": ["motion_id", ...] }. Passing motionIds=[] clears the
// override for that shape (the auto-default reapplies).
export async function setMvsAnchors(shapeKey: string, motionIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('mvs_anchors')
    .eq('user_id', user.id)
    .single()

  const current = (settings?.mvs_anchors as Record<string, string[]> | null) ?? {}
  const next = { ...current }
  if (motionIds.length === 0) {
    delete next[shapeKey]
  } else {
    next[shapeKey] = motionIds
  }
  const persisted = Object.keys(next).length === 0 ? null : next

  await supabase.from('user_settings').upsert({
    user_id: user.id,
    mvs_anchors: persisted,
  })

  revalidatePath('/settings/shape')
  revalidatePath('/wave/return/welcome')
  return { success: true }
}
