'use client'

import { useEffect, useRef } from 'react'

// Full-screen, transparent, pointer-events-none celebration for crossing a
// swell's weekly target. Echoes the Anchors locked screen's stacked sine
// lines, with the same sense of depth: a wave closer to the bottom of the
// screen sits IN FRONT of the wave behind it, cutting a clean gap through it
// at crossings.
//
// WaveField gets that depth by painting an opaque background to occlude back
// waves. This overlay must stay transparent (it sits over the live screen),
// so instead of painting bg it ERASES with destination-out — which only
// clears this canvas's own pixels (the back wave), never the live screen
// behind it. Same layered look, no opaque fill.
//
// Two bands sweep at once: one wave front enters from the left and travels
// right, the other from the right travels left, crossing in the middle. Each
// line is an ombre wake (full at the crest, fading to transparent behind),
// tinted with the color of the swell that triggered the celebration. Runs
// once over ~1.35s, then calls onDone.
//
// prefers-reduced-motion gets a brief static translucent wash instead.

const DURATION = 1350 // ms, within the 1.1-1.4s target
const SEG = 7 // px per drawn segment (alpha varies along the wake)
const HALO = 5 // px the erase pass adds, so a front wave cuts a clean gap

// dir 1 sweeps left→right, dir -1 right→left. Lines vary in thickness for the
// depth read; amplitudes are fractions of viewport height, frequencies are low
// so the waves are long and graceful. Many densely-stacked lines overlap into
// a continuous water surface rather than reading as individual snakes.
type Line = { dir: 1 | -1; yBase: number; amp: number; freq: number; phase: number; width: number; op: number }

// Deterministic per-index jitter (a stable hash, so every celebration looks
// the same) — keeps the field varied without Math.random.
function jit(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

function buildLines(): Line[] {
  const N = 22
  const out: Line[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) // 0 (top) .. 1 (bottom)
    out.push({
      dir: i % 2 === 0 ? 1 : -1, // alternate directions so halves cross
      yBase: 0.04 + t * 0.92 + (jit(i, 1) - 0.5) * 0.025,
      amp: 0.030 + jit(i, 2) * 0.030,
      freq: 0.006 + jit(i, 3) * 0.006,
      phase: jit(i, 4) * Math.PI * 2,
      width: 2 + t * 4 + jit(i, 5) * 1.6, // thicker toward the bottom/front
      op: 0.30 + jit(i, 6) * 0.18,
    })
  }
  return out
}

// Sorted top (back) → bottom (front) so the bottom-most draws last, in front.
const ORDERED = buildLines().sort((a, b) => a.yBase - b.yBase)

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

    function yAt(line: Line, x: number, H: number, drift: number) {
      const angle = x * line.freq + line.phase + drift
      const amp = line.amp * H
      // Secondary harmonic (as in WaveField) breaks the clean sine so the line
      // reads as a water ripple, not a snake.
      const second = Math.sin(angle * 2 + 1.3) * amp * 0.18
      return H * line.yBase + Math.sin(angle) * amp + second
    }

    // Draw one line's visible stroke (or, with erase=true, its wider erase
    // pass) across the wake window, alpha following the ombre envelope.
    function drawLine(line: Line, W: number, H: number, lead: number, wakeLen: number, fade: number, drift: number, erase: boolean) {
      if (!ctx) return
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
      ctx.lineWidth = erase ? line.width + HALO : line.width
      for (let x = 0; x <= W; x += SEG) {
        const d = line.dir === 1 ? lead - x : x - lead // distance behind the crest
        if (d < 0 || d > wakeLen) continue // ahead of the crest, or past the tail
        const env = 1 - d / wakeLen // 1 at crest, 0 at tail
        const a = erase ? Math.min(1, env * 1.6) * fade : env * line.op * fade
        if (a <= 0.004) continue
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.moveTo(x, yAt(line, x, H, drift))
        ctx.lineTo(x + SEG, yAt(line, x + SEG, H, drift))
        ctx.stroke()
      }
    }

    if (reduce) {
      // Static translucent wash with the same depth ordering, then clear + done.
      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = ink
      for (const line of ORDERED) {
        // Erase the back lines along this path, then draw the full line on top.
        for (const erase of [true, false]) {
          ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
          ctx.lineWidth = erase ? line.width + HALO : line.width
          ctx.globalAlpha = erase ? 0.9 : line.op * 0.7
          ctx.beginPath()
          for (let x = 0; x <= W; x += SEG) {
            const y = yAt(line, x, H, 0)
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      }
      ctx.globalCompositeOperation = 'source-over'
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

      const fade = p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2 // ease out so the wave clears
      const drift = p * 5 // gentle shimmer as the wave drifts past
      const wakeLen = W * 0.6

      for (const line of ORDERED) {
        const lead = line.dir === 1 ? p * (W + wakeLen) : W - p * (W + wakeLen)
        // Erase the already-drawn back lines along this line's path first
        // (so this line cuts a clean gap through them), then draw it on top.
        // Both passes run fully before moving on so a line never erases itself.
        drawLine(line, W, H, lead, wakeLen, fade, drift, true)
        drawLine(line, W, H, lead, wakeLen, fade, drift, false)
      }

      ctx.globalCompositeOperation = 'source-over'
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
