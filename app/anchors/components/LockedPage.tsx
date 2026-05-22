// Full vibe-only locked Anchors page (ADR 0007, renamed ADR 0008). Shown
// when weekly hasn't yet unlocked for the active chapter. No radar, no
// period filter, no engagement counter — pure mystery. Marketing site
// explains the mechanism for users who want the why.

import { WaveField, type WaveLine } from '@/app/components/WaveField'

const N = 7
const RADII = [0.92, 0.62, 0.78, 0.55, 0.88, 0.7, 0.5]
const BASE_R = 70
const CX = 90
const CY = 90

const VERTS = Array.from({ length: N }, (_, i) => {
  const a = (i / N) * Math.PI * 2 - Math.PI / 2
  const r = BASE_R * RADII[i]
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r }
})
const POLYGON_PTS = VERTS.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ')

// Back-to-front, 24 waves in 8 depth layers of 3. Within each layer,
// waves sit ~3% apart in yBase with different frequencies and phases so
// they constantly cross. The front wave's bg fill masks the back wave at
// every crossing — the line closer to us always prevails.
const WAVE_LINES: WaveLine[] = [
  // Layer 1 — far back
  { yBase: 0.18, amplitude: 10, frequency: 0.020, speed: 0.0020, phase: 0.0, width: 0.5, opacity: 0.05 },
  { yBase: 0.21, amplitude: 12, frequency: 0.030, speed: 0.0028, phase: 1.2, width: 0.5, opacity: 0.06 },
  { yBase: 0.24, amplitude: 11, frequency: 0.025, speed: 0.0024, phase: 2.8, width: 0.6, opacity: 0.07 },
  // Layer 2
  { yBase: 0.28, amplitude: 12, frequency: 0.022, speed: 0.0026, phase: 0.5, width: 0.6, opacity: 0.08 },
  { yBase: 0.31, amplitude: 14, frequency: 0.032, speed: 0.0034, phase: 1.8, width: 0.7, opacity: 0.09 },
  { yBase: 0.34, amplitude: 13, frequency: 0.027, speed: 0.0030, phase: 3.4, width: 0.7, opacity: 0.10 },
  // Layer 3
  { yBase: 0.38, amplitude: 14, frequency: 0.024, speed: 0.0022, phase: 0.9, width: 0.8, opacity: 0.13 },
  { yBase: 0.41, amplitude: 16, frequency: 0.034, speed: 0.0038, phase: 2.2, width: 0.8, opacity: 0.15 },
  { yBase: 0.44, amplitude: 15, frequency: 0.028, speed: 0.0028, phase: 4.0, width: 0.9, opacity: 0.17 },
  // Layer 4
  { yBase: 0.48, amplitude: 16, frequency: 0.020, speed: 0.0032, phase: 1.4, width: 1.0, opacity: 0.19 },
  { yBase: 0.51, amplitude: 18, frequency: 0.030, speed: 0.0040, phase: 2.8, width: 1.0, opacity: 0.21 },
  { yBase: 0.54, amplitude: 17, frequency: 0.025, speed: 0.0036, phase: 0.3, width: 1.1, opacity: 0.23 },
  // Layer 5
  { yBase: 0.58, amplitude: 18, frequency: 0.022, speed: 0.0028, phase: 1.9, width: 1.2, opacity: 0.26 },
  { yBase: 0.61, amplitude: 20, frequency: 0.032, speed: 0.0036, phase: 3.2, width: 1.3, opacity: 0.29 },
  { yBase: 0.64, amplitude: 19, frequency: 0.026, speed: 0.0032, phase: 0.7, width: 1.4, opacity: 0.32 },
  // Layer 6
  { yBase: 0.68, amplitude: 20, frequency: 0.018, speed: 0.0034, phase: 2.5, width: 1.6, opacity: 0.35 },
  { yBase: 0.71, amplitude: 22, frequency: 0.028, speed: 0.0042, phase: 0.1, width: 1.7, opacity: 0.38 },
  { yBase: 0.74, amplitude: 21, frequency: 0.023, speed: 0.0038, phase: 3.8, width: 1.8, opacity: 0.41 },
  // Layer 7
  { yBase: 0.78, amplitude: 22, frequency: 0.020, speed: 0.0030, phase: 1.6, width: 2.0, opacity: 0.44 },
  { yBase: 0.81, amplitude: 24, frequency: 0.030, speed: 0.0038, phase: 3.0, width: 2.2, opacity: 0.47 },
  { yBase: 0.84, amplitude: 23, frequency: 0.024, speed: 0.0034, phase: 0.4, width: 2.3, opacity: 0.50 },
  // Layer 8 — closest
  { yBase: 0.88, amplitude: 24, frequency: 0.016, speed: 0.0036, phase: 2.2, width: 2.6, opacity: 0.53 },
  { yBase: 0.92, amplitude: 26, frequency: 0.026, speed: 0.0044, phase: 0.8, width: 2.8, opacity: 0.56 },
  { yBase: 0.96, amplitude: 28, frequency: 0.021, speed: 0.0040, phase: 3.5, width: 3.2, opacity: 0.60 },
]

export function LockedPage() {
  return (
    <div className="relative flex min-h-[420px] flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14 text-center">
      <WaveField lines={WAVE_LINES} />

      {/* Blurred irregular radar silhouette */}
      <div className="relative mb-6 h-[180px] w-[180px]" style={{ zIndex: 1 }}>
        <svg
          viewBox="0 0 180 180"
          width="180"
          height="180"
          className="absolute inset-0"
          style={{ filter: 'blur(7px)', opacity: 0.7 }}
        >
          <polygon
            points={POLYGON_PTS}
            fill="var(--th-accent)"
            fillOpacity="0.22"
            stroke="var(--th-accent)"
            strokeOpacity="0.5"
            strokeWidth="1.5"
          />
        </svg>
        <svg
          viewBox="0 0 180 180"
          width="180"
          height="180"
          className="absolute inset-0"
          style={{ animation: 'slow-breathe 4s ease-in-out infinite', transformOrigin: 'center' }}
        >
          <polygon
            points={POLYGON_PTS}
            fill="none"
            stroke="var(--th-faint)"
            strokeWidth="0.6"
            opacity="0.55"
          />
          {VERTS.map((v, i) => (
            <line key={i} x1={CX} y1={CY} x2={v.x} y2={v.y} stroke="var(--th-faint)" strokeWidth="0.4" opacity="0.35" />
          ))}
        </svg>
      </div>

      <p
        className="display relative max-w-[280px] text-pretty"
        style={{
          zIndex: 1,
          fontSize: 20,
          lineHeight: 1.55,
          letterSpacing: '0.04em',
          color: 'var(--th-secondary)',
        }}
      >
        Glimpses of where you&apos;ve been. Come back as you log.
      </p>
      <p
        className="relative mt-3.5 lowercase"
        style={{
          zIndex: 1,
          fontSize: 12,
          letterSpacing: '0.04em',
          color: 'var(--th-faint)',
        }}
      >
        weekly
      </p>
      <p
        className="relative mt-6 italic"
        style={{
          zIndex: 1,
          fontSize: 12,
          letterSpacing: '0.04em',
          color: 'var(--th-faint)',
        }}
      >
        Not all those who wander are lost.
      </p>
    </div>
  )
}
