export type ThemeName = 'default' | 'bolinas' | 'biarritz'

export const THEME_PALETTES: Record<ThemeName, string[]> = {
  default: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  bolinas: ['#3f5c39', '#8a7a5e', '#5a4e42', '#a09384', '#7a6f8e', '#bc8a5f'],
  biarritz: ['#c9621e', '#2a5f68', '#d4a574', '#1e5b8a', '#8aabaf', '#a8511a'],
}

export function getRandomThemeAccent(theme: string): string {
  const palette = THEME_PALETTES[theme as ThemeName] ?? THEME_PALETTES.default
  return palette[Math.floor(Math.random() * palette.length)]
}

export function adaptColor(hex: string): string {
  return `color-mix(in oklch, ${hex} 60%, var(--th-text))`
}
