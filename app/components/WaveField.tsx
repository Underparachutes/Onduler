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

// Canvas-rendered stacked sine waves. Each wave is drawn back-to-front
// with a wide bg-colored halo that clips back waves only at crossing
// points, then a visible ink stroke on top. All waves remain visible
// between crossings; at crossings, the closer wave prevails.
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

        // Fill from wave path down to canvas bottom with bg —
        // hides any back-wave undersides below this wave.
        ctx.beginPath()
        for (let x = 0; x <= W; x++) {
          const y = angle_fn(x)
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineTo(W, H + 2)
        ctx.lineTo(0, H + 2)
        ctx.closePath()
        ctx.fillStyle = bg
        ctx.globalAlpha = 1
        ctx.fill()

        // Halo stroke along the wave path — clips back waves
        // at crossing points above this wave.
        ctx.beginPath()
        for (let x = 0; x <= W; x++) {
          const y = angle_fn(x)
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = wv.width + 6
        ctx.strokeStyle = bg
        ctx.globalAlpha = 1
        ctx.stroke()

        // Visible stroke in ink.
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
