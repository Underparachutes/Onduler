'use client'

import { useEffect, useRef } from 'react'

export type WaveLine = {
  yBase: number
  amplitude: number
  frequency: number
  speed: number
  phase: number
  width: number
  opacity: number
}

// Canvas-rendered stacked sine waves. Each wave fills the area below
// itself with the parent's --th-bg, so it masks the waves drawn earlier
// at every crossing — the way layered water surfaces read. Strokes the
// wave line in --th-text at the configured opacity.
export function WaveField({ lines }: { lines: WaveLine[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    let raf = 0
    let t = 0

    const resolve = (name: string) => {
      const el = canvas.parentElement
      if (!el) return '#000'
      return getComputedStyle(el).getPropertyValue(name).trim() || '#000'
    }

    function fit() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)

    function frame() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      const bg = resolve('--th-bg')
      const ink = resolve('--th-text')

      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      t += 1

      for (let i = 0; i < lines.length; i++) {
        const wv = lines[i]
        const angle_fn = (x: number) => {
          const angle = x * wv.frequency + t * wv.speed + wv.phase
          const y2 = Math.sin(angle * 2 + 1.3) * wv.amplitude * 0.18
          return H * wv.yBase + Math.sin(angle) * wv.amplitude + y2
        }

        // Mask layer: fill below the wave with bg so earlier waves are hidden.
        ctx.beginPath()
        for (let x = 0; x <= W; x++) {
          const y = angle_fn(x)
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineTo(W, H)
        ctx.lineTo(0, H)
        ctx.closePath()
        ctx.fillStyle = bg
        ctx.fill()

        // Body tint: subtle ink fill below the wave so each layer reads
        // as a visible surface. Front waves accumulate more tint.
        ctx.globalAlpha = wv.opacity * 0.22
        ctx.fillStyle = ink
        ctx.fill()
        ctx.globalAlpha = 1

        // Stroke the wave line in ink at the configured opacity / weight.
        ctx.beginPath()
        for (let x = 0; x <= W; x++) {
          const y = angle_fn(x)
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = wv.width
        ctx.globalAlpha = wv.opacity
        ctx.strokeStyle = ink
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [lines])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
