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
// Two halves sweep at once: one wave front enters from the left and travels
// right, the other from the right travels left, crossing in the middle. Many
// densely-stacked lines with wide height variance overlap into a continuous
// water surface. Each line is an ombre wake (full at the crest, fading to
// transparent behind), tinted with the color of the swell that triggered the
// celebration. Runs once, then calls onDone.
//
// prefers-reduced-motion gets a brief static translucent wash instead.

const DURATION = 2000 // ms
const PSTEP = 4 // px between sampled points along each wave path
const HALO = 5 // px the erase pass adds, so a front wave cuts a clean gap

type Line = { dir: 1 | -1; yBase: number; amp: number; freq: number; phase: number; width: number; op: number }

// Deterministic per-index jitter (a stable hash, so every celebration looks
// the same) — keeps the field varied without Math.random.
function jit(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

function buildLines(): Line[] {
  const N = 38
  const out: Line[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) // 0 (top) .. 1 (bottom)
    out.push({
      dir: i % 2 === 0 ? 1 : -1, // alternate directions so halves cross
      yBase: 0.03 + t * 0.94 + (jit(i, 1) - 0.5) * 0.02,
      // Wide height variance: some lines nearly flat, some big swells.
      amp: 0.012 + jit(i, 2) * 0.100,
      freq: 0.005 + jit(i, 3) * 0.007,
      phase: jit(i, 4) * Math.PI * 2,
      width: 1.5 + t * 4 + jit(i, 5) * 2, // thicker toward the bottom/front
      op: 0.28 + jit(i, 6) * 0.20,
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

    // Resolve a CSS var() color (e.g. the brand fallback), then normalize any
    // CSS color to "r,g,b" via the canvas so gradient stops can share the same
    // RGB at alpha 0 and 1 (avoids the dark fringe 'transparent' would add).
    const raw = color.includes('var(')
      ? getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1).trim()).trim() || '#888'
      : color
    ctx.fillStyle = raw
    const norm = ctx.fillStyle
    let rgb = '136,136,136'
    if (typeof norm === 'string') {
      if (norm[0] === '#') {
        const n = parseInt(norm.slice(1), 16)
        rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
      } else {
        const m = norm.match(/\d+/g)
        if (m && m.length >= 3) rgb = `${m[0]},${m[1]},${m[2]}`
      }
    }

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
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

    function yAt(line: Line, x: number, H: number, drift: number) {
      const angle = x * line.freq + line.phase + drift
      const amp = line.amp * H
      // Secondary harmonic (as in WaveField) breaks the clean sine so the line
      // reads as a water ripple, not a snake.
      const second = Math.sin(angle * 2 + 1.3) * amp * 0.18
      return H * line.yBase + Math.sin(angle) * amp + second
    }

    function buildPath(line: Line, W: number, H: number, drift: number) {
      const path = new Path2D()
      for (let x = 0; x <= W; x += PSTEP) {
        const y = yAt(line, x, H, drift)
        if (x === 0) path.moveTo(x, y); else path.lineTo(x, y)
      }
      return path
    }

    // Ombre wake gradient: transparent at the tail, opaque at the crest,
    // transparent just ahead of the crest. `body` is "r,g,b" (or "0,0,0" for
    // the erase pass, where only alpha matters).
    function wakeGradient(W: number, lead: number, wakeLen: number, dir: 1 | -1, body: string) {
      const g = ctx!.createLinearGradient(0, 0, W, 0)
      if (dir === 1) {
        const tail = (lead - wakeLen) / W
        const crest = lead / W
        g.addColorStop(clamp01(tail), `rgba(${body},0)`)
        g.addColorStop(clamp01(crest), `rgba(${body},1)`)
        g.addColorStop(clamp01(crest + 0.001), `rgba(${body},0)`)
      } else {
        const crest = lead / W
        const tail = (lead + wakeLen) / W
        g.addColorStop(clamp01(crest - 0.001), `rgba(${body},0)`)
        g.addColorStop(clamp01(crest), `rgba(${body},1)`)
        g.addColorStop(clamp01(tail), `rgba(${body},0)`)
      }
      return g
    }

    if (reduce) {
      // Static translucent wash with depth ordering, then clear + done.
      const rect = canvas.getBoundingClientRect()
      const W = rect.width
      const H = rect.height
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const line of ORDERED) {
        const path = buildPath(line, W, H, 0)
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = line.width + HALO
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = '#000'
        ctx.stroke(path)
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = line.width
        ctx.globalAlpha = line.op * 0.7
        ctx.strokeStyle = `rgb(${rgb})`
        ctx.stroke(path)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      timer = setTimeout(() => doneRef.current(), 700)
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

      const fade = p < 0.82 ? 1 : 1 - (p - 0.82) / 0.18 // ease out so the wave clears
      const drift = p * 5 // gentle shimmer as the wave drifts past
      const wakeLen = W * 0.85 // long wake so much of the field shows at once

      for (const line of ORDERED) {
        const lead = line.dir === 1 ? p * (W + wakeLen) : W - p * (W + wakeLen)
        const path = buildPath(line, W, H, drift)
        // Erase the already-drawn back lines along this path first (so this
        // line cuts a clean gap through them), then draw it on top.
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = line.width + HALO
        ctx.globalAlpha = fade
        ctx.strokeStyle = wakeGradient(W, lead, wakeLen, line.dir, '0,0,0')
        ctx.stroke(path)
        ctx.globalCompositeOperation = 'source-over'
        ctx.lineWidth = line.width
        ctx.globalAlpha = line.op * fade
        ctx.strokeStyle = wakeGradient(W, lead, wakeLen, line.dir, rgb)
        ctx.stroke(path)
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
