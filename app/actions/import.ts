'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getShuffledThemePalette } from '@/lib/theme-colors'
import { archiveChapterForImport } from '@/app/actions/chapters'
import type { ImportPreview } from '@/lib/import-parser'

type ImportResult =
  | { error: string }
  | { success: true; counts: { swells: number; motions: number; groups: number; assignments: number } }

export type ImportClearMode = 'none' | 'archive' | 'delete'

export async function confirmImport(preview: ImportPreview, clearMode: ImportClearMode = 'none'): Promise<ImportResult> {
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

  const [{ data: settings }, { data: existingSwells }, { data: existingMotions }, { data: existingGroups }] = await Promise.all([
    supabase.from('user_settings').select('theme, tracking_mode').eq('user_id', user.id).single(),
    supabase.from('swells').select('name, sort_order').eq('user_id', user.id).eq('chapter_id', chapterId),
    supabase.from('motions').select('name, sort_order').eq('user_id', user.id).eq('chapter_id', chapterId),
    supabase.from('groups').select('name, sort_order').eq('user_id', user.id).eq('chapter_id', chapterId),
  ])

  const palette = getShuffledThemePalette(settings?.theme ?? 'biarritz', 'light')

  const existingSwellNames = new Set((existingSwells ?? []).map(s => s.name.trim().toLowerCase()))
  const existingMotionNames = new Set((existingMotions ?? []).map(m => m.name.trim().toLowerCase()))
  const existingGroupNames = new Set((existingGroups ?? []).map(g => g.name.trim().toLowerCase()))

  const swellSortBase = Math.max(-1, ...((existingSwells ?? []).map(s => s.sort_order))) + 1
  const motionSortBase = Math.max(-1, ...((existingMotions ?? []).map(m => m.sort_order))) + 1
  const groupSortBase = Math.max(-1, ...((existingGroups ?? []).map(g => g.sort_order))) + 1

  // Insert groups
  const newGroups = preview.groups.filter(g => !existingGroupNames.has(g.name.trim().toLowerCase()))
  const nameToGroupId = new Map<string, string>()

  if (newGroups.length > 0) {
    const groupRows = newGroups.map((g, i) => ({
      user_id: user.id,
      chapter_id: chapterId,
      name: g.name,
      color: palette[(i + 5) % palette.length],
      sort_order: groupSortBase + i,
    }))
    const { data: inserted, error: groupErr } = await supabase.from('groups').insert(groupRows).select('id, name')
    if (groupErr) return { error: groupErr.message }
    for (const row of inserted ?? []) {
      nameToGroupId.set(row.name.trim().toLowerCase(), row.id)
    }
  }

  // Also map existing groups by name for assignments
  for (const g of existingGroups ?? []) {
    // Don't overwrite newly inserted (they take priority in the map, but existing should be available too)
    const key = g.name.trim().toLowerCase()
    if (!nameToGroupId.has(key)) {
      // Need the id — re-fetch isn't ideal but existing groups are already in scope
    }
  }
  // Fetch existing group IDs for assignment mapping
  if ((existingGroups ?? []).length > 0) {
    const { data: existingGroupsWithIds } = await supabase
      .from('groups')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
    for (const g of existingGroupsWithIds ?? []) {
      const key = g.name.trim().toLowerCase()
      if (!nameToGroupId.has(key)) {
        nameToGroupId.set(key, g.id)
      }
    }
  }

  // Build group assignment lookup: motionName → groupId
  const motionGroupMap = new Map<string, string>()
  for (const a of preview.groupAssignments) {
    const gid = nameToGroupId.get(a.groupName.trim().toLowerCase())
    if (gid) motionGroupMap.set(a.motionName.trim().toLowerCase(), gid)
  }

  // Insert swells
  const newSwells = preview.swells.filter(s => !existingSwellNames.has(s.name.trim().toLowerCase()))
  const nameToSwellId = new Map<string, string>()

  if (newSwells.length > 0) {
    // Motion-derived target fallback: 4 logs/wk of each feeding motion in
    // points, 3 in hours (split by assignment count, mirroring the junction
    // weights below). The AI's own [target: N] is points-denominated per the
    // prompt, so it only fills target_points; hours always derive. Swells
    // with no feeding motions get the humble placeholders (12 pts / 3 hrs).
    const motionByKey = new Map(preview.motions.map(m => [m.name.trim().toLowerCase(), m]))
    const assignmentCounts = new Map<string, number>()
    for (const a of preview.swellAssignments) {
      const k = a.motionName.trim().toLowerCase()
      assignmentCounts.set(k, (assignmentCounts.get(k) ?? 0) + 1)
    }
    const ptsBySwellKey = new Map<string, number>()
    const hrsBySwellKey = new Map<string, number>()
    for (const a of preview.swellAssignments) {
      const mk = a.motionName.trim().toLowerCase()
      const m = motionByKey.get(mk)
      if (!m) continue
      const w = 1 / (assignmentCounts.get(mk) ?? 1)
      const sk = a.swellName.trim().toLowerCase()
      ptsBySwellKey.set(sk, (ptsBySwellKey.get(sk) ?? 0) + m.points * w)
      hrsBySwellKey.set(sk, (hrsBySwellKey.get(sk) ?? 0) + m.hours * w)
    }

    const swellRows = newSwells.map((s, i) => {
      const k = s.name.trim().toLowerCase()
      const pts = ptsBySwellKey.get(k) ?? 0
      const hrs = hrsBySwellKey.get(k) ?? 0
      return {
        user_id: user.id,
        chapter_id: chapterId,
        name: s.name,
        color: palette[i % palette.length],
        sort_order: swellSortBase + i,
        target_points: s.target ?? (pts > 0 ? Math.ceil(4 * pts) : 12),
        target_hours: hrs > 0 ? Math.ceil(4 * 3 * hrs) / 4 : 3,
      }
    })
    const { data: inserted, error: swellErr } = await supabase.from('swells').insert(swellRows).select('id, name')
    if (swellErr) return { error: swellErr.message }
    for (const row of inserted ?? []) {
      nameToSwellId.set(row.name.trim().toLowerCase(), row.id)
    }
  }

  // Also map existing swells for assignments
  if ((existingSwells ?? []).length > 0) {
    const { data: existingSwellsWithIds } = await supabase
      .from('swells')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
    for (const s of existingSwellsWithIds ?? []) {
      const key = s.name.trim().toLowerCase()
      if (!nameToSwellId.has(key)) {
        nameToSwellId.set(key, s.id)
      }
    }
  }

  // Insert motions
  const newMotions = preview.motions.filter(m => !existingMotionNames.has(m.name.trim().toLowerCase()))
  const nameToMotionId = new Map<string, string>()

  if (newMotions.length > 0) {
    const motionRows = newMotions.map((m, i) => ({
      user_id: user.id,
      chapter_id: chapterId,
      name: m.name,
      default_points: m.points,
      default_hours: m.hours,
      group_id: motionGroupMap.get(m.name.trim().toLowerCase()) ?? null,
      sort_order: motionSortBase + i,
    }))
    const { data: inserted, error: motionErr } = await supabase.from('motions').insert(motionRows).select('id, name')
    if (motionErr) return { error: motionErr.message }
    for (const row of inserted ?? []) {
      nameToMotionId.set(row.name.trim().toLowerCase(), row.id)
    }
  }

  // Insert motion_swells junction
  // Count how many swells each motion feeds to split weight
  const motionSwellCounts = new Map<string, number>()
  for (const a of preview.swellAssignments) {
    const mKey = a.motionName.trim().toLowerCase()
    const sKey = a.swellName.trim().toLowerCase()
    const mid = nameToMotionId.get(mKey)
    const sid = nameToSwellId.get(sKey)
    if (mid && sid) {
      motionSwellCounts.set(mKey, (motionSwellCounts.get(mKey) ?? 0) + 1)
    }
  }

  const junctionRows: { motion_id: string; swell_id: string; contribution_weight: number }[] = []
  const seenJunctions = new Set<string>()

  for (const a of preview.swellAssignments) {
    const mKey = a.motionName.trim().toLowerCase()
    const sKey = a.swellName.trim().toLowerCase()
    const mid = nameToMotionId.get(mKey)
    const sid = nameToSwellId.get(sKey)
    if (!mid || !sid) continue
    const jKey = `${mid}:${sid}`
    if (seenJunctions.has(jKey)) continue
    seenJunctions.add(jKey)

    const count = motionSwellCounts.get(mKey) ?? 1
    const weight = Math.round((1 / count) * 100) / 100

    junctionRows.push({ motion_id: mid, swell_id: sid, contribution_weight: weight })
  }

  if (junctionRows.length > 0) {
    const { error: junctionErr } = await supabase.from('motion_swells').insert(junctionRows)
    if (junctionErr) return { error: junctionErr.message }
  }

  // An import that brings buckets should leave the buckets UI switched on,
  // otherwise the imported organization is invisible until the user finds
  // the Settings toggle. (User-facing word is "buckets" per ADR 0012.)
  if (preview.groups.length > 0) {
    await supabase.from('user_settings').upsert({ user_id: user.id, groups_enabled: true })
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')

  return {
    success: true,
    counts: {
      swells: newSwells.length,
      motions: newMotions.length,
      groups: newGroups.length,
      assignments: junctionRows.length,
    },
  }
}
