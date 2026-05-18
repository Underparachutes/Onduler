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
type ViewMode = 'constellation' | 'list'

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

const CONSTELLATION_CAP = 8

function activityOpacity(m: MotionStat): number {
  if (m.week.count > 0) return 1
  if (m.month.count > 0) return 0.55
  if (m.lifetime.count > 0) return 0.32
  return 0.22
}

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
  const [viewMode, setViewMode] = useState<ViewMode>('constellation')

  const isHours = trackingMode === 'hours'
  const weekValue = isHours ? weekHrs : weekPts
  const lifetimeValue = isHours ? lifetimeHrs : lifetimePts
  const target = isHours ? swell.target_hours : swell.target_points
  const progress = target ? Math.min((weekValue / target) * 100, 100) : null
  const hitTarget = target !== null && weekValue >= target
  const formatValue = (n: number) => isHours ? formatHrs(Math.round(n * 10) / 10) : formatPts(Math.round(n))

  const weeksLabel = weeksActive === 1 ? '1 week running' : `${weeksActive} weeks running`

  const sortedByContribution = [...motions].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.name.localeCompare(b.name)
  })

  // For the constellation, select top-N by recent activity (then weight, then name),
  // so a quiet motion doesn't crowd out one the user is actively feeding.
  const sortedByActivity = [...motions].sort((a, b) => {
    if (b.week.count !== a.week.count) return b.week.count - a.week.count
    if (b.month.count !== a.month.count) return b.month.count - a.month.count
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.name.localeCompare(b.name)
  })
  const constellationMotions = sortedByActivity.slice(0, CONSTELLATION_CAP)
  const overflowCount = Math.max(0, motions.length - constellationMotions.length)

  function bucketOf(m: MotionStat): Bucket {
    return m[timeView]
  }

  const motionCountLabel = motions.length === 1 ? '1 motion' : `${motions.length} motions`

  // SVG geometry
  const size = 280
  const center = size / 2
  const orbitRadius = 100
  const centerNodeRadius = 36

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
            {motions.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'constellation' ? 'list' : 'constellation')}
                className="shrink-0 rounded-md border border-th-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-th-muted transition-colors hover:bg-th-surface"
                aria-label={viewMode === 'constellation' ? 'Switch to list view' : 'Switch to constellation view'}
              >
                {viewMode === 'constellation' ? 'List' : 'Stars'}
              </button>
            )}
          </div>

          {motions.length > 0 && (
            <div className="mb-3 flex gap-1">
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
          )}

          {motions.length === 0 ? (
            <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
              No motions assigned yet.
            </p>
          ) : viewMode === 'constellation' ? (
            <div className="flex flex-col items-center">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full max-w-[280px]"
                role="img"
                aria-label={`${swell.name} constellation`}
              >
                {/* Connector lines: drawn first so nodes sit on top */}
                {constellationMotions.map((m, i) => {
                  const angle = (2 * Math.PI * i) / constellationMotions.length - Math.PI / 2
                  const x = center + orbitRadius * Math.cos(angle)
                  const y = center + orbitRadius * Math.sin(angle)
                  const op = activityOpacity(m)
                  const sw = 1 + m.weight * 2
                  return (
                    <line
                      key={`line-${m.id}`}
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke={swell.color}
                      strokeWidth={sw}
                      strokeOpacity={op * 0.45}
                      strokeLinecap="round"
                    />
                  )
                })}

                {/* Center node: weekly progress lives here */}
                <circle
                  cx={center}
                  cy={center}
                  r={centerNodeRadius}
                  fill={swell.color}
                />
                <text
                  x={center}
                  y={center}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize="13"
                  fontWeight="600"
                >
                  {target !== null
                    ? `${Math.round(weekValue)}/${Math.round(target)}`
                    : `${Math.round(weekValue)}`}
                </text>

                {/* Motion nodes */}
                {constellationMotions.map((m, i) => {
                  const angle = (2 * Math.PI * i) / constellationMotions.length - Math.PI / 2
                  const x = center + orbitRadius * Math.cos(angle)
                  const y = center + orbitRadius * Math.sin(angle)
                  const radius = 14 + m.weight * 10
                  const op = activityOpacity(m)
                  const b = bucketOf(m)
                  return (
                    <g key={`node-${m.id}`}>
                      <title>{`${m.name} — ${b.count === 1 ? '1 log' : `${b.count} logs`}`}</title>
                      <circle
                        cx={x}
                        cy={y}
                        r={radius}
                        fill="var(--color-th-bg)"
                        stroke={swell.color}
                        strokeWidth={1 + m.weight * 2}
                        strokeOpacity={op}
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="var(--color-th-text)"
                        fontSize="11"
                        fontWeight="600"
                        opacity={op}
                      >
                        {b.count > 0 ? b.count : ''}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {overflowCount > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="mt-2 text-xs text-th-muted transition-colors hover:text-th-text active:scale-[0.97]"
                >
                  + {overflowCount} more
                </button>
              )}

              <p className="mt-2 text-[10px] uppercase tracking-widest text-th-faint">
                {motionCountLabel}
              </p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col">
                {sortedByContribution.map(m => {
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
