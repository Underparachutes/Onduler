'use client'

import { useState, useEffect, useTransition } from 'react'
import { setTheme } from '@/app/actions/theme'

const THEMES = ['biarritz', 'tjornuvik', 'bolinas'] as const
type Theme = typeof THEMES[number]

const LABELS: Record<Theme, string> = {
  biarritz: 'Biarritz',
  tjornuvik: 'Tjørnuvík',
  bolinas: 'Bolinas',
}

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>('biarritz')
  const [isPending, startTransition] = useTransition()

  // eslint-disable-next-line react-hooks/set-state-in-effect -- read theme from DOM on mount
  useEffect(() => { const t = document.documentElement.dataset.theme as Theme; if (t && THEMES.includes(t)) setCurrent(t) }, [])

  function toggle() {
    const idx = THEMES.indexOf(current)
    const next: Theme = THEMES[(idx + 1) % THEMES.length]
    setCurrent(next)
    document.documentElement.dataset.theme = next
    startTransition(async () => { await setTheme(next) })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="rounded-lg border border-th-border px-3 py-1.5 text-xs font-medium text-th-muted transition-colors hover:bg-th-surface disabled:opacity-50"
    >
      {LABELS[current]}
    </button>
  )
}
