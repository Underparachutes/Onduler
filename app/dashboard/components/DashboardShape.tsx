'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { axisAngleRad } from '@/lib/radar'
import { wakePolygonPath, circlePath } from '@/lib/wakes'

const SIZE = 180
const RADIUS = 70
const CENTER = { x: SIZE / 2, y: SIZE / 2 }

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
}

export function DashboardShape({ swells, actuals: initialActuals, trackingMode, isInWave }: Props) {
  const router = useRouter()
  const [actuals, setActuals] = useState(initialActuals)
  const count = swells.length

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync prop → local state for optimistic morph
  useEffect(() => { setActuals(initialActuals) }, [initialActuals])

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

  if (isInWave) return null
  if (count < 3) return null

  const hasData = actuals.some(v => v > 0)
  const max = actuals.reduce((m, v) => (v > m ? v : m), 0)

  let path: string
  if (!hasData) {
    path = circlePath(RADIUS * 0.6, CENTER)
  } else {
    path = wakePolygonPath(actuals, RADIUS, CENTER)
  }

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(2.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-10 flex flex-col items-center pb-1 md:bottom-0"
    >
      <div
        className="pointer-events-auto relative cursor-pointer"
        style={{ width: SIZE, height: SIZE }}
        onClick={() => router.push('/anchors')}
      >
        {hasData ? (
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            style={{ animation: 'slow-breathe 4s ease-in-out infinite', transformOrigin: 'center' }}
          >
            <defs>
              <clipPath id="ds-color-clip">
                <path d={path} />
              </clipPath>
              <filter id="ds-blend" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="14" />
              </filter>
            </defs>

            <g clipPath="url(#ds-color-clip)">
              <g filter="url(#ds-blend)">
                {swells.map((s, i) => {
                  const val = actuals[i]
                  if (val <= 0) return null
                  const frac = max > 0 ? val / max : 0
                  const angle = axisAngleRad(i, count)
                  const dist = RADIUS * 0.45
                  return (
                    <circle
                      key={s.id}
                      cx={CENTER.x + Math.cos(angle) * dist}
                      cy={CENTER.y + Math.sin(angle) * dist}
                      r={RADIUS * (0.55 + frac * 0.3)}
                      fill={s.color}
                      fillOpacity={0.5 + frac * 0.3}
                    />
                  )
                })}
              </g>
            </g>

            <path
              d={path}
              fill="none"
              stroke="var(--color-th-text, currentColor)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeOpacity="0.5"
            />
          </svg>
        ) : (
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            style={{ animation: 'slow-breathe 4s ease-in-out infinite', transformOrigin: 'center' }}
          >
            <path
              d={path}
              fill="none"
              stroke="var(--color-th-text, currentColor)"
              strokeWidth="1"
              opacity="0.25"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
