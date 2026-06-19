import { describe, it, expect } from 'vitest'
import { resolveImport, type ExistingEntities } from './import-resolve'
import type { ImportPreview } from './import-parser'

const EMPTY: ExistingEntities = { groups: [], swells: [], motions: [] }

function preview(p: Partial<ImportPreview>): ImportPreview {
  return {
    swells: [],
    motions: [],
    groups: [],
    swellAssignments: [],
    groupAssignments: [],
    unparsedLineCount: 0,
    ...p,
  }
}

describe('resolveImport', () => {
  it('marks everything new when there is nothing to dedup against', () => {
    const r = resolveImport(
      preview({
        swells: [{ name: 'Movement', target: null }],
        motions: [{ name: 'Walk', points: 2, hours: 1 }],
        groups: [{ name: 'Morning' }],
      }),
      EMPTY,
    )
    expect(r.newSwells.map(s => s.name)).toEqual(['Movement'])
    expect(r.newMotions.map(m => m.name)).toEqual(['Walk'])
    expect(r.newGroups.map(g => g.name)).toEqual(['Morning'])
    expect(r.enableGroups).toBe(true)
  })

  it('dedups against existing entities (case-insensitive) and refs them by id', () => {
    const existing: ExistingEntities = {
      groups: [],
      swells: [{ id: 'swell-1', name: 'Movement' }],
      motions: [],
    }
    const r = resolveImport(
      preview({
        swells: [{ name: 'movement', target: null }, { name: 'Mind', target: null }],
        motions: [{ name: 'Walk', points: 1, hours: 1 }],
        swellAssignments: [
          { motionName: 'Walk', swellName: 'Movement' }, // -> existing swell
          { motionName: 'Walk', swellName: 'Mind' },     // -> new swell index 0
        ],
      }),
      existing,
    )
    // 'movement' already exists → only 'Mind' is new
    expect(r.newSwells.map(s => s.name)).toEqual(['Mind'])
    // Walk is new (index 0); junctions reference existing swell by id and new by index
    const motionRefs = r.junctions.map(j => j.motion)
    expect(motionRefs.every(m => 'newIndex' in m && m.newIndex === 0)).toBe(true)
    const swellRefs = r.junctions.map(j => j.swell)
    expect(swellRefs).toContainEqual({ existingId: 'swell-1' })
    expect(swellRefs).toContainEqual({ newIndex: 0 })
  })

  it('splits a motion’s weight across the swells it feeds', () => {
    const r = resolveImport(
      preview({
        swells: [{ name: 'A', target: null }, { name: 'B', target: null }],
        motions: [{ name: 'M', points: 10, hours: 2 }],
        swellAssignments: [
          { motionName: 'M', swellName: 'A' },
          { motionName: 'M', swellName: 'B' },
        ],
      }),
      EMPTY,
    )
    expect(r.junctions).toHaveLength(2)
    expect(r.junctions.every(j => j.weight === 0.5)).toBe(true)
  })

  it('derives a swell target from feeding motions, but an explicit target wins', () => {
    const r = resolveImport(
      preview({
        swells: [{ name: 'Derived', target: null }, { name: 'Explicit', target: 42 }],
        motions: [{ name: 'M', points: 3, hours: 1 }],
        swellAssignments: [
          { motionName: 'M', swellName: 'Derived' },
          { motionName: 'M', swellName: 'Explicit' },
        ],
      }),
      EMPTY,
    )
    const derived = r.newSwells.find(s => s.name === 'Derived')!
    const explicit = r.newSwells.find(s => s.name === 'Explicit')!
    // M feeds 2 swells → weight 0.5; points 3 * 0.5 = 1.5 → ceil(4*1.5)=6
    expect(derived.targetPoints).toBe(6)
    expect(explicit.targetPoints).toBe(42)
  })

  it('resolves a motion’s bucket to a new-group ref', () => {
    const r = resolveImport(
      preview({
        motions: [{ name: 'Walk', points: 1, hours: 1 }],
        groups: [{ name: 'Morning' }],
        groupAssignments: [{ motionName: 'Walk', groupName: 'Morning' }],
      }),
      EMPTY,
    )
    expect(r.newMotions[0].group).toEqual({ newIndex: 0 })
  })

  it('dedups duplicate assignments to the same resolved pair', () => {
    const r = resolveImport(
      preview({
        swells: [{ name: 'A', target: null }],
        motions: [{ name: 'M', points: 1, hours: 1 }],
        swellAssignments: [
          { motionName: 'M', swellName: 'A' },
          { motionName: 'M', swellName: 'A' },
        ],
      }),
      EMPTY,
    )
    expect(r.junctions).toHaveLength(1)
  })

  it('does not enable buckets when the import has none', () => {
    const r = resolveImport(preview({ swells: [{ name: 'A', target: null }] }), EMPTY)
    expect(r.enableGroups).toBe(false)
  })
})
