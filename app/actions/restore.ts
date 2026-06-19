'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { archiveChapterForImport } from '@/app/actions/chapters'
import type { ResolvedRestore, ChapterRef } from '@/lib/restore-resolve'
import type { EntityRef } from '@/lib/import-resolve'
import type { ImportClearMode } from '@/app/actions/import'

type RestoreResult =
  | { error: string }
  | { success: true; counts: { chapters: number; swells: number; motions: number; buckets: number; logs: number; waypoints: number; anchors: number } }

// Inserts an already-re-encrypted, index-referenced restore plan across all
// chapters. Like confirmImport, the server never reads a content name: new rows
// correlate to their plan index by sort_order, relationships arrive as index/id
// refs, and each chapter-scoped row carries a ChapterRef the server resolves to
// a concrete chapter id. The export's active chapter maps to the user's current
// active chapter; archived chapters are recreated (preserving started/ended
// timestamps) so past history comes back intact. Spec:
// docs/specs/private-content-encryption.md.
export async function restoreExport(plan: ResolvedRestore, clearMode: ImportClearMode = 'none'): Promise<RestoreResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const uid = user.id

  if (clearMode === 'archive') {
    const archived = await archiveChapterForImport()
    if ('error' in archived && archived.error) return { error: archived.error }
  }

  const activeChapterId = await getActiveChapterId(supabase, uid)

  // Full wipe of the active chapter before restoring into it. Motion deletes
  // cascade to logs; swell deletes cascade to waypoints; anchors and waves
  // reference the chapter directly, so clear them explicitly.
  if (clearMode === 'delete') {
    for (const table of ['reflections', 'wave_checkins', 'motions', 'swells', 'groups'] as const) {
      const { error } = await supabase.from(table).delete().eq('user_id', uid).eq('chapter_id', activeChapterId)
      if (error) return { error: error.message }
    }
  }

  // Recreate the archived chapters (preserve started/ended; assign fresh,
  // non-colliding sort_order — chapters display by started_at).
  const { data: existingChapters } = await supabase.from('chapters').select('sort_order').eq('user_id', uid)
  let chapterSort = Math.max(0, ...((existingChapters ?? []).map(c => c.sort_order))) + 1
  const archivedChapterIds: string[] = []
  for (const ch of plan.chapters) {
    const { data, error } = await supabase
      .from('chapters')
      .insert({ user_id: uid, started_at: ch.startedAt, ended_at: ch.endedAt, sort_order: chapterSort++ })
      .select('id')
      .single()
    if (error) return { error: error.message }
    archivedChapterIds.push(data!.id)
  }
  const resolveChapter = (ref: ChapterRef): string =>
    'active' in ref ? activeChapterId : (archivedChapterIds[ref.archivedIndex] ?? activeChapterId)

  const [{ data: exSwells }, { data: exMotions }, { data: exGroups }] = await Promise.all([
    supabase.from('swells').select('sort_order').eq('user_id', uid),
    supabase.from('motions').select('sort_order').eq('user_id', uid),
    supabase.from('groups').select('sort_order').eq('user_id', uid),
  ])
  const groupSortBase = Math.max(-1, ...((exGroups ?? []).map(g => g.sort_order))) + 1
  const swellSortBase = Math.max(-1, ...((exSwells ?? []).map(s => s.sort_order))) + 1
  const motionSortBase = Math.max(-1, ...((exMotions ?? []).map(m => m.sort_order))) + 1

  // --- Structure (sort_order = base + planIndex correlates ids back) ---
  const newGroupIds: string[] = new Array(plan.newGroups.length)
  if (plan.newGroups.length > 0) {
    const rows = plan.newGroups.map((g, i) => ({
      user_id: uid, chapter_id: resolveChapter(g.chapter), name: g.name, color: g.color, sort_order: groupSortBase + i,
    }))
    const { data, error } = await supabase.from('groups').insert(rows).select('id, sort_order')
    if (error) return { error: error.message }
    for (const r of data ?? []) newGroupIds[r.sort_order - groupSortBase] = r.id
  }

  const newSwellIds: string[] = new Array(plan.newSwells.length)
  if (plan.newSwells.length > 0) {
    const rows = plan.newSwells.map((s, i) => ({
      user_id: uid, chapter_id: resolveChapter(s.chapter), name: s.name, color: s.color,
      target_points: s.targetPoints, target_hours: s.targetHours, sort_order: swellSortBase + i,
    }))
    const { data, error } = await supabase.from('swells').insert(rows).select('id, sort_order')
    if (error) return { error: error.message }
    for (const r of data ?? []) newSwellIds[r.sort_order - swellSortBase] = r.id
  }

  const resolveGroup = (ref: EntityRef): string | null =>
    'existingId' in ref ? ref.existingId : (newGroupIds[ref.newIndex] ?? null)

  const newMotionIds: string[] = new Array(plan.newMotions.length)
  if (plan.newMotions.length > 0) {
    const rows = plan.newMotions.map((m, i) => ({
      user_id: uid, chapter_id: resolveChapter(m.chapter), name: m.name,
      default_points: m.points, default_hours: m.hours, hidden: m.hidden,
      group_id: m.group ? resolveGroup(m.group) : null, sort_order: motionSortBase + i,
    }))
    const { data, error } = await supabase.from('motions').insert(rows).select('id, sort_order')
    if (error) return { error: error.message }
    for (const r of data ?? []) newMotionIds[r.sort_order - motionSortBase] = r.id
  }

  const resolveSwell = (ref: EntityRef): string | null =>
    'existingId' in ref ? ref.existingId : (newSwellIds[ref.newIndex] ?? null)
  const resolveMotion = (ref: EntityRef): string | null =>
    'existingId' in ref ? ref.existingId : (newMotionIds[ref.newIndex] ?? null)

  // Second pass: submotion parent links.
  for (let i = 0; i < plan.newMotions.length; i++) {
    const parent = plan.newMotions[i].parent
    const childId = newMotionIds[i]
    if (!parent || !childId) continue
    const parentId = resolveMotion(parent)
    if (parentId) await supabase.from('motions').update({ parent_id: parentId }).eq('id', childId).eq('user_id', uid)
  }

  // --- Junctions ---
  const junctionRows = plan.junctions
    .map(j => ({ motion_id: resolveMotion(j.motion), swell_id: resolveSwell(j.swell), contribution_weight: j.weight }))
    .filter((r): r is { motion_id: string; swell_id: string; contribution_weight: number } => !!r.motion_id && !!r.swell_id)
  if (junctionRows.length > 0) {
    const { error } = await supabase.from('motion_swells').insert(junctionRows)
    if (error) return { error: error.message }
  }

  // --- Logs (preserve logged_at + intensity, routed to their chapter) ---
  const logRows = plan.logs
    .map(l => ({ motion_id: resolveMotion(l.motion), user_id: uid, chapter_id: resolveChapter(l.chapter), points: l.points, hours: l.hours, intensity: l.intensity ?? 'medium', logged_at: l.loggedAt }))
    .filter((r): r is typeof r & { motion_id: string } => !!r.motion_id)
  if (logRows.length > 0) {
    const { error } = await supabase.from('logs').insert(logRows)
    if (error) return { error: error.message }
  }

  // --- Waypoints (milestones inherit chapter via swell) ---
  const waypointRows = plan.waypoints
    .map(w => {
      const swellId = resolveSwell(w.swell)
      if (!swellId) return null
      return {
        user_id: uid, swell_id: swellId, motion_id: w.motion ? resolveMotion(w.motion) : null, name: w.name,
        kind: w.kind, cadence: w.cadence, target_count: w.targetCount, completed_at: w.completedAt, bonus_points: w.bonusPoints,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  if (waypointRows.length > 0) {
    const { error } = await supabase.from('milestones').insert(waypointRows)
    if (error) return { error: error.message }
  }

  // --- Waves ---
  if (plan.waves.length > 0) {
    const waveRows = plan.waves.map(w => ({
      user_id: uid, chapter_id: resolveChapter(w.chapter), energy: w.energy, alignment: w.alignment,
      duration_seconds: w.durationSeconds, checked_in_at: w.checkedInAt,
    }))
    const { error } = await supabase.from('wave_checkins').insert(waveRows)
    if (error) return { error: error.message }
  }

  // --- Anchors (reflections) — preserve created_at, routed to their chapter ---
  if (plan.anchors.length > 0) {
    const anchorRows = plan.anchors.map(a => ({
      user_id: uid, chapter_id: resolveChapter(a.chapter), cycle_type: a.cycleType,
      cycle_start: a.cycleStart, cycle_end: a.cycleEnd,
      expectation_text: a.expectationText, observation_text: a.observationText, intention_text: a.intentionText,
      did_tune: a.didTune, body_text: a.bodyText, prompt_text: a.promptText, created_at: a.createdAt,
    }))
    const { error } = await supabase.from('reflections').insert(anchorRows)
    if (error) return { error: error.message }
  }

  if (plan.enableGroups) {
    const { error } = await supabase.from('user_settings').upsert({ user_id: uid, groups_enabled: true })
    if (error) console.error('Restore succeeded but enabling buckets failed:', error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/anchors')
  revalidatePath('/settings')

  return {
    success: true,
    counts: {
      chapters: plan.chapters.length, swells: plan.newSwells.length, motions: plan.newMotions.length,
      buckets: plan.newGroups.length, logs: logRows.length, waypoints: waypointRows.length, anchors: plan.anchors.length,
    },
  }
}
