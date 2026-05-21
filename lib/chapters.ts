// Active-chapter resolution (ADR 0009).
//
// Every read/write of the entity tables (motions/swells/groups/logs/
// wave_checkins) scopes by chapter_id. This helper returns the user's
// active chapter id and lazily creates one if missing — handles the
// new-signup case where no chapter exists yet.

import { createClient } from './supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Fetches the user's active chapter (ended_at IS NULL). If none exists,
// inserts a fresh one with started_at = now() and returns its id. The
// chapters_one_active_per_user unique index guarantees idempotency under
// concurrent calls — at most one insert wins.
export async function getActiveChapterId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('chapters')
    .select('id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: inserted, error } = await supabase
    .from('chapters')
    .insert({ user_id: userId })
    .select('id')
    .single()

  // Race-loser retry: another concurrent insert won. Re-fetch.
  if (error) {
    const { data: retry } = await supabase
      .from('chapters')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle()
    if (retry?.id) return retry.id
    throw new Error(`Failed to resolve active chapter: ${error.message}`)
  }

  return inserted.id
}
