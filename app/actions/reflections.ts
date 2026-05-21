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
// Reflection rows are chapter-scoped (internal table name preserved per
// ADR 0008's internal/external split — surface is Anchors). The applicable
// floor depends on whether weekly is already unlocked: UNLOCK_FLOOR for
// first-time, CEREMONY_FLOOR for subsequent cycles.
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

  revalidatePath('/anchors')
  revalidatePath('/anchors/ceremony/week')
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

// Free-form anchor (cycle_type='free'). Optional prompt header + body text.
// useActionState-compatible signature; the cycle window comes through the
// form as hidden inputs (defaults to the active week, set server-side).
export async function createFreeAnchor(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()
  if (!chapter?.id) return { error: 'No active chapter' }

  const bodyText = ((formData.get('body_text') as string) ?? '').trim()
  if (!bodyText) return { error: 'Anchor cannot be empty' }
  const promptText = ((formData.get('prompt_text') as string) ?? '').trim() || null
  const cycleStart = ((formData.get('cycle_start') as string) ?? '').trim() || null
  const cycleEnd = ((formData.get('cycle_end') as string) ?? '').trim() || null

  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    chapter_id: chapter.id,
    cycle_type: 'free',
    cycle_start: cycleStart,
    cycle_end: cycleEnd,
    body_text: bodyText,
    prompt_text: promptText,
  })

  if (error) return { error: error.message }

  revalidatePath('/anchors')
  revalidatePath('/anchors/journal')
  return { success: true }
}

// Update an existing free-form anchor. Edits to ceremony anchors are
// rejected — those are meant to be frozen records of what the user said
// at cycle close. useActionState-compatible.
export async function updateFreeAnchor(id: string, _prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: row } = await supabase
    .from('reflections')
    .select('id, cycle_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row?.id) return { error: 'Anchor not found' }
  if (row.cycle_type !== 'free') return { error: 'Ceremony anchors cannot be edited' }

  const bodyText = ((formData.get('body_text') as string) ?? '').trim()
  if (!bodyText) return { error: 'Anchor cannot be empty' }
  const promptText = ((formData.get('prompt_text') as string) ?? '').trim() || null
  const cycleStart = ((formData.get('cycle_start') as string) ?? '').trim() || null
  const cycleEnd = ((formData.get('cycle_end') as string) ?? '').trim() || null

  const { error } = await supabase
    .from('reflections')
    .update({
      body_text: bodyText,
      prompt_text: promptText,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/anchors')
  revalidatePath('/anchors/journal')
  return { success: true }
}

// Delete a free-form anchor. Ceremony anchors are protected for the same
// reason updates are — they're frozen records of a cycle close.
export async function deleteFreeAnchor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: row } = await supabase
    .from('reflections')
    .select('id, cycle_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row?.id) return { error: 'Anchor not found' }
  if (row.cycle_type !== 'free') return { error: 'Ceremony anchors cannot be deleted' }

  const { error } = await supabase
    .from('reflections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/anchors')
  revalidatePath('/anchors/journal')
  return { success: true }
}

// Chronological library of every anchor the user has dropped, grouped by
// chapter. Chapters are ordered newest-first (active chapter on top, then
// archived chapters by started_at desc). Within each chapter, anchors are
// ordered newest-first by created_at. Placeholder: ceremony entries are
// returned with their raw fields — the journal page renders a simplified
// card for now; the full closed-radar visual is a follow-up.
export type AnchorRow = {
  id: string
  cycle_type: 'week' | 'month' | 'quarter' | 'year' | 'free'
  cycle_start: DayKey | null
  cycle_end: DayKey | null
  expectation_text: string | null
  observation_text: string | null
  did_tune: boolean | null
  body_text: string | null
  prompt_text: string | null
  created_at: string
}

export type ChapterWithAnchors = {
  chapterId: string
  startedAt: string
  endedAt: string | null
  anchors: AnchorRow[]
}

export async function getAnchorJournal(): Promise<ChapterWithAnchors[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: chapters }, { data: anchors }] = await Promise.all([
    supabase
      .from('chapters')
      .select('id, started_at, ended_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false }),
    supabase
      .from('reflections')
      .select('id, chapter_id, cycle_type, cycle_start, cycle_end, expectation_text, observation_text, did_tune, body_text, prompt_text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const grouped = new Map<string, AnchorRow[]>()
  for (const a of anchors ?? []) {
    const list = grouped.get(a.chapter_id) ?? []
    list.push({
      id: a.id,
      cycle_type: a.cycle_type,
      cycle_start: a.cycle_start,
      cycle_end: a.cycle_end,
      expectation_text: a.expectation_text,
      observation_text: a.observation_text,
      did_tune: a.did_tune,
      body_text: a.body_text,
      prompt_text: a.prompt_text,
      created_at: a.created_at,
    })
    grouped.set(a.chapter_id, list)
  }

  return (chapters ?? []).map(c => ({
    chapterId: c.id,
    startedAt: c.started_at,
    endedAt: c.ended_at,
    anchors: grouped.get(c.id) ?? [],
  }))
}
