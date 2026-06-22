import { describe, it, expect } from 'vitest'
import { ombreGradient } from './ombre'

describe('ombreGradient', () => {
  it('returns null when there are no positive bands', () => {
    expect(ombreGradient([])).toBeNull()
    expect(ombreGradient([{ color: '#111', value: 0 }])).toBeNull()
    expect(ombreGradient([{ color: '#111', value: -5 }])).toBeNull()
  })

  it('returns the solid color for a single contributing band', () => {
    expect(ombreGradient([{ color: '#11A66B', value: 7 }])).toBe('#11A66B')
    // zero-value bands are dropped before the single-band check
    expect(
      ombreGradient([
        { color: '#11A66B', value: 7 },
        { color: '#2A93A1', value: 0 },
      ]),
    ).toBe('#11A66B')
  })

  it('places midpoint stops for two equal bands', () => {
    // Equal values → equal 50% shares → midpoints at 25% and 75%.
    const g = ombreGradient(
      [
        { color: '#A', value: 10 },
        { color: '#B', value: 10 },
      ],
      { minShare: 0 },
    )
    expect(g).toBe('linear-gradient(90deg, #A 0%, #A 25.0%, #B 75.0%, #B 100%)')
  })

  it('keeps caller order stable regardless of size', () => {
    const g = ombreGradient(
      [
        { color: '#first', value: 1 },
        { color: '#second', value: 99 },
      ],
      { minShare: 0 },
    )!
    expect(g.indexOf('#first')).toBeLessThan(g.indexOf('#second'))
  })

  it('floors a tiny band to minShare and keeps shares summing to 1', () => {
    // value split is 1/100, but the small band is floored to 8%. Verify by
    // reconstructing the shares from the emitted midpoints.
    const g = ombreGradient([
      { color: '#A', value: 1 },
      { color: '#B', value: 99 },
    ])!
    const mids = [...g.matchAll(/(\d+\.\d)%/g)].map(m => Number(m[1]))
    // mids: [first-midpoint, last-midpoint]; share_A = 2·mid0, share_B = 1 - share_A
    const shareA = (2 * mids[0]) / 100
    // Floored to AT LEAST minShare (0.08) — far above its un-floored 0.01 share.
    expect(shareA).toBeGreaterThanOrEqual(0.08 - 0.0005)
    expect(shareA).toBeGreaterThan(0.05)
    // last midpoint = (shareA + shareB/2) ⇒ shareB recovered = 2·(mid1/100 − shareA)
    const shareB = 2 * (mids[1] / 100 - shareA)
    expect(shareA + shareB).toBeCloseTo(1, 5)
  })

  it('splits evenly when the floor cannot fit', () => {
    // 13 bands × 0.08 = 1.04 ≥ 1 → equal 1/13 shares. First midpoint = (1/13)/2.
    const bands = Array.from({ length: 13 }, (_, i) => ({ color: `#${i}`, value: i + 1 }))
    const g = ombreGradient(bands)!
    const firstMid = Number(g.match(/(\d+\.\d)%/)![1])
    expect(firstMid).toBeCloseTo((0.5 / 13) * 100, 1)
  })
})
