'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Archive-and-fresh-start (ADR 0009).
//
// Ends the user's active chapter and starts a new one. Resets the onboarding
// flags + build slots in user_settings so the user lands in a clean app and
// re-onboards from scratch. Archived data stays in place — past motions /
// swells / logs / wave_checkins / reflections all keep their chapter_id and
// become read-only browseable from Settings → Past chapters (future surface).
//
// Idempotent against double-clicks: if no active chapter exists (someone
// already archived), we just create a new one.
export async function archiveAndStartFreshChapter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()

  // 1. End the active chapter (if any).
  const { data: active } = await supabase
    .from('chapters')
    .select('id, sort_order')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()

  let nextSortOrder = 0
  if (active?.id) {
    await supabase
      .from('chapters')
      .update({ ended_at: now })
      .eq('id', active.id)
      .eq('user_id', user.id)
    nextSortOrder = (active.sort_order ?? 0) + 1
  }

  // 2. Create the new active chapter.
  const { error: insertErr } = await supabase
    .from('chapters')
    .insert({ user_id: user.id, started_at: now, sort_order: nextSortOrder })
  if (insertErr) return { error: insertErr.message }

  // 3. Reset onboarding + build slots so the user lands clean and re-picks
  //    a shape. Tracking mode, theme, daily goals, haptics, celebration
  //    stay — those are user-level preferences, not chapter-scoped.
  await supabase
    .from('user_settings')
    .update({
      onboarding_complete: false,
      primary_build: null,
      secondary_build: null,
      mvs_motions: null,
      welcome_back_mode: null,
      welcome_back_started_at: null,
    })
    .eq('user_id', user.id)

  // 4. Wipe every chapter-scoped surface from cache so the new (empty)
  //    chapter renders correctly.
  revalidatePath('/', 'layout')

  return { success: true }
}
