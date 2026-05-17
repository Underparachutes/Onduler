export type ThemeName = 'default' | 'bolinas' | 'biarritz'

export const THEME_PALETTES: Record<ThemeName, string[]> = {
  default: ['#33A656', '#FFA213', '#ADEEC5', '#195845', '#B74531', '#86ECFF', '#4A90E2', '#E64980', '#F5C518', '#9B59B6'],
  bolinas: ['#3f5c39', '#8a7a5e', '#5a4e42', '#a09384', '#7a6f8e', '#bc8a5f', '#d6ba9e', '#94a87f', '#c4795c', '#b08688'],
  biarritz: ['#c9621e', '#2a5f68', '#d4a574', '#1e5b8a', '#8aabaf', '#a8511a', '#FF772E', '#10C2BB', '#752C05', '#FFD700'],
}

export function getShuffledThemePalette(theme: string): string[] {
  const palette = THEME_PALETTES[theme as ThemeName] ?? THEME_PALETTES.default
  const copy = [...palette]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Ring buffer of last 3 colors picked, per session. Avoids visual repetition.
const recentColors: string[] = []
const AVOID_COUNT = 3

export function getRandomThemeAccent(theme: string): string {
  const palette = THEME_PALETTES[theme as ThemeName] ?? THEME_PALETTES.default
  const avoidN = Math.min(AVOID_COUNT, palette.length - 1)
  const candidates = palette.filter(c => !recentColors.slice(-avoidN).includes(c))
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  recentColors.push(pick)
  if (recentColors.length > AVOID_COUNT) recentColors.shift()
  return pick
}
