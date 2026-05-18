'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPts, formatHrs } from '@/lib/format'

type Swell = {
  id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
}

type Bucket = { count: number; pts: number; hrs: number }
type MotionStat = {
  id: string
  name: string
  weight: number
  default_points: number
  default_hours: number
  week: Bucket
  month: Bucket
  lifetime: Bucket
}

type TimeView = 'week' | 'month' | 'lifetime'

type Props = {
  swell: Swell
  weekPts: number
  weekHrs: number
  lifetimePts: number
  lifetimeHrs: number
  weeksActive: number
  motions: MotionStat[]
  trackingMode: 'points' | 'hours'
}

const TIME_OPTIONS: { value: TimeView; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'lifetime', label: 'Lifetime' },
]

export function SwellProficiencyView({
  swell,
  weekPts,
  weekHrs,
  lifetimePts,
  lifetimeHrs,
  weeksActive,
  motions,
  trackingMode,
}: Props) {
  const [timeView, setTimeView] = useState<TimeView>('week')

  const isHours = trackingMode === 'hours'
  const weekValue = isHours ? weekHrs : weekPts
  const lifetimeValue = isHours ? lifetimeHrs : lifetimePts
  const target = isHours ? swell.target_hours : swell.target_points
  const progress = target ? Math.min((weekValue / target) * 100, 100) : null
  const hitTarget = target !== null && weekValue >= target
  const formatValue = (n: number) => isHours ? formatHrs(Math.round(n * 10) / 10) : formatPts(Math.round(n))

  const weeksLabel = weeksActive === 1 ? '1 week running' : `${weeksActive} weeks running`

  const sortedMotions = [...motions].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.name.localeCompare(b.name)
  })

  function bucketOf(m: MotionStat): Bucket {
    return m[timeView]
  }

  const motionCountLabel = motions.length === 1 ? '1 motion' : `${motions.length} motions`

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

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">
              Motions feeding this swell
            </p>
            <div className="flex shrink-0 gap-1">
              {TIME_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTimeView(value)}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    timeView === value
                      ? 'border-th-text bg-th-text text-th-btn-text'
                      : 'border-th-border text-th-muted hover:bg-th-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {motions.length === 0 ? (
            <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
              No motions assigned yet.
            </p>
          ) : (
            <>
              <ul className="flex flex-col">
                {sortedMotions.map(m => {
                  const b = bucketOf(m)
                  const value = isHours ? b.hrs : b.pts
                  const showWeight = m.weight < 1
                  const countLabel = b.count === 1 ? '1 log' : `${b.count} logs`
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 px-1 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-th-text">{m.name}</p>
                        <p className="text-[11px] text-th-faint">
                          {countLabel}
                          {showWeight && (
                            <>
                              <span className="mx-1.5 text-th-faint">·</span>
                              <span>{Math.round(m.weight * 100)}%</span>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-th-text tabular-nums">
                        {value > 0 ? formatValue(value) : <span className="text-th-faint">—</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 px-1 text-[10px] uppercase tracking-widest text-th-faint">
                {motionCountLabel} · sorted by contribution
              </p>
            </>
          )}
        </section>

        {/* Milestones placeholder — chunk 5 will land the create/edit UI here */}
        <section className="mt-8">
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
