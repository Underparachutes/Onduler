'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pacificDayKey, type DayKey } from '@/lib/periods'

// Archived-chapter list (Past chapters browse). Returns chapters whose
// ended_at IS NOT NULL, newest-first by sort_order. log_count is included
// so the list row can show how lived-in the chapter was.
export type ArchivedChapterSummary = {
  id: string
  startedAt: string
  endedAt: string
  sortOrder: number
  logCount: number
}

export async function listArchivedChapters(): Promise<ArchivedChapterSummary[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: chapters }, { data: logs }] = await Promise.all([
    supabase
      .from('chapters')
      .select('id, started_at, ended_at, sort_order')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)
      .order('sort_order', { ascending: false }),
    supabase
      .from('logs')
      .select('chapter_id')
      .eq('user_id', user.id),
  ])

  const counts = new Map<string, number>()
  for (const l of logs ?? []) {
    counts.set(l.chapter_id, (counts.get(l.chapter_id) ?? 0) + 1)
  }

  return (chapters ?? []).map(c => ({
    id: c.id,
    startedAt: c.started_at,
    endedAt: c.ended_at as string,
    sortOrder: c.sort_order ?? 0,
    logCount: counts.get(c.id) ?? 0,
  }))
}

// Single archived chapter view (Past chapters detail). Read-only — returns
// the chapter row + the swells, motions, log count, and the full anchor list
// (with per-ceremony actuals already re-aggregated from the chapter's own
// logs + motion_swells weights, so each FrozenRadar renders against the
// shape that lived in the chapter — not today's).
// Returns null if the chapter doesn't exist, isn't owned by the user, or is
// still active (active-chapter browse belongs to the live app, not this surface).
export type ArchivedChapterAnchor = {
  id: string
  cycleType: 'week' | 'month' | 'quarter' | 'year' | 'free'
  cycleStart: DayKey | null
  cycleEnd: DayKey | null
  expectationText: string | null
  observationText: string | null
  didTune: boolean | null
  bodyText: string | null
  promptText: string | null
  createdAt: string
  // Parallel to ArchivedChapterDetail.swells. Only present for ceremony
  // anchors — null for free anchors.
  actuals: number[] | null
}

export type ArchivedChapterDetail = {
  id: string
  startedAt: string
  endedAt: string
  swells: { id: string; name: string; color: string; target_points: number | null; target_hours: number | null }[]
  motions: { id: string; name: string; default_points: number; default_hours: number }[]
  logCount: number
  anchors: ArchivedChapterAnchor[]
  trackingMode: 'points' | 'hours'
}

type LogWithSwells = {
  points: number
  hours: number
  logged_at: string
  motions: {
    motion_swells?: { contribution_weight: number; swells: { id: string } | null }[]
  } | { motion_swells?: { contribution_weight: number; swells: { id: string } | null }[] }[] | null
}

export async function getArchivedChapterDetail(
  chapterId: string,
): Promise<ArchivedChapterDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, started_at, ended_at')
    .eq('id', chapterId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!chapter?.id || !chapter.ended_at) return null

  const [
    { data: swells },
    { data: motions },
    { count: logCount },
    { data: anchorRows },
    { data: chapterLogs },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('motions')
      .select('id, name, default_points, default_hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .is('parent_id', null)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId),
    supabase
      .from('reflections')
      .select('id, cycle_type, cycle_start, cycle_end, expectation_text, observation_text, did_tune, body_text, prompt_text, created_at')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false }),
    supabase
      .from('logs')
      .select('points, hours, logged_at, motions(motion_swells(contribution_weight, swells(id)))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId),
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'
  const swellsRows = swells ?? []
  const logsForActuals = (chapterLogs ?? []) as LogWithSwells[]

  function actualsForCycle(cycleStart: DayKey, cycleEnd: DayKey): number[] {
    const acc = new Map<string, number>()
    swellsRows.forEach(s => acc.set(s.id, 0))
    for (const log of logsForActuals) {
      const day = pacificDayKey(log.logged_at)
      if (day < cycleStart || day > cycleEnd) continue
      const motion = Array.isArray(log.motions) ? log.motions[0] : log.motions
      motion?.motion_swells?.forEach(ms => {
        if (!ms.swells) return
        if (!acc.has(ms.swells.id)) return
        const weight = Number(ms.contribution_weight) || 1
        const inc = isHours ? Number(log.hours) * weight : Math.floor(log.points * weight)
        acc.set(ms.swells.id, (acc.get(ms.swells.id) ?? 0) + inc)
      })
    }
    return swellsRows.map(s => acc.get(s.id) ?? 0)
  }

  const anchors: ArchivedChapterAnchor[] = (anchorRows ?? []).map(a => ({
    id: a.id,
    cycleType: a.cycle_type,
    cycleStart: a.cycle_start,
    cycleEnd: a.cycle_end,
    expectationText: a.expectation_text,
    observationText: a.observation_text,
    didTune: a.did_tune,
    bodyText: a.body_text,
    promptText: a.prompt_text,
    createdAt: a.created_at,
    actuals:
      a.cycle_type !== 'free' && a.cycle_start && a.cycle_end && swellsRows.length >= 3
        ? actualsForCycle(a.cycle_start, a.cycle_end)
        : null,
  }))

  return {
    id: chapter.id,
    startedAt: chapter.started_at,
    endedAt: chapter.ended_at as string,
    swells: swellsRows,
    motions: motions ?? [],
    logCount: logCount ?? 0,
    anchors,
    trackingMode,
  }
}

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

  const rolloverErr = await rolloverChapter(supabase, user.id)
  if (rolloverErr) return { error: rolloverErr }

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

// Archive variant for the LLM import flow: ends the active chapter and starts
// a fresh one, but keeps onboarding_complete true so the user is NOT routed
// back through /onboarding — the import itself populates the new chapter.
// Build slots and welcome-back state still reset since they reference swells
// that just got archived.
export async function archiveChapterForImport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const rolloverErr = await rolloverChapter(supabase, user.id)
  if (rolloverErr) return { error: rolloverErr }

  await supabase
    .from('user_settings')
    .update({
      primary_build: null,
      secondary_build: null,
      mvs_motions: null,
      welcome_back_mode: null,
      welcome_back_started_at: null,
    })
    .eq('user_id', user.id)

  revalidatePath('/', 'layout')

  return { success: true }
}

// Permanently delete an archived chapter and everything in it. Every
// chapter-scoped table (motions, swells, groups, logs, wave_checkins,
// reflections) has ON DELETE CASCADE on chapter_id, so removing the chapter
// row removes the lot. The active chapter is refused — archive it first.
export async function deleteArchivedChapter(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, ended_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!chapter?.id) return { error: 'Chapter not found' }
  if (!chapter.ended_at) return { error: 'The active chapter cannot be deleted' }

  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// Shared core of the two archive actions: end the active chapter (if any)
// and insert the next one. Returns an error message string, or null on success.
async function rolloverChapter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const now = new Date().toISOString()

  // 1. End the active chapter (if any).
  const { data: active } = await supabase
    .from('chapters')
    .select('id, sort_order')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()

  let nextSortOrder = 0
  if (active?.id) {
    await supabase
      .from('chapters')
      .update({ ended_at: now })
      .eq('id', active.id)
      .eq('user_id', userId)
    nextSortOrder = (active.sort_order ?? 0) + 1
  }

  // 2. Create the new active chapter.
  const { error: insertErr } = await supabase
    .from('chapters')
    .insert({ user_id: userId, started_at: now, sort_order: nextSortOrder })
  return insertErr ? insertErr.message : null
}
