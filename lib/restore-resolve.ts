// Client-side resolution for restore-from-export (E2EE).
//
// The export references entities by their OLD ids (a log's motion_id, a motion's
// swell links, a swell's chapter_id). On restore those ids are gone — new rows
// get new ids. This module turns the old-id graph into index/id references the
// server can act on without ever reading a name, mirroring lib/import-resolve.
//
// Multi-chapter: the export carries every chapter. Archived chapters are
// recreated; the export's active chapter maps onto the user's current active
// chapter. Each chapter-scoped entity is tagged with a ChapterRef so the server
// routes it to the right chapter. Dedup-by-name applies only WITHIN the active
// chapter (against existing active-chapter entities); archived-chapter entities
// are always new. Legacy v1/v2 files (no `chapters`) are treated as one active
// chapter.
//
// Contract: restore is built for recovery into a clean state (the UI recommends
// clearing first). Merge ('none') still works: junctions are created only for
// NEW motions; history (logs, waves, anchors) is always added.

import type { ExportPayload } from '@/lib/export-format'
import type { EntityRef, ExistingEntities } from '@/lib/import-resolve'

// Which chapter an entity lands in: the user's current active chapter, or one of
// the archived chapters this restore creates (by index into plan.chapters).
export type ChapterRef = { active: true } | { archivedIndex: number }

export type ResolvedRestore = {
  chapters: { startedAt: string; endedAt: string; sortOrder: number }[]
  newGroups: { name: string; color: string; chapter: ChapterRef }[]
  newSwells: { name: string; color: string; targetPoints: number | null; targetHours: number | null; chapter: ChapterRef }[]
  newMotions: { name: string; points: number; hours: number; hidden: boolean; group: EntityRef | null; parent: EntityRef | null; chapter: ChapterRef }[]
  junctions: { motion: EntityRef; swell: EntityRef; weight: number }[]
  logs: { motion: EntityRef; points: number; hours: number; intensity: string | null; loggedAt: string; chapter: ChapterRef }[]
  waypoints: { name: string; swell: EntityRef; motion: EntityRef | null; kind: string; cadence: string | null; targetCount: number | null; completedAt: string | null; bonusPoints: number | null }[]
  waves: { energy: number; alignment: number; durationSeconds: number | null; checkedInAt: string; chapter: ChapterRef }[]
  anchors: {
    cycleType: string
    cycleStart: string | null
    cycleEnd: string | null
    expectationText: string | null
    observationText: string | null
    intentionText: string | null
    didTune: boolean | null
    bodyText: string | null
    promptText: string | null
    createdAt: string
    chapter: ChapterRef
  }[]
  enableGroups: boolean
}

const key = (s: string) => s.trim().toLowerCase()

export function resolveRestore(payload: ExportPayload, existing: ExistingEntities): ResolvedRestore {
  const hasChapters = payload.chapters.length > 0
  const activeChapterId = payload.chapters.find(c => c.ended_at === null)?.id ?? null
  const archivedChapters = payload.chapters
    .filter(c => c.ended_at !== null)
    .sort((a, b) => a.sort_order - b.sort_order)
  const archivedIndexByOldId = new Map(archivedChapters.map((c, i) => [c.id, i]))

  // Legacy files (no chapters) → everything is the active chapter.
  const isActiveChapter = (cid: string) => !hasChapters || cid === activeChapterId
  const chapterRef = (cid: string): ChapterRef => {
    if (isActiveChapter(cid)) return { active: true }
    const idx = archivedIndexByOldId.get(cid)
    return idx !== undefined ? { archivedIndex: idx } : { active: true }
  }

  const existGroup = new Map(existing.groups.map(g => [key(g.name), g.id]))
  const existSwell = new Map(existing.swells.map(s => [key(s.name), s.id]))
  const existMotion = new Map(existing.motions.map(m => [key(m.name), m.id]))

  // New = not deduped. Only ACTIVE-chapter entities dedup against existing;
  // archived-chapter entities are always recreated.
  const newGroups = payload.buckets.filter(g => !(isActiveChapter(g.chapter_id) && existGroup.has(key(g.name))))
  const newSwells = payload.swells.filter(s => !(isActiveChapter(s.chapter_id) && existSwell.has(key(s.name))))
  const newMotions = payload.motions.filter(m => !(isActiveChapter(m.chapter_id) && existMotion.has(key(m.name))))

  const newGroupIdxByOldId = new Map(newGroups.map((g, i) => [g.id, i]))
  const newSwellIdxByOldId = new Map(newSwells.map((s, i) => [s.id, i]))
  const newMotionIdxByOldId = new Map(newMotions.map((m, i) => [m.id, i]))

  const exportGroupById = new Map(payload.buckets.map(g => [g.id, g]))
  const exportSwellById = new Map(payload.swells.map(s => [s.id, s]))
  const exportMotionById = new Map(payload.motions.map(m => [m.id, m]))

  // Resolve an OLD id to a ref: new (by index) or existing (deduped by name in
  // the active chapter), or null if the entity isn't in the export.
  const refFor = (
    oldId: string | null,
    newIdx: Map<string, number>,
    exportById: Map<string, { name: string }>,
    exist: Map<string, string>,
  ): EntityRef | null => {
    if (!oldId) return null
    if (newIdx.has(oldId)) return { newIndex: newIdx.get(oldId)! }
    const e = exportById.get(oldId)
    if (!e) return null
    const id = exist.get(key(e.name))
    return id ? { existingId: id } : null
  }
  const groupRef = (id: string | null) => refFor(id, newGroupIdxByOldId, exportGroupById, existGroup)
  const swellRef = (id: string | null) => refFor(id, newSwellIdxByOldId, exportSwellById, existSwell)
  const motionRef = (id: string | null) => refFor(id, newMotionIdxByOldId, exportMotionById, existMotion)

  const resolvedGroups = newGroups.map(g => ({ name: g.name, color: g.color, chapter: chapterRef(g.chapter_id) }))
  const resolvedSwells = newSwells.map(s => ({
    name: s.name,
    color: s.color,
    targetPoints: s.target_points,
    targetHours: s.target_hours,
    chapter: chapterRef(s.chapter_id),
  }))
  const resolvedMotions = newMotions.map(m => ({
    name: m.name,
    points: m.default_points,
    hours: m.default_hours,
    hidden: m.hidden,
    group: groupRef(m.group_id),
    parent: motionRef(m.parent_id),
    chapter: chapterRef(m.chapter_id),
  }))

  // Junctions only for NEW motions; refs are global indices, and a motion and
  // the swell it feeds are always in the same chapter, so this is chapter-safe.
  const junctions: ResolvedRestore['junctions'] = []
  const seen = new Set<string>()
  const refKey = (r: EntityRef) => ('existingId' in r ? `e:${r.existingId}` : `n:${r.newIndex}`)
  for (const m of newMotions) {
    const mr = motionRef(m.id)
    if (!mr) continue
    for (const link of m.swells) {
      const sr = swellRef(link.swell_id)
      if (!sr) continue
      const jKey = `${refKey(mr)}|${refKey(sr)}`
      if (seen.has(jKey)) continue
      seen.add(jKey)
      junctions.push({ motion: mr, swell: sr, weight: link.weight })
    }
  }

  const logs: ResolvedRestore['logs'] = []
  for (const l of payload.logs) {
    const mr = motionRef(l.motion_id)
    if (!mr) continue
    logs.push({ motion: mr, points: l.points, hours: l.hours, intensity: l.intensity, loggedAt: l.logged_at, chapter: chapterRef(l.chapter_id) })
  }

  const waypoints: ResolvedRestore['waypoints'] = []
  for (const w of payload.waypoints) {
    const sr = swellRef(w.swell_id)
    if (!sr) continue
    waypoints.push({
      name: w.name,
      swell: sr,
      motion: motionRef(w.motion_id),
      kind: w.kind,
      cadence: w.cadence,
      targetCount: w.target_count,
      completedAt: w.completed_at,
      bonusPoints: w.bonus_points,
    })
  }

  const waves = payload.waves.map(w => ({
    energy: w.energy,
    alignment: w.alignment,
    durationSeconds: w.duration_seconds,
    checkedInAt: w.checked_in_at,
    chapter: chapterRef(w.chapter_id),
  }))

  const anchors = payload.anchors.map(a => ({
    cycleType: a.cycle_type,
    cycleStart: a.cycle_start,
    cycleEnd: a.cycle_end,
    expectationText: a.expectation_text,
    observationText: a.observation_text,
    intentionText: a.intention_text,
    didTune: a.did_tune,
    bodyText: a.body_text,
    promptText: a.prompt_text,
    createdAt: a.created_at,
    chapter: chapterRef(a.chapter_id),
  }))

  return {
    chapters: archivedChapters.map(c => ({ startedAt: c.started_at, endedAt: c.ended_at as string, sortOrder: c.sort_order })),
    newGroups: resolvedGroups,
    newSwells: resolvedSwells,
    newMotions: resolvedMotions,
    junctions,
    logs,
    waypoints,
    waves,
    anchors,
    enableGroups: payload.buckets.length > 0,
  }
}
