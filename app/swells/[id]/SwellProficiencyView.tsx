'use client'

import Link from 'next/link'
import { formatPts, formatHrs } from '@/lib/format'

type Swell = {
  id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
}

type Props = {
  swell: Swell
  weekPts: number
  weekHrs: number
  lifetimePts: number
  lifetimeHrs: number
  weeksActive: number
  motionCount: number
  trackingMode: 'points' | 'hours'
}

export function SwellProficiencyView({
  swell,
  weekPts,
  weekHrs,
  lifetimePts,
  lifetimeHrs,
  weeksActive,
  motionCount,
  trackingMode,
}: Props) {
  const isHours = trackingMode === 'hours'
  const weekValue = isHours ? weekHrs : weekPts
  const lifetimeValue = isHours ? lifetimeHrs : lifetimePts
  const target = isHours ? swell.target_hours : swell.target_points
  const progress = target ? Math.min((weekValue / target) * 100, 100) : null
  const hitTarget = target !== null && weekValue >= target
  const formatValue = (n: number) => isHours ? formatHrs(Math.round(n * 10) / 10) : formatPts(Math.round(n))

  const weeksLabel = weeksActive === 1 ? '1 week running' : `${weeksActive} weeks running`

  return (
    <div className="flex min-h-full flex-col items-center px-4 pb-12">
      <div className="w-full max-w-[22rem]">
        <div className="sticky top-0 z-10 bg-th-bg pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/swells"
              className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
            >
              ← Swells
            </Link>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: swell.color }}
            />
            <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-th-text">
              {swell.name}
            </h1>
          </div>

          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-th-muted">This week</p>
            <p className="shrink-0 text-sm font-medium text-th-text">
              {formatValue(weekValue)}
              {target !== null && (
                <span className="text-th-faint"> / {formatValue(target)}</span>
              )}
              {hitTarget && <span className="ml-1 text-th-faint">&#10003;</span>}
            </p>
          </div>

          {progress !== null && target !== null && (
            <div className="mb-2 rounded-full bg-th-surface" style={{ height: '5px' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: swell.color }}
              />
            </div>
          )}

          {lifetimeValue > 0 && (
            <p className="text-xs text-th-faint">
              {formatValue(lifetimeValue)} · {weeksLabel}
            </p>
          )}
        </div>

        {/* Motions placeholder — chunk 2 will render the list / constellation here */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">
            Motions feeding this swell
          </p>
          {motionCount === 0 ? (
            <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
              No motions assigned yet.
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-th-border px-4 py-3 text-xs text-th-faint">
              {motionCount === 1 ? '1 motion' : `${motionCount} motions`} — list and constellation coming soon.
            </p>
          )}
        </section>

        {/* Milestones placeholder — chunk 5 will land the create/edit UI here */}
        <section className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-th-muted">
            Milestones
          </p>
          <p className="rounded-lg border border-dashed border-th-border px-4 py-3 text-xs text-th-faint">
            Coming soon.
          </p>
        </section>
      </div>
    </div>
  )
}
