// Frozen weekly radar for the ceremony reveal. No drag, no period toggle,
// no pill. Matches the live SwellRadar's visual treatment — frosted glass
// wedges, ombré slices, separator lines, tangent-rotated labels — but it's
// pure SSR, a contemplative snapshot.

import {
  axisAngleRad,
  wedgePath,
  wedgeBoundary,
  slicePath,
  actualPolygonPath,
  chartCeiling,
  scaleConfigFor,
} from '@/lib/radar'

const SIZE = 360
const CENTER = { x: SIZE / 2, y: SIZE / 2 }
const RADIUS = 130
const LABEL_PAD = 22
const VB_EXTENT = RADIUS + LABEL_PAD + 40
const VB_ORIGIN = CENTER.x - VB_EXTENT
const VB_SIZE = VB_EXTENT * 2

type Swell = { id: string; name: string; color: string; target: number }

export function FrozenRadar({
  swells,
  actuals,
  trackingMode,
}: {
  swells: Swell[]
  actuals: number[]
  trackingMode: 'points' | 'hours'
}) {
  const count = swells.length
  if (count < 3) {
    return (
      <p className="text-center text-sm text-th-muted">
        Add a few more swells to see the shape.
      </p>
    )
  }

  const targets = swells.map(s => s.target)
  const scale = scaleConfigFor(trackingMode)
  const chartMax = chartCeiling([...targets, ...actuals], scale)
  const actualPolygon = actualPolygonPath(actuals, targets, chartMax, RADIUS, CENTER)

  function labelPos(index: number) {
    const angle = axisAngleRad(index, count)
    const r = RADIUS + LABEL_PAD
    const x = CENTER.x + Math.cos(angle) * r
    const y = CENTER.y + Math.sin(angle) * r
    const deg = (angle * 180) / Math.PI
    const onBottom = Math.sin(angle) > 0.01
    const rotation = onBottom ? deg - 90 : deg + 90
    return { x, y, rotation }
  }

  return (
    <svg
      viewBox={`${VB_ORIGIN} ${VB_ORIGIN} ${VB_SIZE} ${VB_SIZE}`}
      className="w-full"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="fr-frost" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <clipPath id="fr-wake-cutout">
          <path d={`M ${VB_ORIGIN} ${VB_ORIGIN} h ${VB_SIZE} v ${VB_SIZE} h -${VB_SIZE} Z ${actualPolygon}`} clipRule="evenodd" />
        </clipPath>
        {swells.map((s, i) => {
          const targetR = chartMax > 0 ? (targets[i] / chartMax) * RADIUS : 0
          return (
            <radialGradient
              key={`grad-${s.id}`}
              id={`fr-slice-grad-${s.id}`}
              cx={CENTER.x}
              cy={CENTER.y}
              r={Math.max(targetR, 1)}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={`color-mix(in oklch, ${s.color} 35%, var(--th-surface))`} />
              <stop offset="100%" stopColor={s.color} />
            </radialGradient>
          )
        })}
      </defs>

      {/* Wedge fills — frosted glass effect */}
      {swells.map((s, i) => (
        <g key={`wedge-${s.id}`}>
          <path
            d={wedgePath(i, targets, chartMax, RADIUS, CENTER)}
            fill={s.color}
            fillOpacity={0.25}
            filter="url(#fr-frost)"
          />
          <path
            d={wedgePath(i, targets, chartMax, RADIUS, CENTER)}
            fill="var(--th-frost-overlay)"
            fillOpacity={0.35}
            clipPath="url(#fr-wake-cutout)"
          />
        </g>
      ))}

      {/* Filled slices — ombré from surface-blend at center to swell color at edge */}
      {swells.map((s, i) => {
        const d = slicePath(i, actuals, targets, chartMax, RADIUS, CENTER)
        if (!d) return null
        return (
          <path
            key={`slice-${s.id}`}
            d={d}
            fill={`url(#fr-slice-grad-${s.id})`}
            fillOpacity={0.95}
          />
        )
      })}

      {/* Separator lines on bisector radials */}
      {swells.map((_, i) => {
        const b = wedgeBoundary(i, targets, chartMax, RADIUS, CENTER)
        return (
          <line
            key={`sep-${i}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-th-text, currentColor)"
            strokeWidth="0.5"
            opacity="0.32"
          />
        )
      })}

      {/* Actuals polygon outline */}
      <path
        d={actualPolygon}
        fill="none"
        stroke="var(--color-th-text, currentColor)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />

      {/* Tangent-rotated swell labels */}
      {swells.map((s, i) => {
        const pos = labelPos(i)
        return (
          <text
            key={`l-${s.id}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="13"
            fontWeight="500"
            fill="var(--color-th-text, currentColor)"
            fillOpacity="0.85"
            transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
          >
            {s.name}
          </text>
        )
      })}
    </svg>
  )
}
