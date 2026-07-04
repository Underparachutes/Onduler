import { describe, it, expect } from 'vitest'
import {
  normalizeEntries,
  defaultWeightForNewSwell,
  applyWeightEdit,
  totalAllocation,
  type WeightEntry,
} from './contributions'

const sumOf = (entries: WeightEntry[]) => entries.reduce((s, e) => s + e.weight, 0)
const mapSum = (m: Map<string, number>) => [...m.values()].reduce((s, w) => s + w, 0)

describe('normalizeEntries', () => {
  it('passes through entries whose sum is at or under 1', () => {
    const entries = [
      { swellId: 'a', weight: 0.5 },
      { swellId: 'b', weight: 0.3 },
    ]
    expect(normalizeEntries(entries)).toEqual(entries)
  })

  it('passes through a sum of exactly 1', () => {
    const entries = [
      { swellId: 'a', weight: 0.6 },
      { swellId: 'b', weight: 0.4 },
    ]
    expect(normalizeEntries(entries)).toEqual(entries)
  })

  it('clamps garbage weights: negatives and non-finite values to 0, >1 to 1', () => {
    const out = normalizeEntries([
      { swellId: 'neg', weight: -0.5 },
      { swellId: 'nan', weight: NaN },
      { swellId: 'inf', weight: Infinity },
      { swellId: 'big', weight: 3 },
    ])
    expect(out).toEqual([
      { swellId: 'neg', weight: 0 },
      { swellId: 'nan', weight: 0 },
      { swellId: 'inf', weight: 0 },
      { swellId: 'big', weight: 1 },
    ])
  })

  it('scales an oversubscribed set down to sum 1, preserving proportions', () => {
    const out = normalizeEntries([
      { swellId: 'a', weight: 1 },
      { swellId: 'b', weight: 1 },
      { swellId: 'c', weight: 0.5 },
    ])
    expect(sumOf(out)).toBeCloseTo(1, 10)
    expect(out[0].weight).toBeCloseTo(out[1].weight, 10)
    expect(out[0].weight / out[2].weight).toBeCloseTo(2, 10)
  })

  it('handles an empty list', () => {
    expect(normalizeEntries([])).toEqual([])
  })
})

describe('defaultWeightForNewSwell', () => {
  it('gives full weight when the motion feeds nothing yet', () => {
    expect(defaultWeightForNewSwell(new Map())).toBe(1)
  })

  it('gives the remaining capacity', () => {
    expect(defaultWeightForNewSwell(new Map([['a', 0.6]]))).toBeCloseTo(0.4, 10)
  })

  it('gives 0 when the motion is fully allocated', () => {
    expect(defaultWeightForNewSwell(new Map([['a', 0.5], ['b', 0.5]]))).toBe(0)
  })

  it('gives 0 (not negative) when the motion is oversubscribed', () => {
    expect(defaultWeightForNewSwell(new Map([['a', 0.8], ['b', 0.8]]))).toBe(0)
  })
})

describe('applyWeightEdit', () => {
  it('returns the map unchanged for an unknown swell id', () => {
    const weights = new Map([['a', 0.5]])
    expect(applyWeightEdit(weights, 'missing', 0.9)).toBe(weights)
  })

  it('leaves the others alone when the edit fits under 1', () => {
    const out = applyWeightEdit(new Map([['a', 0.5], ['b', 0.3]]), 'a', 0.6)
    expect(out.get('a')).toBe(0.6)
    expect(out.get('b')).toBe(0.3)
  })

  it('scales the others proportionally when the edit would exceed 1', () => {
    const out = applyWeightEdit(new Map([['a', 0.2], ['b', 0.4], ['c', 0.4]]), 'a', 0.5)
    expect(out.get('a')).toBe(0.5)
    // b and c had 0.8 between them; they scale to 0.5, keeping their 1:1 ratio.
    expect(out.get('b')).toBeCloseTo(0.25, 10)
    expect(out.get('c')).toBeCloseTo(0.25, 10)
    expect(mapSum(out)).toBeCloseTo(1, 10)
  })

  it('zeroes the others when the edit takes everything', () => {
    const out = applyWeightEdit(new Map([['a', 0.5], ['b', 0.5]]), 'a', 1)
    expect(out.get('a')).toBe(1)
    expect(out.get('b')).toBeCloseTo(0, 10)
  })

  it('keeps the edit even when the others sum to 0 and cannot absorb overflow', () => {
    const out = applyWeightEdit(new Map([['a', 0], ['b', 0]]), 'a', 5)
    expect(out.get('a')).toBe(1) // clamped
    expect(out.get('b')).toBe(0)
  })

  it('clamps the edited value to [0, 1]', () => {
    expect(applyWeightEdit(new Map([['a', 0.5]]), 'a', 7).get('a')).toBe(1)
    expect(applyWeightEdit(new Map([['a', 0.5]]), 'a', -3).get('a')).toBe(0)
  })

  it('does not mutate the input map', () => {
    const weights = new Map([['a', 0.2], ['b', 0.4]])
    applyWeightEdit(weights, 'a', 0.9)
    expect(weights.get('a')).toBe(0.2)
    expect(weights.get('b')).toBe(0.4)
  })
})

describe('totalAllocation', () => {
  it('sums the weights', () => {
    expect(totalAllocation(new Map([['a', 0.25], ['b', 0.5]]))).toBeCloseTo(0.75, 10)
  })

  it('clamps an oversubscribed sum to 1', () => {
    expect(totalAllocation(new Map([['a', 0.8], ['b', 0.8]]))).toBe(1)
  })

  it('is 0 for an empty map', () => {
    expect(totalAllocation(new Map())).toBe(0)
  })
})
