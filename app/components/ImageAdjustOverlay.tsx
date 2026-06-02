'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  url: string
  initialX: number
  initialY: number
  initialScale: number
  onSave: (x: number, y: number, scale: number) => void
  onCancel: () => void
}

export function ImageAdjustOverlay({ url, initialX, initialY, initialScale, onSave, onCancel }: Props) {
  const [posX, setPosX] = useState(initialX)
  const [posY, setPosY] = useState(initialY)
  const [scale, setScale] = useState(initialScale)
  const [imgRatio, setImgRatio] = useState(1)
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setImgRatio(img.naturalWidth / img.naturalHeight)
    }
    img.src = url
  }, [url])

  function getExcess(s: number) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const vpRatio = vw / vh
    let baseW: number, baseH: number
    if (imgRatio > vpRatio) {
      baseH = vh
      baseW = vh * imgRatio
    } else {
      baseW = vw
      baseH = vw / imgRatio
    }
    return { x: baseW * s - vw, y: baseH * s - vh }
  }

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (pointersRef.current.size === 1) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: posX, startPosY: posY }
      pinchRef.current = null
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null
      const pts = [...pointersRef.current.values()]
      pinchRef.current = { startDist: dist(pts[0], pts[1]), startScale: scale }
    }
  }, [posX, posY, scale])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchRef.current && pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      const d = dist(pts[0], pts[1])
      const newScale = Math.max(1, pinchRef.current.startScale * (d / pinchRef.current.startDist))
      setScale(newScale)
      return
    }

    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const excess = getExcess(scale)
    const newX = excess.x > 0
      ? Math.max(0, Math.min(100, dragRef.current.startPosX - (dx / excess.x) * 100))
      : 50
    const newY = excess.y > 0
      ? Math.max(0, Math.min(100, dragRef.current.startPosY - (dy / excess.y) * 100))
      : 50
    setPosX(newX)
    setPosY(newY)
  }, [scale, imgRatio])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (pointersRef.current.size === 0) dragRef.current = null
    if (pointersRef.current.size === 1) {
      const pt = [...pointersRef.current.values()][0]
      dragRef.current = { startX: pt.x, startY: pt.y, startPosX: posX, startPosY: posY }
    }
  }, [posX, posY])

  function bgSizeStyle() {
    if (scale <= 1) return 'cover'
    const vw = window.innerWidth
    const vh = window.innerHeight
    const vpRatio = vw / vh
    if (imgRatio > vpRatio) {
      return `auto ${vh * scale}px`
    } else {
      return `${vw * scale}px auto`
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={(e) => {
        e.preventDefault()
        setScale(s => Math.max(1, s - e.deltaY * 0.002))
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${url})`,
          backgroundSize: bgSizeStyle(),
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute inset-x-0 top-12 flex justify-center">
        <p className="rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80">
          Pinch to zoom, drag to move
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
          onClick={(e) => { e.stopPropagation(); onSave(posX, posY, scale) }}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          Done
        </button>
      </div>
    </div>
  )
}
