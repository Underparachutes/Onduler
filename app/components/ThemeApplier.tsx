'use client'

import { useEffect } from 'react'

export function ThemeApplier({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}
