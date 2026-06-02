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
      document.body.classList.add('has-bg-image')
    } else {
      document.body.classList.remove('has-bg-image')
    }
    return () => { document.body.classList.remove('has-bg-image') }
  }, [url])

  if (!url) return null

  const pos = parsePosition(position)

  return (
    <div
      id="bg-image"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        id="bg-image-layer"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: pos,
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
        }}
      />
    </div>
  )
}
