'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  url: string
  initialX: number
  initialY: number
  onSave: (x: number, y: number) => void
  onCancel: () => void
}

export function ImageAdjustOverlay({ url, initialX, initialY, onSave, onCancel }: Props) {
  const [posX, setPosX] = useState(initialX)
  const [posY, setPosY] = useState(initialY)
  const [excess, setExcess] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const imgRatio = img.naturalWidth / img.naturalHeight
      const vpRatio = vw / vh
      let scaledW: number, scaledH: number
      if (imgRatio > vpRatio) {
        scaledH = vh
        scaledW = vh * imgRatio
      } else {
        scaledW = vw
        scaledH = vw / imgRatio
      }
      setExcess({ x: scaledW - vw, y: scaledH - vh })
    }
    img.src = url
  }, [url])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: posX, startPosY: posY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [posX, posY])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const newX = excess.x > 0
      ? Math.max(0, Math.min(100, dragRef.current.startPosX - (dx / excess.x) * 100))
      : 50
    const newY = excess.y > 0
      ? Math.max(0, Math.min(100, dragRef.current.startPosY - (dy / excess.y) * 100))
      : 50
    setPosX(newX)
    setPosY(newY)
  }, [excess])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute inset-x-0 top-12 flex justify-center">
        <p className="rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80">
          Drag to reposition
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-12 flex justify-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); onCancel() }}
          className="rounded-full bg-black/50 px-6 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-black/70"
        >
          Cancel
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSave(posX, posY) }}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          Done
        </button>
      </div>
    </div>
  )
}
