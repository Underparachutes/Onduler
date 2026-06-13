'use client'

import { useEffect, useRef } from 'react'

// Full-screen, transparent, pointer-events-none celebration for crossing a
// swell's weekly target. A wave of stacked water ripples rises up from the
// bottom of the screen and fades as it goes, echoing the Anchors locked
// screen's layered look.
//
// Depth comes from "fill below", the same technique WaveField uses: each
// ripple hides everything beneath it, so the lines stack into water layers
// instead of crossing like tangled ribbons. WaveField fills below with an
// opaque background to occlude; this overlay must stay transparent (it sits
// over the live screen), so it ERASES below each line with destination-out
// instead — which only clears this canvas's own pixels (the lines behind),
// never the live screen behind the canvas.
//
// Tinted with the color of the swell that triggered the celebration. Runs
// once, then calls onDone. prefers-reduced-motion gets a brief static wash.

const DURATION = 1900 // ms
const PSTEP = 4 // px between sampled points along each ripple path
const RISE = 1.6 // how far the field travels up, in screen heights
const TINT = 0.13 // peak opacity of the translucent water body

type Line = { yBase: number; amp: number; freq: number; phase: number; width: number; op: number }

// Deterministic per-index jitter (a stable hash, so every celebration looks
// the same) — keeps the field varied without Math.random.
function jit(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

function buildLines(): Line[] {
  const N = 28
  const out: Line[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) // 0 (back/top) .. 1 (front/bottom)
    out.push({
      // Start low and partly below the bottom edge so they rise up into view.
      yBase: 0.65 + t * 0.60, // 0.65 .. 1.25 of viewport height
      amp: 0.012 + jit(i, 2) * 0.026,
      freq: 0.018 + jit(i, 3) * 0.022, // several humps across the width = water texture
      phase: jit(i, 4) * Math.PI * 2,
      width: 1.5 + t * 3 + jit(i, 5) * 1, // thicker toward the front/bottom
      op: 0.34 + jit(i, 6) * 0.20,
    })
  }
  // Back (top) first so the front (bottom) draws last and sits in front.
  return out.sort((a, b) => a.yBase - b.yBase)
}

const ORDERED = buildLines()

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

    // Normalize any CSS color (incl. var()) to "r,g,b" via the canvas. The
    // ripples ombre from the triggering swell's color into the theme brand.
    const toRGB = (c: string): string => {
      const v = c.includes('var(')
        ? getComputedStyle(document.documentElement).getPropertyValue(c.slice(4, -1).trim()).trim() || '#888'
        : c
      ctx.fillStyle = v
      const s = ctx.fillStyle
      if (typeof s === 'string') {
        if (s[0] === '#') {
          const n = parseInt(s.slice(1), 16)
          return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
        }
        const m = s.match(/\d+/g)
        if (m && m.length >= 3) return `${m[0]},${m[1]},${m[2]}`
      }
      return '136,136,136'
    }
    const swellRgb = toRGB(color)
    const brandRgb = toRGB('var(--brand)')

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

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

    // Build a line's surface path and a fill path closed down to the bottom.
    function paths(line: Line, W: number, H: number, rise: number, drift: number) {
      const amp = line.amp * H
      const baseY = line.yBase * H - rise
      const linePath = new Path2D()
      const fillPath = new Path2D()
      for (let x = 0; x <= W; x += PSTEP) {
        const a = x * line.freq + line.phase + drift
        const yy = baseY + Math.sin(a) * amp + Math.sin(a * 2 + 1.3) * amp * 0.18
        if (x === 0) { linePath.moveTo(x, yy); fillPath.moveTo(x, yy) }
        else { linePath.lineTo(x, yy); fillPath.lineTo(x, yy) }
      }
      fillPath.lineTo(W, H + 2)
      fillPath.lineTo(0, H + 2)
      fillPath.closePath()
      return { linePath, fillPath }
    }

    // Draw one ripple: erase everything behind it below its line (depth), lay a
    // single translucent layer of water body below it (the erase first means
    // bands never stack into mud), then stroke the surface ripple on top. The
    // `paint` is the swell→brand ombre gradient, shared across lines.
    function drawLine(line: Line, W: number, H: number, rise: number, drift: number, alpha: number, tint: number, paint: CanvasGradient) {
      if (!ctx || (alpha <= 0.01 && tint <= 0.01)) return
      const { linePath, fillPath } = paths(line, W, H, rise, drift)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
      ctx.fill(fillPath)
      if (tint > 0.01) {
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = tint
        ctx.fillStyle = paint
        ctx.fill(fillPath)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = alpha
      ctx.lineWidth = line.width
      ctx.strokeStyle = paint
      ctx.stroke(linePath)
    }

    // Opacity by absolute screen height: a ripple fades as it climbs toward the
    // top, so the wave dissolves upward instead of flooding the screen.
    function topFade(cy: number, H: number): number {
      const yf = cy / H // 0 top .. 1 bottom
      const s = clamp01((yf - 0.10) / 0.48)
      return s * s * (3 - 2 * s) // smoothstep: clear up top, full below ~0.6H
    }

    function render(p: number, W: number, H: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const rise = p * RISE * H
      const drift = p * 4
      const fadeIn = clamp01(p / 0.10)
      const fadeOut = clamp01((1 - p) / 0.28)
      const timeFade = fadeIn * fadeOut
      // Swell → brand ombre across the width, shared by every ripple this frame.
      const paint = ctx.createLinearGradient(0, 0, W, 0)
      paint.addColorStop(0, `rgb(${swellRgb})`)
      paint.addColorStop(1, `rgb(${brandRgb})`)
      for (const line of ORDERED) {
        const cy = line.yBase * H - rise
        const f = topFade(cy, H) * timeFade
        drawLine(line, W, H, rise, drift, line.op * f, TINT * f, paint)
      }
      // Clear below the front (lowest) ripple so the water has a trailing edge
      // and the wave rises through rather than flooding to the bottom forever.
      const front = ORDERED[ORDERED.length - 1]
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
      ctx.fill(paths(front, W, H, rise, drift).fillPath)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    if (reduce) {
      const rect = canvas.getBoundingClientRect()
      render(0.35, rect.width, rect.height)
      timer = setTimeout(() => doneRef.current(), 700)
      return () => { if (timer) clearTimeout(timer); ro.disconnect() }
    }

    let start = 0
    function frame(ts: number) {
      if (!canvas || !ctx) return
      if (!start) start = ts
      const p = Math.min(1, (ts - start) / DURATION)
      const rect = canvas.getBoundingClientRect()
      render(p, rect.width, rect.height)
      if (p >= 1) {
        ctx.clearRect(0, 0, rect.width, rect.height)
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
