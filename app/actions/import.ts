'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getShuffledThemePalette } from '@/lib/theme-colors'
import { archiveChapterForImport } from '@/app/actions/chapters'
import type { ResolvedImport, EntityRef } from '@/lib/import-resolve'

type ImportResult =
  | { error: string }
  | { success: true; counts: { swells: number; motions: number; groups: number; assignments: number } }

export type ImportClearMode = 'none' | 'archive' | 'delete'

// E2EE: content names are encrypted, so the server can no longer dedup the
// import or resolve its name→name links. The client does that (see
// lib/import-resolve) against the existing entities returned here. Only needed
// for clearMode 'none'; archive/delete start from a clean chapter, so the
// client passes empty existing and everything resolves as new.
export async function getImportEntities(): Promise<{
  groups: { id: string; name: string }[]
  swells: { id: string; name: string }[]
  motions: { id: string; name: string }[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { groups: [], swells: [], motions: [] }

  const chapterId = await getActiveChapterId(supabase, user.id)
  const [{ data: groups }, { data: swells }, { data: motions }] = await Promise.all([
    supabase.from('groups').select('id, name').eq('user_id', user.id).eq('chapter_id', chapterId),
    supabase.from('swells').select('id, name').eq('user_id', user.id).eq('chapter_id', chapterId),
    supabase.from('motions').select('id, name').eq('user_id', user.id).eq('chapter_id', chapterId),
  ])
  return { groups: groups ?? [], swells: swells ?? [], motions: motions ?? [] }
}

// Inserts an already-resolved, already-encrypted import plan. The server never
// reads a content name: entities are linked purely by index/id refs the client
// computed. New rows are correlated back to their plan index via sort_order
// (unique within each insert batch and returned by the insert) — robust without
// relying on names or on RETURNING row order.
export async function confirmImport(plan: ResolvedImport, clearMode: ImportClearMode = 'none'): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Archive path: close the current chapter and import into a fresh one.
  // Must run before getActiveChapterId so the import lands in the new chapter.
  if (clearMode === 'archive') {
    const archived = await archiveChapterForImport()
    if ('error' in archived && archived.error) return { error: archived.error }
  }

  const chapterId = await getActiveChapterId(supabase, user.id)

  // Delete path: hard-delete the active chapter's motions, swells, and buckets.
  // Motion deletes cascade to their logs; swell deletes cascade to waypoints.
  if (clearMode === 'delete') {
    const { error: motionErr } = await supabase.from('motions').delete().eq('user_id', user.id).eq('chapter_id', chapterId)
    if (motionErr) return { error: motionErr.message }
    const { error: swellErr } = await supabase.from('swells').delete().eq('user_id', user.id).eq('chapter_id', chapterId)
    if (swellErr) return { error: swellErr.message }
    const { error: groupErr } = await supabase.from('groups').delete().eq('user_id', user.id).eq('chapter_id', chapterId)
    if (groupErr) return { error: groupErr.message }
  }

  const [{ data: settings }, { data: exSwells }, { data: exMotions }, { data: exGroups }] = await Promise.all([
    supabase.from('user_settings').select('theme').eq('user_id', user.id).single(),
    supabase.from('swells').select('sort_order').eq('user_id', user.id).eq('chapter_id', chapterId),
    supabase.from('motions').select('sort_order').eq('user_id', user.id).eq('chapter_id', chapterId),
    supabase.from('groups').select('sort_order').eq('user_id', user.id).eq('chapter_id', chapterId),
  ])

  const palette = getShuffledThemePalette(settings?.theme ?? 'biarritz', 'light')
  const groupSortBase = Math.max(-1, ...((exGroups ?? []).map(g => g.sort_order))) + 1
  const swellSortBase = Math.max(-1, ...((exSwells ?? []).map(s => s.sort_order))) + 1
  const motionSortBase = Math.max(-1, ...((exMotions ?? []).map(m => m.sort_order))) + 1

  // Insert new buckets. sort_order = base + planIndex, so the inserted id maps
  // straight back to its plan index without reading names.
  const newGroupIds: string[] = new Array(plan.newGroups.length)
  if (plan.newGroups.length > 0) {
    const rows = plan.newGroups.map((g, i) => ({
      user_id: user.id,
      chapter_id: chapterId,
      name: g.name,
      color: palette[(i + 5) % palette.length],
      sort_order: groupSortBase + i,
    }))
    const { data: inserted, error } = await supabase.from('groups').insert(rows).select('id, sort_order')
    if (error) return { error: error.message }
    for (const r of inserted ?? []) newGroupIds[r.sort_order - groupSortBase] = r.id
  }

  // Insert new swells (targets were computed client-side).
  const newSwellIds: string[] = new Array(plan.newSwells.length)
  if (plan.newSwells.length > 0) {
    const rows = plan.newSwells.map((s, i) => ({
      user_id: user.id,
      chapter_id: chapterId,
      name: s.name,
      color: palette[i % palette.length],
      sort_order: swellSortBase + i,
      target_points: s.targetPoints,
      target_hours: s.targetHours,
    }))
    const { data: inserted, error } = await supabase.from('swells').insert(rows).select('id, sort_order')
    if (error) return { error: error.message }
    for (const r of inserted ?? []) newSwellIds[r.sort_order - swellSortBase] = r.id
  }

  const resolveGroup = (ref: EntityRef): string | null =>
    'existingId' in ref ? ref.existingId : (newGroupIds[ref.newIndex] ?? null)

  // Insert new motions, resolving each bucket ref to a concrete id.
  const newMotionIds: string[] = new Array(plan.newMotions.length)
  if (plan.newMotions.length > 0) {
    const rows = plan.newMotions.map((m, i) => ({
      user_id: user.id,
      chapter_id: chapterId,
      name: m.name,
      default_points: m.points,
      default_hours: m.hours,
      group_id: m.group ? resolveGroup(m.group) : null,
      sort_order: motionSortBase + i,
    }))
    const { data: inserted, error } = await supabase.from('motions').insert(rows).select('id, sort_order')
    if (error) return { error: error.message }
    for (const r of inserted ?? []) newMotionIds[r.sort_order - motionSortBase] = r.id
  }

  const resolveSwell = (ref: EntityRef): string | null =>
    'existingId' in ref ? ref.existingId : (newSwellIds[ref.newIndex] ?? null)
  const resolveMotion = (ref: EntityRef): string | null =>
    'existingId' in ref ? ref.existingId : (newMotionIds[ref.newIndex] ?? null)

  const junctionRows = plan.junctions
    .map(j => ({
      motion_id: resolveMotion(j.motion),
      swell_id: resolveSwell(j.swell),
      contribution_weight: j.weight,
    }))
    .filter((r): r is { motion_id: string; swell_id: string; contribution_weight: number } => !!r.motion_id && !!r.swell_id)

  if (junctionRows.length > 0) {
    const { error: junctionErr } = await supabase.from('motion_swells').insert(junctionRows)
    if (junctionErr) return { error: junctionErr.message }
  }

  // An import that brings buckets should leave the buckets UI switched on,
  // otherwise the imported organization is invisible until the user finds
  // the Settings toggle. (User-facing word is "buckets" per ADR 0012.)
  if (plan.enableGroups) {
    const { error: gErr } = await supabase.from('user_settings').upsert({ user_id: user.id, groups_enabled: true })
    // Don't fail the whole import over this — the entities were already created.
    if (gErr) console.error('Import succeeded but enabling buckets failed:', gErr.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')

  return {
    success: true,
    counts: {
      swells: plan.newSwells.length,
      motions: plan.newMotions.length,
      groups: plan.newGroups.length,
      assignments: junctionRows.length,
    },
  }
}
