'use client'

import { useEffect } from 'react'

function parsePosition(pos: string): string {
  const parts = pos.trim().split(/\s+/)
  if (parts.length === 2) {
    const x = parseFloat(parts[0])
    const y = parseFloat(parts[1])
    if (!isNaN(x) && !isNaN(y)) return `${x}% ${y}%`
  }
  return pos
}

export function BackgroundApplier({ url, position }: { url: string | null; position: string }) {
  useEffect(() => {
    if (url) {
      document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${url})`
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundPosition = parsePosition(position)
      document.body.style.backgroundAttachment = 'fixed'
      document.body.classList.add('has-bg-image')
    } else {
      document.body.style.backgroundImage = ''
      document.body.style.backgroundSize = ''
      document.body.style.backgroundPosition = ''
      document.body.style.backgroundAttachment = ''
      document.body.classList.remove('has-bg-image')
    }
    return () => { document.body.classList.remove('has-bg-image') }
  }, [url, position])
  return null
}
