'use client'

import { useEffect } from 'react'

// Forces --brand to a user-selected hex when set, falling back to the
// per-theme CSS default when null. Single knob controls wordmark gradient,
// `+` glyph, pill "Onduler" label, default progress bars, and active nav.
export function BrandColorApplier({ color }: { color: string | null }) {
  useEffect(() => {
    const html = document.documentElement
    if (color && /^#[0-9a-f]{3,6}$/i.test(color)) {
      html.style.setProperty('--brand', color)
    } else {
      html.style.removeProperty('--brand')
    }
  }, [color])
  return null
}
