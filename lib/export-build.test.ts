import { describe, it, expect } from 'vitest'
import { assembleExport } from './export-build'
import type { RawExport } from './export-format'

const identity = (v: string) => Promise.resolve(v)
const NOW = '2026-06-18T00:00:00Z'

function raw(p: Partial<RawExport>): RawExport {
  return {
    user_email: 'a@b.com',
    chapters: [{ id: 'c1', started_at: 'x', ended_at: null, sort_order: 0 }],
    swells: [],
    groups: [],
    motions: [],
    motionSwells: [],
    logs: [],
    milestones: [],
    waves: [],
    reflections: [],
    ...p,
  }
}

const swell = (id: string, name: string) => ({
  id, chapter_id: 'c1', name, color: '#fff', target_points: 10, target_hours: null, group_id: null, sort_order: 0, created_at: 'x',
})
const motion = (id: string, name: string) => ({
  id, chapter_id: 'c1', name, default_points: 1, default_hours: 1, group_id: null, hidden: false, parent_id: null, sort_order: 0, created_at: 'x',
})

describe('assembleExport', () => {
  it('nests motion→swell junctions onto each motion (the regression that was silently dropped)', async () => {
    const out = await assembleExport(
      raw({
        swells: [swell('s1', 'Movement'), swell('s2', 'Mind')],
        motions: [motion('m1', 'Walk'), motion('m2', 'Read'), motion('m3', 'Lonely')],
        motionSwells: [
          { motion_id: 'm1', swell_id: 's1', contribution_weight: 1 },
          { motion_id: 'm2', swell_id: 's1', contribution_weight: 0.5 },
          { motion_id: 'm2', swell_id: 's2', contribution_weight: 0.5 },
        ],
      }),
      identity,
      NOW,
    )
    const byName = Object.fromEntries(out.motions.map(m => [m.name, m.swells]))
    expect(byName['Walk']).toEqual([{ swell_id: 's1', weight: 1 }])
    expect(byName['Read']).toEqual([{ swell_id: 's1', weight: 0.5 }, { swell_id: 's2', weight: 0.5 }])
    expect(byName['Lonely']).toEqual([]) // unassigned motion → empty, not missing
  })

  it('carries every top-level array and the chapters/version through', async () => {
    const out = await assembleExport(
      raw({
        chapters: [
          { id: 'c1', started_at: 'a', ended_at: null, sort_order: 1 },
          { id: 'c0', started_at: 'b', ended_at: 'c', sort_order: 0 },
        ],
        swells: [swell('s1', 'Movement')],
        groups: [{ id: 'g1', chapter_id: 'c1', name: 'Morning', color: '#000', sort_order: 0, created_at: 'x' }],
        motions: [motion('m1', 'Walk')],
        logs: [{ id: 'l1', chapter_id: 'c1', motion_id: 'm1', points: 2, hours: 1, intensity: 'deep', logged_at: 't', motions: { name: 'Walk' } }],
        milestones: [{ id: 'w1', swell_id: 's1', motion_id: null, name: 'Streak', kind: 'recurring', cadence: 'weekly', target_count: 3, completed_at: null, bonus_points: 5, sort_order: 0, created_at: 'x' }],
        waves: [{ id: 'v1', chapter_id: 'c1', energy: 0.5, alignment: 0.5, duration_seconds: 100, checked_in_at: 't' }],
        reflections: [{ id: 'a1', chapter_id: 'c1', cycle_type: 'free', cycle_start: null, cycle_end: null, expectation_text: null, observation_text: null, intention_text: null, did_tune: null, body_text: 'hi', prompt_text: null, created_at: 't' }],
      }),
      identity,
      NOW,
    )
    expect(out.version).toBe(3)
    expect(out.exported_at).toBe(NOW)
    expect(out.chapters).toHaveLength(2)
    expect(out.swells).toHaveLength(1)
    expect(out.buckets).toHaveLength(1) // groups → buckets
    expect(out.motions).toHaveLength(1)
    expect(out.logs).toHaveLength(1)
    expect(out.waypoints).toHaveLength(1) // milestones → waypoints
    expect(out.waves).toHaveLength(1)
    expect(out.anchors).toHaveLength(1) // reflections → anchors
    expect(out.swells[0].chapter_id).toBe('c1')
  })

  it('decrypts content names and resolves the log motion_name from the join', async () => {
    const mark = (v: string) => Promise.resolve(`dec:${v}`)
    const out = await assembleExport(
      raw({
        swells: [swell('s1', 'Movement')],
        motions: [motion('m1', 'Walk')],
        logs: [{ id: 'l1', chapter_id: 'c1', motion_id: 'm1', points: 2, hours: 1, intensity: null, logged_at: 't', motions: [{ name: 'Walk' }] }],
        milestones: [{ id: 'w1', swell_id: 's1', motion_id: null, name: 'Streak', kind: 'recurring', cadence: null, target_count: null, completed_at: null, bonus_points: null, sort_order: 0, created_at: 'x' }],
      }),
      mark,
      NOW,
    )
    expect(out.swells[0].name).toBe('dec:Movement')
    expect(out.motions[0].name).toBe('dec:Walk')
    expect(out.waypoints[0].name).toBe('dec:Streak')
    expect(out.logs[0].motion_name).toBe('dec:Walk') // joined name, decrypted
  })

  it('preserves null content fields as null (not empty string)', async () => {
    const out = await assembleExport(
      raw({
        reflections: [{ id: 'a1', chapter_id: 'c1', cycle_type: 'week', cycle_start: '2026-01-01', cycle_end: '2026-01-07', expectation_text: 'hoped', observation_text: null, intention_text: null, did_tune: true, body_text: null, prompt_text: null, created_at: 't' }],
      }),
      identity,
      NOW,
    )
    const a = out.anchors[0]
    expect(a.expectation_text).toBe('hoped')
    expect(a.observation_text).toBeNull()
    expect(a.body_text).toBeNull()
  })

  it('coerces numeric strings (hours, wave energy) to numbers', async () => {
    const out = await assembleExport(
      raw({
        motions: [motion('m1', 'Walk')],
        logs: [{ id: 'l1', chapter_id: 'c1', motion_id: 'm1', points: 2, hours: '1.5' as unknown as number, intensity: null, logged_at: 't', motions: null }],
        waves: [{ id: 'v1', chapter_id: 'c1', energy: '0.25' as unknown as number, alignment: '0.75' as unknown as number, duration_seconds: null, checked_in_at: 't' }],
      }),
      identity,
      NOW,
    )
    expect(out.logs[0].hours).toBe(1.5)
    expect(out.logs[0].motion_name).toBeNull() // no joined motion
    expect(out.waves[0].energy).toBe(0.25)
    expect(out.waves[0].alignment).toBe(0.75)
  })
})
