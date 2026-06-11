'use client'

import { useEffect, useState } from 'react'

function parsePosition(pos: string): { position: string; scale: number } {
  const parts = pos.trim().split(/\s+/)
  if (parts.length >= 2) {
    const x = parseFloat(parts[0])
    const y = parseFloat(parts[1])
    const s = parts[2] ? parseFloat(parts[2]) : 1
    if (!isNaN(x) && !isNaN(y)) return { position: `${x}% ${y}%`, scale: isNaN(s) ? 1 : s }
  }
  return { position: pos, scale: 1 }
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

  const { position: pos, scale } = parsePosition(position)

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
      <ScaledBackground url={url} position={pos} scale={scale} />
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

function ScaledBackground({ url, position, scale }: { url: string; position: string; scale: number }) {
  const [bgSize, setBgSize] = useState<string>('cover')

  useEffect(() => {
    if (scale <= 1) { setBgSize('cover'); return }
    const img = new Image()
    img.onload = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const imgR = img.naturalWidth / img.naturalHeight
      const vpR = vw / vh
      setBgSize(imgR > vpR ? `auto ${vh * scale}px` : `${vw * scale}px auto`)
    }
    img.src = url
  }, [url, scale])

  return (
    <div
      id="bg-image-layer"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${url})`,
        backgroundSize: bgSize,
        backgroundPosition: position,
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
