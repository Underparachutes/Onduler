'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pacificDayKey, type DayKey } from '@/lib/periods'
import { closedWeekFor, cycleContaining, type Cadence } from '@/lib/cycles'
import { CEREMONY_FLOOR, UNLOCK_FLOOR, logDaysInCycle, unlockedForCadence } from '@/lib/unlocks'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type WeekCeremonyState = 'none' | 'pending' | 'completed'

export type UnlockState = Record<Cadence, boolean>

// Fetches the user's active chapter + distinct log days within the chapter
// window, returning a Set of Pacific day keys. Used by unlock + ceremony
// calculations alike.
async function fetchChapterAndLogDays(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ chapterId: string | null; chapterStart: string | null; logDays: Set<DayKey> }> {
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, started_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()
  if (!chapter?.id) {
    return { chapterId: null, chapterStart: null, logDays: new Set() }
  }
  const { data: logs } = await supabase
    .from('logs')
    .select('logged_at')
    .eq('user_id', userId)
    .gte('logged_at', chapter.started_at)
  const days = new Set<DayKey>()
  for (const l of logs ?? []) {
    days.add(pacificDayKey(l.logged_at))
  }
  return { chapterId: chapter.id, chapterStart: chapter.started_at, logDays: days }
}

// Per-chapter unlock state. A cadence is unlocked once *any* closed cycle
// of that cadence within the active chapter cleared the engagement floor.
// "Once unlocked, stays unlocked for the chapter" (ADR 0007).
export async function getUnlockState(
  supabase: SupabaseClient,
  userId: string,
  todayKey: DayKey,
): Promise<UnlockState> {
  const { logDays } = await fetchChapterAndLogDays(supabase, userId)
  return {
    week: unlockedForCadence(logDays, 'week', todayKey, cycleContaining),
    month: unlockedForCadence(logDays, 'month', todayKey, cycleContaining),
    quarter: unlockedForCadence(logDays, 'quarter', todayKey, cycleContaining),
    year: unlockedForCadence(logDays, 'year', todayKey, cycleContaining),
  }
}

// Server-side: determine whether the user has a pending weekly ceremony.
// 'none'      → wave-cycle (zero logs) or below floor for first-time unlock
// 'pending'   → cycle meets the appropriate floor and no reflection saved
// 'completed' → a reflection row already exists for the closed week
//
// Reflections are chapter-scoped. The applicable floor depends on whether
// weekly is already unlocked: UNLOCK_FLOOR for first-time, CEREMONY_FLOOR
// for subsequent cycles.
export async function getWeekCeremonyState(
  supabase: SupabaseClient,
  userId: string,
  todayKey: DayKey,
): Promise<{ state: WeekCeremonyState; cycleStart: DayKey; cycleEnd: DayKey; chapterId: string | null }> {
  const cycle = closedWeekFor(todayKey)
  const { cycleStart, cycleEnd } = cycle

  const { chapterId, logDays } = await fetchChapterAndLogDays(supabase, userId)
  if (!chapterId) return { state: 'none', cycleStart, cycleEnd, chapterId: null }

  const { data: existing } = await supabase
    .from('reflections')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .eq('cycle_type', 'week')
    .eq('cycle_start', cycleStart)
    .maybeSingle()
  if (existing?.id) return { state: 'completed', cycleStart, cycleEnd, chapterId }

  const closedCycleDays = logDaysInCycle(logDays, cycle)
  const weeklyUnlocked = unlockedForCadence(logDays, 'week', todayKey, cycleContaining)
  const floor = weeklyUnlocked ? CEREMONY_FLOOR.week : UNLOCK_FLOOR.week
  if (closedCycleDays >= floor) return { state: 'pending', cycleStart, cycleEnd, chapterId }
  return { state: 'none', cycleStart, cycleEnd, chapterId }
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
