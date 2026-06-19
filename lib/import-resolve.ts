// Client-side resolution for the LLM-assisted import (E2EE).
//
// The import graph is expressed by NAME (the AI lists swells/motions/buckets and
// links them by name). Once content names are encrypted, the server can no
// longer read them — so it can't dedup against existing entities or resolve the
// name→name relationships. This module moves all of that into the browser: given
// the parsed preview and the user's existing (decrypted) entities, it produces a
// plan that references entities purely by index/id — never by name. The caller
// then encrypts the new names and hands the plan to confirmImport, which inserts
// blindly. No plaintext name (or name-derived join key) ever reaches the server.
//
// The dedup/target/weight math mirrors the original server-side confirmImport.

import type { ImportPreview } from '@/lib/import-parser'

// A reference to an entity the import touches: one that already exists (by id),
// or one this import will create (by its position in the new* arrays).
export type EntityRef = { existingId: string } | { newIndex: number }

// Existing entities in the target chapter, with names already DECRYPTED by the
// caller. Empty when the import clears/archives first (nothing to dedup against).
export type ExistingEntities = {
  groups: { id: string; name: string }[]
  swells: { id: string; name: string }[]
  motions: { id: string; name: string }[]
}

// Index-referenced insert plan. Names here are still plaintext; the caller
// encrypts them before calling confirmImport.
export type ResolvedImport = {
  newGroups: { name: string }[]
  newSwells: { name: string; targetPoints: number | null; targetHours: number }[]
  newMotions: { name: string; points: number; hours: number; group: EntityRef | null }[]
  junctions: { motion: EntityRef; swell: EntityRef; weight: number }[]
  enableGroups: boolean
}

const key = (s: string) => s.trim().toLowerCase()

export function resolveImport(preview: ImportPreview, existing: ExistingEntities): ResolvedImport {
  const existGroup = new Map(existing.groups.map(g => [key(g.name), g.id]))
  const existSwell = new Map(existing.swells.map(s => [key(s.name), s.id]))
  const existMotion = new Map(existing.motions.map(m => [key(m.name), m.id]))

  // New entities = preview entities not already present (case-insensitive name).
  const newGroups = preview.groups.filter(g => !existGroup.has(key(g.name)))
  const newSwellsRaw = preview.swells.filter(s => !existSwell.has(key(s.name)))
  const newMotionsRaw = preview.motions.filter(m => !existMotion.has(key(m.name)))

  const newGroupIndex = new Map(newGroups.map((g, i) => [key(g.name), i]))
  const newSwellIndex = new Map(newSwellsRaw.map((s, i) => [key(s.name), i]))
  const newMotionIndex = new Map(newMotionsRaw.map((m, i) => [key(m.name), i]))

  const refFor = (
    name: string,
    exist: Map<string, string>,
    fresh: Map<string, number>,
  ): EntityRef | null => {
    const k = key(name)
    if (exist.has(k)) return { existingId: exist.get(k)! }
    if (fresh.has(k)) return { newIndex: fresh.get(k)! }
    return null
  }
  const groupRef = (n: string) => refFor(n, existGroup, newGroupIndex)
  const swellRef = (n: string) => refFor(n, existSwell, newSwellIndex)
  const motionRef = (n: string) => refFor(n, existMotion, newMotionIndex)

  // Motion-derived weekly targets for new swells (mirrors the original math):
  // each feeding motion contributes its points/hours split across the swells it
  // feeds. The AI's own [target: N] wins for points when present; hours derive.
  const motionByKey = new Map(preview.motions.map(m => [key(m.name), m]))
  const feedsPerMotion = new Map<string, number>()
  for (const a of preview.swellAssignments) {
    const mk = key(a.motionName)
    feedsPerMotion.set(mk, (feedsPerMotion.get(mk) ?? 0) + 1)
  }
  const ptsBySwell = new Map<string, number>()
  const hrsBySwell = new Map<string, number>()
  for (const a of preview.swellAssignments) {
    const m = motionByKey.get(key(a.motionName))
    if (!m) continue
    const w = 1 / (feedsPerMotion.get(key(a.motionName)) ?? 1)
    const sk = key(a.swellName)
    ptsBySwell.set(sk, (ptsBySwell.get(sk) ?? 0) + m.points * w)
    hrsBySwell.set(sk, (hrsBySwell.get(sk) ?? 0) + m.hours * w)
  }
  const newSwells = newSwellsRaw.map(s => {
    const k = key(s.name)
    const pts = ptsBySwell.get(k) ?? 0
    const hrs = hrsBySwell.get(k) ?? 0
    return {
      name: s.name,
      targetPoints: s.target ?? (pts > 0 ? Math.ceil(4 * pts) : 4),
      targetHours: hrs > 0 ? Math.ceil(4 * 3 * hrs) / 4 : 3,
    }
  })

  // Bucket assignment per motion → a group ref.
  const motionGroup = new Map<string, EntityRef>()
  for (const a of preview.groupAssignments) {
    const gr = groupRef(a.groupName)
    if (gr) motionGroup.set(key(a.motionName), gr)
  }
  const newMotions = newMotionsRaw.map(m => ({
    name: m.name,
    points: m.points,
    hours: m.hours,
    group: motionGroup.get(key(m.name)) ?? null,
  }))

  // Junctions: split each motion's weight across the swells it feeds (only
  // counting assignments that resolve on both sides), deduped per resolved pair.
  const refKey = (r: EntityRef) => ('existingId' in r ? `e:${r.existingId}` : `n:${r.newIndex}`)
  const swellsPerMotion = new Map<string, number>()
  for (const a of preview.swellAssignments) {
    if (motionRef(a.motionName) && swellRef(a.swellName)) {
      const mk = key(a.motionName)
      swellsPerMotion.set(mk, (swellsPerMotion.get(mk) ?? 0) + 1)
    }
  }
  const junctions: ResolvedImport['junctions'] = []
  const seen = new Set<string>()
  for (const a of preview.swellAssignments) {
    const mr = motionRef(a.motionName)
    const sr = swellRef(a.swellName)
    if (!mr || !sr) continue
    const jKey = `${refKey(mr)}|${refKey(sr)}`
    if (seen.has(jKey)) continue
    seen.add(jKey)
    const count = swellsPerMotion.get(key(a.motionName)) ?? 1
    junctions.push({ motion: mr, swell: sr, weight: Math.round((1 / count) * 100) / 100 })
  }

  return {
    newGroups: newGroups.map(g => ({ name: g.name })),
    newSwells,
    newMotions,
    junctions,
    enableGroups: preview.groups.length > 0,
  }
}
