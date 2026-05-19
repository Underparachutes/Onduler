// Full vibe-only locked Reflections page (ADR 0007). Shown when weekly
// hasn't yet unlocked for the active chapter. No radar, no period filter,
// no engagement counter — pure mystery. Marketing site explains the
// mechanism for users who want the why.

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

// Back-to-front. yBase rises down the screen so the lower waves visually
// sit "in front" of the upper, masking them at every crossing.
const WAVE_LINES: WaveLine[] = [
  { yBase: 0.18, amplitude: 6,  frequency: 0.026, speed: 0.0030, phase: 0.2, width: 0.9, opacity: 0.10 },
  { yBase: 0.28, amplitude: 9,  frequency: 0.022, speed: 0.0040, phase: 1.6, width: 1.0, opacity: 0.13 },
  { yBase: 0.38, amplitude: 7,  frequency: 0.028, speed: 0.0025, phase: 0.8, width: 1.1, opacity: 0.16 },
  { yBase: 0.50, amplitude: 14, frequency: 0.018, speed: 0.0050, phase: 2.4, width: 1.4, opacity: 0.20 },
  { yBase: 0.62, amplitude: 9,  frequency: 0.024, speed: 0.0035, phase: 1.1, width: 1.5, opacity: 0.24 },
  { yBase: 0.74, amplitude: 16, frequency: 0.020, speed: 0.0045, phase: 3.0, width: 1.8, opacity: 0.30 },
  { yBase: 0.86, amplitude: 12, frequency: 0.022, speed: 0.0030, phase: 0.5, width: 2.0, opacity: 0.38 },
  { yBase: 0.98, amplitude: 20, frequency: 0.018, speed: 0.0040, phase: 2.0, width: 2.6, opacity: 0.46 },
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
          style={{ animation: 'slow-breathe 4s ease-in-out infinite' }}
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
    </div>
  )
}
