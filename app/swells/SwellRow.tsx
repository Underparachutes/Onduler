'use client'

import Link from 'next/link'
import { formatPts, formatHrs } from '@/lib/format'
import { ceilDisplay } from '@/lib/periods'

type Motion = { id: string; name: string; default_points: number; default_hours: number; swellIds: string[]; swellWeights: Record<string, number> }
type TrackingMode = 'points' | 'hours'

type Props = {
  swell: { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; groupId: string | null; motions: Motion[] }
  swellPtsThisWeek: number
  swellHrsThisWeek: number
  swellPtsLastWeek: number
  swellHrsLastWeek: number
  trackingMode: TrackingMode
  showValues?: boolean
}

export function SwellRow({
  swell, swellPtsThisWeek, swellHrsThisWeek, swellPtsLastWeek, swellHrsLastWeek,
  trackingMode, showValues = true,
}: Props) {
  const isHours = trackingMode === 'hours'

  const weekValue = isHours ? swellHrsThisWeek : swellPtsThisWeek
  const lastWeekValue = isHours ? swellHrsLastWeek : swellPtsLastWeek
  const target = isHours ? (swell.target_hours !== null ? Number(swell.target_hours) : null) : swell.target_points
  const progress = target ? Math.min((weekValue / target) * 100, 100) : null
  const hitTarget = target !== null && weekValue >= target
  const formatValue = (n: number) => isHours ? formatHrs(ceilDisplay(n, true)) : formatPts(ceilDisplay(n))

  return (
    <div>
      <Link
        href={`/swells/${swell.id}`}
        className="mb-2 flex items-center gap-2 text-left transition-all active:scale-[0.97]"
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: swell.color }}>
          {swell.name}
        </p>
        {showValues && (
          <span className="text-xs text-th-secondary">
            {formatValue(weekValue)}{target !== null && ` / ${formatValue(target)}`}
          </span>
        )}
        {hitTarget && <span className="text-xs text-th-secondary">&#10003;</span>}
      </Link>

      {progress !== null && target !== null && (
        <div className="mb-1">
          <div className="rounded-full bg-th-surface/40" style={{ height: '4px' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: `linear-gradient(to right, color-mix(in oklch, ${swell.color} 35%, var(--th-surface)), ${swell.color})`, backgroundSize: `${100 / (progress / 100)}% 100%` }}
            />
          </div>
        </div>
      )}

      {target !== null && (
        <p className="mb-3 text-xs text-th-secondary">
          Last week: {formatValue(lastWeekValue)}
        </p>
      )}
    </div>
  )
}
