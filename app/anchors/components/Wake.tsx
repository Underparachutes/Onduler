import { wakePolygonPath, circlePath, interpolatedWakePath } from '@/lib/wakes'

const SIZE = 180
const RADIUS = 70

type Props = {
  actuals: number[]
  mini?: boolean
}

export function Wake({ actuals, mini }: Props) {
  const n = actuals.length
  const hasData = n > 0 && actuals.some(v => v > 0)
  const activeCount = actuals.filter(v => v > 0).length

  const size = mini ? 120 : SIZE
  const r = mini ? 38 : RADIUS
  const cx = size / 2
  const cy = size / 2
  const c = { x: cx, y: cy }

  let path: string
  if (!hasData) {
    path = circlePath(r * 0.6, c)
  } else if (activeCount < n) {
    const t = activeCount / n
    path = interpolatedWakePath(actuals, r, t, c)
  } else {
    path = wakePolygonPath(actuals, r, c)
  }

  if (mini) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <path
          d={path}
          fill="none"
          stroke="var(--th-text)"
          strokeWidth="0.8"
          opacity="0.35"
          style={{ animation: 'slow-breathe 4s ease-in-out infinite', transformOrigin: 'center' }}
        />
      </svg>
    )
  }

  return (
    <div className="relative h-[180px] w-[180px]" style={{ zIndex: 1 }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ filter: 'blur(7px)', opacity: 0.7 }}
      >
        <path
          d={path}
          fill="var(--th-accent)"
          fillOpacity="0.22"
          stroke="var(--th-accent)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
      </svg>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ animation: 'slow-breathe 4s ease-in-out infinite', transformOrigin: 'center' }}
      >
        <path
          d={path}
          fill="none"
          stroke="var(--th-text)"
          strokeWidth="0.6"
          opacity="0.55"
        />
      </svg>
    </div>
  )
}
