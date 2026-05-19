'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pacificDayKey, type DayKey } from '@/lib/periods'
import { closedWeekFor } from '@/lib/cycles'
import { getLastWeekStart, getWeekStart } from '@/lib/timezone'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type WeekCeremonyState = 'none' | 'pending' | 'completed'

// Server-side: determine whether the user has a pending weekly ceremony.
// 'none'      → no closed-week log activity (wave-cycle case) or no chapter
// 'pending'   → logs exist for the closed week and no reflection saved yet
// 'completed' → a reflection row already exists for the closed week
//
// Reflections are chapter-scoped — only the active chapter is considered.
export async function getWeekCeremonyState(
  supabase: SupabaseClient,
  userId: string,
  todayKey: DayKey,
): Promise<{ state: WeekCeremonyState; cycleStart: DayKey; cycleEnd: DayKey; chapterId: string | null }> {
  const { cycleStart, cycleEnd } = closedWeekFor(todayKey)

  const [{ data: chapter }, lastWeekStartDate, thisWeekStartDate] = await Promise.all([
    supabase
      .from('chapters')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle(),
    getLastWeekStart(),
    getWeekStart(),
  ])

  if (!chapter?.id) {
    return { state: 'none', cycleStart, cycleEnd, chapterId: null }
  }

  // Did the user log anything in the just-closed week? Pacific bounds.
  const [{ count: logCount }, { data: existing }] = await Promise.all([
    supabase
      .from('logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('logged_at', lastWeekStartDate.toISOString())
      .lt('logged_at', thisWeekStartDate.toISOString()),
    supabase
      .from('reflections')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapter.id)
      .eq('cycle_type', 'week')
      .eq('cycle_start', cycleStart)
      .maybeSingle(),
  ])

  if (existing?.id) return { state: 'completed', cycleStart, cycleEnd, chapterId: chapter.id }
  if (!logCount || logCount === 0) return { state: 'none', cycleStart, cycleEnd, chapterId: chapter.id }
  return { state: 'pending', cycleStart, cycleEnd, chapterId: chapter.id }
}

export async function saveWeekReflection(input: {
  cycleStart: DayKey
  cycleEnd: DayKey
  expectationText: string | null
  observationText: string | null
  didTune: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Resolve active chapter; abort if there isn't one (shouldn't happen post-backfill).
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()
  if (!chapter?.id) return { error: 'No active chapter' }

  const trimmedExpectation = input.expectationText?.trim() || null
  const trimmedObservation = input.observationText?.trim() || null

  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    chapter_id: chapter.id,
    cycle_type: 'week',
    cycle_start: input.cycleStart,
    cycle_end: input.cycleEnd,
    expectation_text: trimmedExpectation,
    observation_text: trimmedObservation,
    did_tune: input.didTune,
  })

  if (error) return { error: error.message }

  revalidatePath('/reflections')
  revalidatePath('/reflections/ceremony/week')
  return { success: true }
}

// Helper for surfaces that just need the boolean indicator. Wraps the full
// state fetch and resolves today's day key from the server clock.
export async function fetchWeekCeremonyPending(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const todayKey = pacificDayKey(new Date())
  const { state } = await getWeekCeremonyState(supabase, user.id, todayKey)
  return state === 'pending'
}
