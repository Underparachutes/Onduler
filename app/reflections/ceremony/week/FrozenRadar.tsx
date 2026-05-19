// Frozen weekly radar for the ceremony reveal. No drag, no period toggle,
// no pill. Renders the same wedge/slice geometry as the live radar so the
// visual is recognizable, but it's pure SSR — a contemplative snapshot.

import {
  wedgePath,
  slicePath,
  actualPolygonPath,
  chartCeiling,
  scaleConfigFor,
} from '@/lib/radar'

const SIZE = 280
const CENTER = { x: SIZE / 2, y: SIZE / 2 }
const RADIUS = 100

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

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="text-th-faint">
      {/* Wedges — background, low opacity. */}
      {swells.map((s, i) => (
        <path
          key={`w-${s.id}`}
          d={wedgePath(i, targets, chartMax, RADIUS, CENTER)}
          fill={s.color}
          fillOpacity={0.34}
        />
      ))}

      {/* Per-axis filled slices — actual values. */}
      {swells.map((s, i) => (
        <path
          key={`s-${s.id}`}
          d={slicePath(i, actuals, chartMax, RADIUS, CENTER)}
          fill={s.color}
          fillOpacity={0.65}
        />
      ))}

      {/* Shoulder-rule perimeter stroke. */}
      <path
        d={actualPolygonPath(actuals, chartMax, RADIUS, CENTER)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
        opacity={0.55}
      />

      {/* Swell name labels around the outside, one per axis. */}
      {swells.map((s, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
        const r = RADIUS + 14
        const x = CENTER.x + Math.cos(angle) * r
        const y = CENTER.y + Math.sin(angle) * r
        return (
          <text
            key={`l-${s.id}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-th-secondary"
            style={{ fontSize: '10px' }}
          >
            {s.name}
          </text>
        )
      })}
    </svg>
  )
}
