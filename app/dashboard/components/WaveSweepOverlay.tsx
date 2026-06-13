'use client'

import { useEffect, useRef } from 'react'

// Full-screen, transparent, pointer-events-none celebration for crossing a
// swell's weekly target. Echoes the Anchors locked screen's stacked sine
// lines, but unlike WaveField it never paints a background — it clears to
// transparent each frame so it reads as a wave passing OVER the live screen.
//
// Two bands sweep at once: one wave front enters from the left and travels
// right, the other enters from the right and travels left, crossing in the
// middle. Each line is an ombre wake — full at the crest, fading to
// transparent behind it — tinted with the color of the swell that triggered
// the celebration. The whole thing runs once over ~1.2s, then calls onDone.
//
// prefers-reduced-motion gets a brief static translucent wash instead of the
// moving sweep.

const DURATION = 1250 // ms, within the 1.1-1.4s target
const SEG = 5 // px per drawn segment (alpha varies along the wake)

type Band = { dir: 1 | -1; lines: { yBase: number; amp: number; freq: number; phase: number; width: number; op: number }[] }

// Lines spread across the full viewport height so the passing wave washes the
// whole screen. One band sweeps right (dir 1), the other left (dir -1).
const BANDS: Band[] = [
  {
    dir: 1,
    lines: [
      { yBase: 0.16, amp: 0.030, freq: 0.013, phase: 0.0, width: 2.0, op: 0.26 },
      { yBase: 0.38, amp: 0.045, freq: 0.018, phase: 1.7, width: 2.4, op: 0.20 },
      { yBase: 0.60, amp: 0.035, freq: 0.011, phase: 3.1, width: 1.8, op: 0.28 },
      { yBase: 0.82, amp: 0.050, freq: 0.016, phase: 4.6, width: 2.2, op: 0.16 },
    ],
  },
  {
    dir: -1,
    lines: [
      { yBase: 0.24, amp: 0.042, freq: 0.015, phase: 0.8, width: 2.2, op: 0.22 },
      { yBase: 0.46, amp: 0.032, freq: 0.012, phase: 2.4, width: 1.8, op: 0.28 },
      { yBase: 0.70, amp: 0.048, freq: 0.017, phase: 3.9, width: 2.4, op: 0.18 },
      { yBase: 0.90, amp: 0.034, freq: 0.013, phase: 5.2, width: 2.0, op: 0.24 },
    ],
  },
]

export function WaveSweepOverlay({ color, onDone }: { color: string; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const doneRef = useRef(onDone)
  // Keep the latest onDone without restarting the animation effect.
  useEffect(() => { doneRef.current = onDone })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resolve a CSS var() color (e.g. the brand fallback) the way WaveField's
    // resolve() helper reads vars; concrete colors pass through unchanged.
    const ink = color.includes('var(')
      ? getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1).trim()).trim() || '#888'
      : color

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

    let raf = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    function yAt(line: Band['lines'][number], x: number, H: number, drift: number) {
      return H * line.yBase + Math.sin(x * line.freq + line.phase + drift) * (line.amp * H)
    }

    if (reduce) {
      // Static translucent wash: draw the lines once, hold, then clear + done.
      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.strokeStyle = ink
      for (const band of BANDS) {
        for (const line of band.lines) {
          ctx.globalAlpha = line.op * 0.7
          ctx.lineWidth = line.width
          ctx.beginPath()
          for (let x = 0; x <= W; x += SEG) {
            const y = yAt(line, x, H, 0)
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      timer = setTimeout(() => doneRef.current(), 650)
      return () => { if (timer) clearTimeout(timer); ro.disconnect() }
    }

    let start = 0
    function frame(ts: number) {
      if (!canvas || !ctx) return
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / DURATION)

      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      ctx.clearRect(0, 0, W, H) // transparent — never fill a background
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = ink

      // Global fade: full until 80%, then ease out so the wave clears.
      const fade = p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2
      const drift = p * 6 // gentle shimmer as the wave drifts past

      const wakeLen = W * 0.55
      for (const band of BANDS) {
        // Crest position: dir 1 enters left and exits right; dir -1 mirrors.
        const lead = band.dir === 1
          ? p * (W + wakeLen)
          : W - p * (W + wakeLen)

        for (const line of band.lines) {
          ctx.lineWidth = line.width
          for (let x = 0; x <= W; x += SEG) {
            // Distance behind the crest along the band's travel direction.
            const d = band.dir === 1 ? lead - x : x - lead
            if (d < 0 || d > wakeLen) continue // ahead of the crest, or past the tail
            const env = 1 - d / wakeLen // 1 at crest, 0 at tail → ombre wake
            const a = env * line.op * fade
            if (a <= 0.004) continue
            ctx.globalAlpha = a
            ctx.beginPath()
            ctx.moveTo(x, yAt(line, x, H, drift))
            ctx.lineTo(x + SEG, yAt(line, x + SEG, H, drift))
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1

      if (p >= 1) {
        ctx.clearRect(0, 0, W, H)
        doneRef.current()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
      ro.disconnect()
    }
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
