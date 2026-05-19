export type ThemeName = 'default' | 'bolinas' | 'biarritz'
export type ThemeMode = 'light' | 'dark'

export const THEME_PALETTES: Record<ThemeName, { light: string[]; dark: string[] }> = {
  default: {
    light: ['#2A6FDB', '#1FA38C', '#E2785A', '#D9A93E', '#5B9B6D', '#C45577', '#6BACE0', '#6FCDB7', '#8E6CB7', '#6E879F'],
    dark:  ['#5A95E8', '#34BFA8', '#ED8F73', '#E3BB5C', '#7BB78A', '#D87693', '#91C5EE', '#8DDDC7', '#AB8AD0', '#93A6BB'],
  },
  bolinas: {
    light: ['#6F8A6E', '#8FA8AF', '#B89E7E', '#9CAB8E', '#B58F8A', '#5C7886', '#A89F95', '#7C9088', '#C0AE93', '#607566'],
    dark:  ['#97AC92', '#A5C0C6', '#C9AE92', '#B5C29F', '#C6A29D', '#87A1AE', '#B5ACA2', '#94A89F', '#D0BEA4', '#84997F'],
  },
  biarritz: {
    light: ['#C9621E', '#2A6F7A', '#D6A968', '#B04E3C', '#6B98B5', '#D89066', '#8AA570', '#9C5B3B', '#4D8489', '#C28C5C'],
    dark:  ['#DE7B47', '#4FA6B3', '#E2BC85', '#D26C5C', '#8ABACF', '#E5A582', '#A8BE91', '#C07A5B', '#72ADB3', '#D7A879'],
  },
}

export function detectMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function paletteFor(theme: string, mode: ThemeMode): string[] {
  const key = (theme as ThemeName) in THEME_PALETTES ? (theme as ThemeName) : 'default'
  return THEME_PALETTES[key][mode]
}

export function getShuffledThemePalette(theme: string, mode: ThemeMode = 'light'): string[] {
  const copy = [...paletteFor(theme, mode)]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Ring buffer of last 3 colors picked, per session. Avoids visual repetition.
const recentColors: string[] = []
const AVOID_COUNT = 3

export function getRandomThemeAccent(theme: string, mode: ThemeMode = 'light'): string {
  const palette = paletteFor(theme, mode)
  const avoidN = Math.min(AVOID_COUNT, palette.length - 1)
  const candidates = palette.filter(c => !recentColors.slice(-avoidN).includes(c))
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  recentColors.push(pick)
  if (recentColors.length > AVOID_COUNT) recentColors.shift()
  return pick
}
