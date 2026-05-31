// Server-rendered static SVG version of the WaveField on the locked Anchors
// page. Same sine math as app/components/WaveField.tsx, but emitted as SVG
// strings at a fixed time (no animation) for inlining into email HTML.
//
// Email clients don't run JS or canvas, but iOS Mail, Apple Mail, and Gmail
// (web + mobile) all render inline SVG cleanly. Outlook desktop strips SVG;
// for that client the email body still reads correctly without the visual,
// so the degradation is acceptable.
//
// The original WaveField uses three passes per wave (fill below + halo
// stroke + ink stroke) to clip back waves at crossings; we replicate that
// here with three SVG primitives per wave, drawn back-to-front.

export type WaveLine = {
  yBase: number      // 0..1 fraction of height where the wave centers
  amplitude: number  // sine amplitude in px
  frequency: number  // angular frequency per x px
  phase: number      // phase offset in radians
  width: number      // stroke width in px
  opacity: number    // 0..1 ink opacity
}

// Lifted from LockedPage.tsx. Static layout — same 24 lines, same ordering.
export const EMAIL_WAVE_LINES: WaveLine[] = [
  { yBase: 0.18, amplitude: 10, frequency: 0.020, phase: 0.0, width: 0.5, opacity: 0.05 },
  { yBase: 0.21, amplitude: 12, frequency: 0.030, phase: 1.2, width: 0.5, opacity: 0.06 },
  { yBase: 0.24, amplitude: 11, frequency: 0.025, phase: 2.8, width: 0.6, opacity: 0.07 },
  { yBase: 0.28, amplitude: 12, frequency: 0.022, phase: 0.5, width: 0.6, opacity: 0.08 },
  { yBase: 0.31, amplitude: 14, frequency: 0.032, phase: 1.8, width: 0.7, opacity: 0.09 },
  { yBase: 0.34, amplitude: 13, frequency: 0.027, phase: 3.4, width: 0.7, opacity: 0.10 },
  { yBase: 0.38, amplitude: 14, frequency: 0.024, phase: 0.9, width: 0.8, opacity: 0.13 },
  { yBase: 0.41, amplitude: 16, frequency: 0.034, phase: 2.2, width: 0.8, opacity: 0.15 },
  { yBase: 0.44, amplitude: 15, frequency: 0.028, phase: 4.0, width: 0.9, opacity: 0.17 },
  { yBase: 0.48, amplitude: 16, frequency: 0.020, phase: 1.4, width: 1.0, opacity: 0.19 },
  { yBase: 0.51, amplitude: 18, frequency: 0.030, phase: 2.8, width: 1.0, opacity: 0.21 },
  { yBase: 0.54, amplitude: 17, frequency: 0.025, phase: 0.3, width: 1.1, opacity: 0.23 },
  { yBase: 0.58, amplitude: 18, frequency: 0.022, phase: 1.9, width: 1.2, opacity: 0.26 },
  { yBase: 0.61, amplitude: 20, frequency: 0.032, phase: 3.2, width: 1.3, opacity: 0.29 },
  { yBase: 0.64, amplitude: 19, frequency: 0.026, phase: 0.7, width: 1.4, opacity: 0.32 },
  { yBase: 0.68, amplitude: 20, frequency: 0.018, phase: 2.5, width: 1.6, opacity: 0.35 },
  { yBase: 0.71, amplitude: 22, frequency: 0.028, phase: 0.1, width: 1.7, opacity: 0.38 },
  { yBase: 0.74, amplitude: 21, frequency: 0.023, phase: 3.8, width: 1.8, opacity: 0.41 },
  { yBase: 0.78, amplitude: 22, frequency: 0.020, phase: 1.6, width: 2.0, opacity: 0.44 },
  { yBase: 0.81, amplitude: 24, frequency: 0.030, phase: 3.0, width: 2.2, opacity: 0.47 },
  { yBase: 0.84, amplitude: 23, frequency: 0.024, phase: 0.4, width: 2.3, opacity: 0.50 },
  { yBase: 0.88, amplitude: 24, frequency: 0.016, phase: 2.2, width: 2.6, opacity: 0.53 },
  { yBase: 0.92, amplitude: 26, frequency: 0.026, phase: 0.8, width: 2.8, opacity: 0.56 },
  { yBase: 0.96, amplitude: 28, frequency: 0.021, phase: 3.5, width: 3.2, opacity: 0.60 },
]

type Options = {
  width?: number   // viewport width in px (default 600)
  height?: number  // viewport height in px (default 280)
  bg?: string      // background hex (default deep ocean)
  ink?: string     // wave-line color hex (default cream)
  samples?: number // points along the path (higher = smoother)
}

// Sine value matching the runtime canvas: y = H*yBase + sin(angle)*amp +
// sin(angle*2 + 1.3)*amp*0.18, evaluated at t=0 (no animation).
function waveY(wv: WaveLine, x: number, H: number): number {
  const angle = x * wv.frequency + wv.phase
  const harmonic = Math.sin(angle * 2 + 1.3) * wv.amplitude * 0.18
  return H * wv.yBase + Math.sin(angle) * wv.amplitude + harmonic
}

// Polygon points "x,y x,y ..." for the area under the wave (fills the
// region below the wave path with bg, hiding any back-wave undersides).
// One decimal of precision keeps the SVG payload small enough that the
// finished email stays under Gmail's 102KB clip threshold.
function fillBelowPoints(wv: WaveLine, W: number, H: number, samples: number): string {
  const step = W / samples
  const pts: string[] = []
  for (let i = 0; i <= samples; i++) {
    const x = i * step
    pts.push(`${x.toFixed(1)},${waveY(wv, x, H).toFixed(1)}`)
  }
  pts.push(`${W.toFixed(1)},${(H + 2).toFixed(1)}`)
  pts.push(`0,${(H + 2).toFixed(1)}`)
  return pts.join(' ')
}

// Polyline path "M x,y L x,y L x,y ..." traced along the wave path itself.
function wavePath(wv: WaveLine, W: number, H: number, samples: number): string {
  const step = W / samples
  const parts: string[] = []
  for (let i = 0; i <= samples; i++) {
    const x = i * step
    const y = waveY(wv, x, H)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return parts.join(' ')
}

// Render the full wave-field SVG as an inlinable string. Returned without
// XML prolog so it can be embedded directly inside an HTML <body>.
export function renderEmailWaveSvg(opts: Options = {}): string {
  const W = opts.width ?? 600
  const H = opts.height ?? 280
  const bg = opts.bg ?? '#0c1116'
  const ink = opts.ink ?? '#e8e6e1'
  const samples = opts.samples ?? 90

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
      `width="100%" height="${H}" preserveAspectRatio="xMidYMid slice" ` +
      `role="img" aria-label="Onduler wave field">`,
  )
  // Solid background — gives the deep-ocean ground the locked Anchors page uses.
  parts.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`)

  for (const wv of EMAIL_WAVE_LINES) {
    const fill = fillBelowPoints(wv, W, H, samples)
    const path = wavePath(wv, W, H, samples)
    // Back-to-front per wave: fill-below (hides backs), halo stroke (clips
    // back waves at crossings), then the visible ink stroke on top.
    parts.push(`<polygon points="${fill}" fill="${bg}"/>`)
    parts.push(
      `<path d="${path}" fill="none" stroke="${bg}" stroke-width="${(wv.width + 6).toFixed(2)}" ` +
        `stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    parts.push(
      `<path d="${path}" fill="none" stroke="${ink}" stroke-width="${wv.width.toFixed(2)}" ` +
        `stroke-linecap="round" stroke-linejoin="round" opacity="${wv.opacity.toFixed(2)}"/>`,
    )
  }
  parts.push(`</svg>`)
  return parts.join('')
}
