import { describe, it, expect } from 'vitest'
import { resolveRestore } from './restore-resolve'
import type { ExistingEntities } from './import-resolve'
import type { ExportPayload } from './export-format'

const EMPTY: ExistingEntities = { groups: [], swells: [], motions: [] }

// Default fixtures use a single active chapter 'c1'.
const ACTIVE = 'c1'

function payload(p: Partial<ExportPayload>): ExportPayload {
  return {
    version: 3,
    exported_at: '2026-01-01T00:00:00Z',
    user_email: 'a@b.com',
    chapters: [{ id: ACTIVE, started_at: '2026-01-01T00:00:00Z', ended_at: null, sort_order: 0 }],
    swells: [],
    buckets: [],
    motions: [],
    logs: [],
    waypoints: [],
    waves: [],
    anchors: [],
    ...p,
  }
}

const swell = (id: string, name: string, chapter = ACTIVE) => ({
  id, chapter_id: chapter, name, color: '#fff', target_points: 10, target_hours: null, group_id: null, sort_order: 0, created_at: 'x',
})
const motion = (id: string, name: string, swells: { swell_id: string; weight: number }[] = [], chapter = ACTIVE) => ({
  id, chapter_id: chapter, name, default_points: 1, default_hours: 1, group_id: null, hidden: false, parent_id: null, sort_order: 0, created_at: 'x', swells,
})

describe('resolveRestore', () => {
  it('remaps a clean restore: logs and junctions reference new motions/swells by index', () => {
    const r = resolveRestore(
      payload({
        swells: [swell('s1', 'Movement')],
        motions: [motion('m1', 'Walk', [{ swell_id: 's1', weight: 1 }])],
        logs: [{ id: 'l1', chapter_id: ACTIVE, logged_at: '2026-01-02T10:00:00Z', motion_id: 'm1', motion_name: 'Walk', points: 2, hours: 1, intensity: 'deep' }],
      }),
      EMPTY,
    )
    expect(r.newSwells).toHaveLength(1)
    expect(r.newMotions).toHaveLength(1)
    expect(r.junctions).toEqual([{ motion: { newIndex: 0 }, swell: { newIndex: 0 }, weight: 1 }])
    expect(r.logs).toEqual([{ motion: { newIndex: 0 }, points: 2, hours: 1, intensity: 'deep', loggedAt: '2026-01-02T10:00:00Z', chapter: { active: true } }])
  })

  it('dedups structure by name and references existing entities by id', () => {
    const existing: ExistingEntities = { groups: [], swells: [{ id: 'db-s', name: 'Movement' }], motions: [] }
    const r = resolveRestore(
      payload({
        swells: [swell('s1', 'movement')], // dedups to existing
        motions: [motion('m1', 'Walk', [{ swell_id: 's1', weight: 1 }])],
        logs: [{ id: 'l1', chapter_id: ACTIVE, logged_at: 'x', motion_id: 'm1', motion_name: 'Walk', points: 1, hours: 1, intensity: null }],
      }),
      existing,
    )
    expect(r.newSwells).toHaveLength(0) // Movement already existed
    expect(r.newMotions).toHaveLength(1)
    // The new motion's junction points at the EXISTING swell by id
    expect(r.junctions).toEqual([{ motion: { newIndex: 0 }, swell: { existingId: 'db-s' }, weight: 1 }])
  })

  it('only creates junctions for new motions (existing keep their own links)', () => {
    const existing: ExistingEntities = { groups: [], swells: [], motions: [{ id: 'db-m', name: 'Walk' }] }
    const r = resolveRestore(
      payload({
        swells: [swell('s1', 'Movement')],
        motions: [motion('m1', 'Walk', [{ swell_id: 's1', weight: 1 }])], // dedups to existing motion
      }),
      existing,
    )
    expect(r.newMotions).toHaveLength(0)
    expect(r.junctions).toHaveLength(0) // existing motion's links are left untouched
  })

  it('drops a log whose motion is missing from the export', () => {
    const r = resolveRestore(
      payload({
        motions: [motion('m1', 'Walk')],
        logs: [{ id: 'l1', chapter_id: ACTIVE, logged_at: 'x', motion_id: 'ghost', motion_name: null, points: 1, hours: 1, intensity: null }],
      }),
      EMPTY,
    )
    expect(r.logs).toHaveLength(0)
  })

  it('passes anchors through with their fields and timestamps', () => {
    const r = resolveRestore(
      payload({
        anchors: [{
          id: 'a1', chapter_id: ACTIVE, cycle_type: 'free', cycle_start: null, cycle_end: null,
          expectation_text: null, observation_text: null, intention_text: null,
          did_tune: null, body_text: 'a thought', prompt_text: null, created_at: '2026-03-01T00:00:00Z',
        }],
      }),
      EMPTY,
    )
    expect(r.anchors).toEqual([{
      cycleType: 'free', cycleStart: null, cycleEnd: null,
      expectationText: null, observationText: null, intentionText: null,
      didTune: null, bodyText: 'a thought', promptText: null, createdAt: '2026-03-01T00:00:00Z',
      chapter: { active: true },
    }])
  })

  it('recreates archived chapters and tags their entities; active maps to active', () => {
    const r = resolveRestore(
      payload({
        chapters: [
          { id: 'c1', started_at: '2026-01-01T00:00:00Z', ended_at: null, sort_order: 1 }, // active
          { id: 'c0', started_at: '2025-06-01T00:00:00Z', ended_at: '2025-12-31T00:00:00Z', sort_order: 0 }, // archived
        ],
        swells: [swell('s-now', 'Movement', 'c1'), swell('s-old', 'Hygge', 'c0')],
      }),
      EMPTY,
    )
    // One archived chapter recreated, preserving its timestamps
    expect(r.chapters).toEqual([{ startedAt: '2025-06-01T00:00:00Z', endedAt: '2025-12-31T00:00:00Z', sortOrder: 0 }])
    const active = r.newSwells.find(s => s.name === 'Movement')!
    const archived = r.newSwells.find(s => s.name === 'Hygge')!
    expect(active.chapter).toEqual({ active: true })
    expect(archived.chapter).toEqual({ archivedIndex: 0 })
  })

  it('does not dedup an archived-chapter swell against an existing active swell of the same name', () => {
    const existing: ExistingEntities = { groups: [], swells: [{ id: 'db-s', name: 'Movement' }], motions: [] }
    const r = resolveRestore(
      payload({
        chapters: [
          { id: 'c1', started_at: 'x', ended_at: null, sort_order: 1 },
          { id: 'c0', started_at: 'x', ended_at: 'y', sort_order: 0 },
        ],
        swells: [swell('s-old', 'Movement', 'c0')], // archived — must be recreated, not deduped
      }),
      existing,
    )
    expect(r.newSwells).toHaveLength(1)
    expect(r.newSwells[0].chapter).toEqual({ archivedIndex: 0 })
  })

  it('preserves swell color and targets from the export (not re-derived)', () => {
    const r = resolveRestore(
      payload({ swells: [{ ...swell('s1', 'Mind'), color: '#abc', target_points: 33, target_hours: 7 }] }),
      EMPTY,
    )
    expect(r.newSwells[0]).toMatchObject({ name: 'Mind', color: '#abc', targetPoints: 33, targetHours: 7 })
  })
})
