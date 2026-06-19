'use client'

// Frozen radar for the ceremony reveal and journal. No drag, no period
// toggle, no pill. Contemplative snapshot — colored polygon fills clipped
// to the actuals outline, separator lines, tangent-rotated labels.

import {
  axisAngleRad,
  vertexAt,
  shoulderVertex,
  actualPolygonPath,
  chartCeiling,
  scaleConfigFor,
} from '@/lib/radar'
import { useDecrypted } from '@/app/components/useDecrypted'

const SIZE = 360
const CENTER = { x: SIZE / 2, y: SIZE / 2 }
const RADIUS = 130
const LABEL_PAD = 22
const VB_EXTENT = RADIUS + LABEL_PAD + 40
const VB_ORIGIN = CENTER.x - VB_EXTENT
const VB_SIZE = VB_EXTENT * 2

type Swell = { id: string; name: string; color: string; target: number }

export function FrozenRadar({
  swells: rawSwells,
  actuals,
  trackingMode,
}: {
  swells: Swell[]
  actuals: number[]
  trackingMode: 'points' | 'hours'
}) {
  // Self-decrypt the axis-label swell names so this works when rendered directly
  // by a server page (archived chapter detail); a no-op where the parent already
  // decrypted (journal, ceremony). Names are only read in render, never stated.
  const swells = useDecrypted(rawSwells)
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

  function wedgeSlicePath(index: number): string {
    const val = actuals[index]
    if (!isFinite(val) || val <= 0) return ''
    const peak = vertexAt(index, count, val, chartMax, RADIUS, CENTER)
    const sCcw = shoulderVertex(index, count, val, targets, chartMax, RADIUS, CENTER, -1)
    const sCw = shoulderVertex(index, count, val, targets, chartMax, RADIUS, CENTER, 1)
    return [
      `M ${CENTER.x},${CENTER.y}`,
      `L ${sCcw.x},${sCcw.y}`,
      `L ${peak.x},${peak.y}`,
      `L ${sCw.x},${sCw.y}`,
      'Z',
    ].join(' ')
  }

  function separatorEnd(index: number) {
    const next = (index + 1) % count
    const half = Math.PI / count
    const rA = chartMax > 0 ? (Math.max(0, actuals[index]) / chartMax) * RADIUS : 0
    const rB = chartMax > 0 ? (Math.max(0, actuals[next]) / chartMax) * RADIUS : 0
    const r = Math.max(rA, rB)
    const angle = axisAngleRad(index, count) + half
    return { x: CENTER.x + Math.cos(angle) * r, y: CENTER.y + Math.sin(angle) * r }
  }

  return (
    <svg
      viewBox={`${VB_ORIGIN} ${VB_ORIGIN} ${VB_SIZE} ${VB_SIZE}`}
      className="w-full"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {swells.map((s, i) => {
          const actualR = chartMax > 0 ? (Math.min(actuals[i], chartMax) / chartMax) * RADIUS : 0
          return (
            <radialGradient
              key={`grad-${s.id}`}
              id={`fr-slice-grad-${s.id}`}
              cx={CENTER.x}
              cy={CENTER.y}
              r={Math.max(actualR, 1)}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={`color-mix(in oklch, ${s.color} 35%, var(--th-surface))`} />
              <stop offset="100%" stopColor={s.color} />
            </radialGradient>
          )
        })}
      </defs>

      {/* Per-wedge colored fills following the polygon boundary */}
      {swells.map((s, i) => {
        const d = wedgeSlicePath(i)
        if (!d) return null
        return (
          <path
            key={`slice-${s.id}`}
            d={d}
            fill={`url(#fr-slice-grad-${s.id})`}
            fillOpacity={0.85}
          />
        )
      })}

      {/* Separator lines on bisector radials */}
      {swells.map((_, i) => {
        const b = separatorEnd(i)
        return (
          <line
            key={`sep-${i}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-th-text, currentColor)"
            strokeWidth="0.5"
            opacity="0.25"
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
