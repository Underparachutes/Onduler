export type BuildKey = 'maker' | 'athlete' | 'wanderer' | 'scholar'

export type BuildPreset = {
  key: BuildKey
  label: string
  description: string
  seededSwells: string[]
}

export const BUILD_PRESETS: BuildPreset[] = [
  {
    key: 'maker',
    label: 'The Maker',
    description: 'For the builder, the writer, the one with a craft. Weeks that lean into making things.',
    seededSwells: ['Creativity', 'Work', 'Mind'],
  },
  {
    key: 'athlete',
    label: 'The Athlete',
    description: 'Body-first. Movement, fuel, and a clear head as the through-line of the week.',
    seededSwells: ['Movement', 'Nutrition', 'Mind'],
  },
  {
    key: 'wanderer',
    label: 'The Wanderer',
    description: 'Restless in the best way. Novelty and motion as nourishment.',
    seededSwells: ['Adventure', 'Movement', 'Creativity'],
  },
  {
    key: 'scholar',
    label: 'The Scholar',
    description: 'Depth of focus and the long arc of learning a thing.',
    seededSwells: ['Mind', 'Work', 'Creativity'],
  },
]

export function getBuildPreset(key: string | null | undefined): BuildPreset | null {
  if (!key) return null
  return BUILD_PRESETS.find(p => p.key === key) ?? null
}
