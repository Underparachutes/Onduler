'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { dayKey, addDays, sundayOf, type DayKey } from '@/lib/periods'
import { getUserTimezone } from '@/lib/user-timezone'
import { startOfDayUtc } from '@/lib/timezone'
import { closedCycleFor, cycleContaining, thisWeekSunday, formatWeekLabel, type CeremonyCadence } from '@/lib/cycles'
import { CEREMONY_FLOOR, UNLOCK_FLOOR, logDaysInCycle, unlockedForCadence } from '@/lib/unlocks'
import { markHintSeen } from '@/app/actions/settings'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type CeremonyState = 'none' | 'pending' | 'completed'

export type UnlockState = Record<CeremonyCadence, boolean>

// Fetches the distinct log days (local-tz day keys) within a chapter. The
// caller resolves the chapter id once (via getActiveChapterId) and threads
// the resulting Set into the unlock + ceremony calcs, so a single page
// render resolves the chapter's log days once rather than per calculation.
// Aggregated in Postgres (log_days_in_chapter, SECURITY INVOKER so RLS
// scopes the scan to the caller) — days come back pre-distinct as local-tz
// 'YYYY-MM-DD', identical to dayKey(logged_at, tz). See
// scripts/migrate-anchors-logdays.sql.
export async function fetchLogDays(
  supabase: SupabaseClient,
  chapterId: string,
  tz: string,
): Promise<Set<DayKey>> {
  const { data: rows } = await supabase.rpc('log_days_in_chapter', {
    p_chapter: chapterId,
    p_tz: tz,
  })
  const days = new Set<DayKey>()
  for (const r of (rows ?? []) as { day: string }[]) {
    days.add(r.day as DayKey)
  }
  return days
}

// Per-chapter unlock state. A cadence is unlocked once *any* closed cycle
// of that cadence within the active chapter cleared the engagement floor.
// "Once unlocked, stays unlocked for the chapter" (ADR 0007). Pure over the
// pre-resolved log-day set — the caller supplies logDays via fetchLogDays.
export async function getUnlockState(
  logDays: Set<DayKey>,
  todayKey: DayKey,
): Promise<UnlockState> {
  return {
    week: unlockedForCadence(logDays, 'week', todayKey, cycleContaining),
    month: unlockedForCadence(logDays, 'month', todayKey, cycleContaining),
    quarter: unlockedForCadence(logDays, 'quarter', todayKey, cycleContaining),
    year: unlockedForCadence(logDays, 'year', todayKey, cycleContaining),
  }
}

// Server-side: determine whether the user has a pending ceremony for the
// given cadence.
// 'none'      → wave-cycle (zero logs) or below floor for first-time unlock
// 'pending'   → cycle meets the appropriate floor and no reflection saved
// 'completed' → a reflection row already exists for the closed cycle
//
// Reflection rows are chapter-scoped (internal table name preserved per
// ADR 0008's internal/external split — surface is Anchors). The applicable
// floor depends on whether the cadence is already unlocked: UNLOCK_FLOOR
// for first-time, CEREMONY_FLOOR for subsequent cycles.
export async function getCeremonyState(
  supabase: SupabaseClient,
  userId: string,
  chapterId: string | null,
  logDays: Set<DayKey>,
  cadence: CeremonyCadence,
  todayKey: DayKey,
): Promise<{ state: CeremonyState; cycleStart: DayKey; cycleEnd: DayKey; chapterId: string | null }> {
  const cycle = closedCycleFor(todayKey, cadence)
  const { cycleStart, cycleEnd } = cycle

  if (!chapterId) return { state: 'none', cycleStart, cycleEnd, chapterId: null }

  const { data: existing } = await supabase
    .from('reflections')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .eq('cycle_type', cadence)
    .eq('cycle_start', cycleStart)
    .maybeSingle()
  if (existing?.id) return { state: 'completed', cycleStart, cycleEnd, chapterId }

  const closedCycleDays = logDaysInCycle(logDays, cycle)
  const isUnlocked = unlockedForCadence(logDays, cadence, todayKey, cycleContaining)
  const floor = isUnlocked ? CEREMONY_FLOOR[cadence] : UNLOCK_FLOOR[cadence]
  if (closedCycleDays >= floor) return { state: 'pending', cycleStart, cycleEnd, chapterId }
  return { state: 'none', cycleStart, cycleEnd, chapterId }
}

export async function saveReflection(input: {
  cadence: CeremonyCadence
  cycleStart: DayKey
  cycleEnd: DayKey
  expectationText: string | null
  observationText: string | null
  intentionText: string | null
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
  const trimmedIntention = input.intentionText?.trim() || null

  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    chapter_id: chapter.id,
    cycle_type: input.cadence,
    cycle_start: input.cycleStart,
    cycle_end: input.cycleEnd,
    expectation_text: trimmedExpectation,
    observation_text: trimmedObservation,
    intention_text: trimmedIntention,
    did_tune: input.didTune,
  })

  if (error) return { error: error.message }

  revalidatePath('/anchors')
  revalidatePath(`/anchors/ceremony/${input.cadence}`)
  markHintSeen('anchors_unlocked')
  return { success: true }
}

// Layout-level helper: true if *any* cadence has a pending ceremony. Used
// to drive the bottom-nav tide-pulse on the Anchors tab. Accepts the
// already-authenticated supabase client and userId from the layout to avoid
// redundant auth round-trips. Queries only the cycle windows that matter
// (not all logs in the chapter).
export async function fetchAnyCeremonyPending(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const tz = await getUserTimezone(userId)
  const todayKey = dayKey(new Date(), tz)

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()
  if (!chapter?.id) return false

  const chapterId = chapter.id
  const cadences: CeremonyCadence[] = ['week', 'month', 'quarter', 'year']

  const checks = await Promise.all(
    cadences.map(async cadence => {
      const cycle = closedCycleFor(todayKey, cadence)

      // Count distinct log days in this cycle window only
      const { data: logRows } = await supabase
        .from('logs')
        .select('logged_at')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .gte('logged_at', startOfDayUtc(cycle.cycleStart, tz).toISOString())
        .lt('logged_at', startOfDayUtc(addDays(cycle.cycleEnd, 1), tz).toISOString())

      const cycleDays = new Set<DayKey>()
      for (const l of logRows ?? []) {
        cycleDays.add(dayKey(l.logged_at, tz))
      }
      const closedCycleDays = cycleDays.size

      // For unlock check, we need to know if any prior closed cycle met
      // the unlock floor. Use the ceremony floor (1) as the optimistic
      // check — if this cycle has zero logs, no ceremony regardless.
      if (closedCycleDays < CEREMONY_FLOOR[cadence]) return false

      // Check if a reflection already exists for this cycle
      const { data: existing } = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .eq('cycle_type', cadence)
        .eq('cycle_start', cycle.cycleStart)
        .maybeSingle()
      if (existing?.id) return false

      // If we're above ceremony floor but need to check unlock floor for
      // first-time unlock, we need the full unlock check. For the layout
      // indicator this is rare — most users will have unlocked weekly
      // within their first week. Accept the slightly optimistic signal:
      // if the cycle has >=1 log day and no reflection saved, show the
      // pulse. The ceremony page itself does the full floor check.
      return true
    }),
  )
  return checks.some(Boolean)
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
  markHintSeen('anchors_unlocked')
  return { success: true }
}

// Update an anchor. Free anchors: body, prompt, cycle editable. Ceremony
// anchors: only expectation_text and observation_text (cycle window stays
// frozen). useActionState-compatible.
export async function updateAnchor(id: string, _prev: unknown, formData: FormData) {
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

  if (row.cycle_type === 'free') {
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
  } else {
    const expectationText = ((formData.get('expectation_text') as string) ?? '').trim() || null
    const observationText = ((formData.get('observation_text') as string) ?? '').trim() || null

    const { error } = await supabase
      .from('reflections')
      .update({
        expectation_text: expectationText,
        observation_text: observationText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
  }

  revalidatePath('/anchors')
  revalidatePath('/anchors/journal')
  return { success: true }
}

// Delete an anchor — free or ceremony. Ceremony anchors were originally
// protected as frozen records, but the journal is the user's library and
// they own what stays in it (decision 2026-06-12). Callers gate with a
// two-tap confirm.
export async function deleteAnchor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: row } = await supabase
    .from('reflections')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row?.id) return { error: 'Anchor not found' }

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

// Period-filtered anchors for the inline log on /anchors. Returns newest
// first, paginated by offset/limit. `periodStart` and `periodEnd` are
// inclusive DayKey boundaries derived from the active period filter.
export async function getAnchorsForPeriod(
  periodStart: DayKey,
  periodEnd: DayKey,
  offset: number = 0,
  limit: number = 10,
): Promise<{ anchors: AnchorRow[]; total: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { anchors: [], total: 0 }

  // Exact local-day window [periodStart 00:00, periodEnd+1 00:00) in the user's
  // tz — no JS re-filter here, so the DB bound must be precise.
  const tz = await getUserTimezone(user.id)
  const lower = startOfDayUtc(periodStart, tz).toISOString()
  const upper = startOfDayUtc(addDays(periodEnd, 1), tz).toISOString()

  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from('reflections')
      .select('id, cycle_type, cycle_start, cycle_end, expectation_text, observation_text, did_tune, body_text, prompt_text, created_at')
      .eq('user_id', user.id)
      .gte('created_at', lower)
      .lt('created_at', upper)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('reflections')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', lower)
      .lt('created_at', upper),
  ])

  return {
    anchors: (rows ?? []).map(a => ({
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
    })),
    total: count ?? 0,
  }
}

// Save a single field on an anchor inline (save-on-blur pattern).
// Free anchors: body_text. Ceremony anchors: expectation_text, observation_text.
export async function updateAnchorField(
  id: string,
  field: 'body_text' | 'expectation_text' | 'observation_text',
  value: string,
): Promise<{ error?: string; success?: boolean }> {
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

  if (row.cycle_type === 'free' && field !== 'body_text') {
    return { error: 'Invalid field for free anchor' }
  }
  if (row.cycle_type !== 'free' && field === 'body_text') {
    return { error: 'Invalid field for ceremony anchor' }
  }

  const trimmed = value.trim() || null
  if (row.cycle_type === 'free' && field === 'body_text' && !trimmed) {
    return { error: 'Anchor cannot be empty' }
  }

  const { error } = await supabase
    .from('reflections')
    .update({ [field]: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/anchors')
  revalidatePath('/anchors/journal')
  return { success: true }
}

// Weekly archive data for the journal rewrite. Returns chapters with their
// week list (every Sun-Sat from first event through chapter end / today).
// Each week carries flags for whether it has logs, anchors, or both.
export type JournalWeek = {
  cycleStart: DayKey
  cycleEnd: DayKey
  label: string
  hasLogs: boolean
  hasAnchors: boolean
  anchors: AnchorRow[]
}

export type JournalChapter = {
  chapterId: string
  startedAt: string
  endedAt: string | null
  weeks: JournalWeek[]
}

export async function getJournalData(): Promise<JournalChapter[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const tz = await getUserTimezone(user.id)
  const todayKey = dayKey(new Date(), tz)

  const [{ data: chapters }, { data: anchors }, { data: logDayRows }] = await Promise.all([
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
    // Distinct (chapter, local-day) pairs, aggregated in Postgres, instead of
    // pulling every log row into Node just to derive per-week presence flags.
    supabase.rpc('log_days_by_chapter', { p_tz: tz }),
  ])

  if (!chapters?.length) return []

  // Build per-chapter sets of log day keys and anchor day keys. Log days come
  // pre-distinct from the RPC (already local-tz 'YYYY-MM-DD', == dayKey output).
  const logDaysByChapter = new Map<string, Set<DayKey>>()
  for (const r of (logDayRows ?? []) as { chapter_id: string; day: string }[]) {
    const set = logDaysByChapter.get(r.chapter_id) ?? new Set()
    set.add(r.day as DayKey)
    logDaysByChapter.set(r.chapter_id, set)
  }

  // Group anchors by chapter, and also track anchor day keys per chapter
  const anchorsByChapter = new Map<string, AnchorRow[]>()
  const anchorDaysByChapter = new Map<string, Set<DayKey>>()
  for (const a of anchors ?? []) {
    const list = anchorsByChapter.get(a.chapter_id) ?? []
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
    anchorsByChapter.set(a.chapter_id, list)

    const daySet = anchorDaysByChapter.get(a.chapter_id) ?? new Set()
    daySet.add(dayKey(a.created_at, tz))
    anchorDaysByChapter.set(a.chapter_id, daySet)
  }

  return chapters.map(ch => {
    const logDays = logDaysByChapter.get(ch.id) ?? new Set<DayKey>()
    const anchorDays = anchorDaysByChapter.get(ch.id) ?? new Set<DayKey>()
    const chapterAnchors = anchorsByChapter.get(ch.id) ?? []

    // Find first event (earliest log or anchor day)
    const allDays = [...logDays, ...anchorDays].sort()
    if (allDays.length === 0) {
      return { chapterId: ch.id, startedAt: ch.started_at, endedAt: ch.ended_at, weeks: [] }
    }
    const firstEventDay = allDays[0]

    // Determine the end boundary
    const endDay = ch.ended_at ? dayKey(ch.ended_at, tz) : todayKey

    // Generate every Sun-Sat from the Sunday containing the first event
    // through the Sunday containing the end day
    const firstSunday = sundayOf(firstEventDay)
    const lastSunday = sundayOf(endDay)

    const weeks: JournalWeek[] = []
    let current = lastSunday

    // Walk backwards from newest week to oldest
    while (current >= firstSunday) {
      const cycleStart = current
      const cycleEnd = addDays(current, 6)
      const label = formatWeekLabel({ cycleStart, cycleEnd })

      // Check if any log days fall in this week
      let hasLogs = false
      for (let d = 0; d < 7; d++) {
        if (logDays.has(addDays(cycleStart, d))) { hasLogs = true; break }
      }

      // Check if any anchor days fall in this week
      let hasAnchors = false
      for (let d = 0; d < 7; d++) {
        if (anchorDays.has(addDays(cycleStart, d))) { hasAnchors = true; break }
      }

      // Collect anchors whose created_at falls in this week
      const weekAnchors = chapterAnchors.filter(a => {
        const day = dayKey(a.created_at, tz)
        return day >= cycleStart && day <= cycleEnd
      })

      weeks.push({ cycleStart, cycleEnd, label, hasLogs, hasAnchors, anchors: weekAnchors })
      current = addDays(current, -7)
    }

    return { chapterId: ch.id, startedAt: ch.started_at, endedAt: ch.ended_at, weeks }
  })
}
