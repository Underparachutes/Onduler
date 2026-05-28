'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  wedgePath,
  wedgeBoundary,
  actualPolygonPath,
  slicePath,
  scaleConfigFor,
  chartCeiling,
} from '@/lib/radar'

const SIZE = 140
const CENTER = { x: SIZE / 2, y: SIZE / 2 }
const RADIUS = 56

type ShapeSwell = {
  id: string
  name: string
  color: string
  target: number
}

type Props = {
  swells: ShapeSwell[]
  actuals: number[]
  trackingMode: 'points' | 'hours'
  isInWave: boolean
  frosted?: boolean
}

export function DashboardShape({ swells, actuals: initialActuals, trackingMode, isInWave, frosted }: Props) {
  const router = useRouter()
  const [actuals, setActuals] = useState(initialActuals)
  const count = swells.length

  useEffect(() => {
    setActuals(initialActuals)
  }, [initialActuals])

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as {
        swell_ids: string[]
        weights: Record<string, number>
        points: number
        hours: number
      } | undefined
      if (!detail) return
      const base = trackingMode === 'hours' ? detail.hours : detail.points
      setActuals(prev => prev.map((v, i) => {
        const sid = swells[i]?.id
        const w = detail.weights[sid]
        if (w == null) return v
        return v + base * w
      }))
    }
    window.addEventListener('onduler:log-committed', handler)
    return () => window.removeEventListener('onduler:log-committed', handler)
  }, [swells, trackingMode])

  const targets = useMemo(() => swells.map(s => s.target), [swells])
  const scale = scaleConfigFor(trackingMode)
  const max = useMemo(() => chartCeiling([...targets, ...actuals], scale), [targets, actuals, scale])

  if (isInWave) return null
  if (count < 3) return null

  const hasLogs = actuals.some(v => v > 0)

  return (
    <div
      className={`pointer-events-none sticky bottom-[calc(2.75rem+env(safe-area-inset-bottom,0px))] z-10 flex flex-col items-center pb-1 md:bottom-0 ${frosted ? '-mx-4 px-4 backdrop-blur-md' : ''}`}
      style={frosted ? { background: 'color-mix(in oklch, color-mix(in oklch, rgb(144, 216, 196) 60%, var(--th-bg)) 20%, transparent)' } : undefined}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label="Your shape this week"
        className="pointer-events-auto cursor-pointer"
        onClick={() => router.push('/anchors')}
      >
        {hasLogs ? (
          <>
            <defs>
              <filter id="ds-frost" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
              {swells.map((s, i) => {
                const targetR = max > 0 ? (targets[i] / max) * RADIUS : 0
                return (
                  <radialGradient
                    key={`ds-grad-${s.id}`}
                    id={`ds-grad-${s.id}`}
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

            {swells.map((s, i) => (
              <path
                key={`w-${s.id}`}
                d={wedgePath(i, targets, max, RADIUS, CENTER)}
                fill={s.color}
                fillOpacity={0.2}
                filter="url(#ds-frost)"
              />
            ))}

            {swells.map((s, i) => {
              const d = slicePath(i, actuals, targets, max, RADIUS, CENTER)
              if (!d) return null
              return (
                <path
                  key={`s-${s.id}`}
                  d={d}
                  fill={`url(#ds-grad-${s.id})`}
                  fillOpacity={0.9}
                  style={{ transition: 'd 250ms ease' }}
                />
              )
            })}

            {swells.map((_, i) => {
              const b = wedgeBoundary(i, targets, max, RADIUS, CENTER)
              return (
                <line
                  key={`sep-${i}`}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--color-th-text, currentColor)"
                  strokeWidth="0.4"
                  opacity="0.25"
                />
              )
            })}

            <path
              d={actualPolygonPath(actuals, targets, max, RADIUS, CENTER)}
              fill="none"
              stroke="var(--color-th-text, currentColor)"
              strokeWidth="1"
              strokeLinejoin="round"
              strokeOpacity="0.7"
              style={{ transition: 'd 250ms ease' }}
            />
          </>
        ) : (
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={20}
            fill="none"
            stroke="var(--color-th-text, currentColor)"
            strokeWidth="1"
            strokeOpacity="0.25"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  )
}
