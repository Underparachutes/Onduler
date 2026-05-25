'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import {
  axisAngleRad,
  vertexAt,
  wedgePath,
  wedgeBoundary,
  actualPolygonPath,
  slicePath,
  blendTargets,
  scaleConfigFor,
  chartCeiling,
  projectOnAxis,
  radialToValue,
  applyRamp,
} from '@/lib/radar'
import {
  ceilDisplay,
  daysInMonth,
  daysInQuarter,
  daysInYear,
  monthlyTargetDisplay,
  quarterlyTargetDisplay,
  yearlyTargetDisplay,
  type DayKey,
} from '@/lib/periods'
import { getBuildPreset, type BuildKey } from '@/lib/builds'
import { updateSwellTarget } from '@/app/actions/swells'

const SIZE = 360
const CENTER = { x: SIZE / 2, y: SIZE / 2 }
const RADIUS = 130
const LABEL_PAD = 22
const HANDLE_R = 6
const HANDLE_R_ACTIVE = 9
const VB_EXTENT = RADIUS + LABEL_PAD + 10
const VB_ORIGIN = CENTER.x - VB_EXTENT
const VB_SIZE = VB_EXTENT * 2

// Build seeding default — keeps lib/builds.ts source-of-truth shape (just names),
// and matches the locked weekly defaults from PROJECT.md / ADR 0004.
const DEFAULT_TARGET = { points: 100, hours: 5 }

// Per-axis target if the build claims that swell by name, else 0.
function buildTargetsFor(
  key: BuildKey | null,
  swells: RadarSwell[],
  isHours: boolean,
): number[] {
  const preset = getBuildPreset(key)
  if (!preset) return swells.map(() => 0)
  const claimed = new Set(preset.seededSwells)
  const defaultValue = isHours ? DEFAULT_TARGET.hours : DEFAULT_TARGET.points
  return swells.map(s => (claimed.has(s.name) ? defaultValue : 0))
}

export type RadarSwell = {
  id: string
  name: string
  color: string
  // Weekly target in the active currency — the source of truth. 0 = no target.
  target: number
}

export type RadarPeriod = 'week' | 'month' | 'quarter' | 'year'

type Props = {
  swells: RadarSwell[]
  // Parallel to `swells`. Actual value earned in the active period, in the
  // active currency. The page already does the period bucketing.
  actuals: number[]
  period: RadarPeriod
  primaryBuild: BuildKey | null
  secondaryBuild: BuildKey | null
  trackingMode: 'points' | 'hours'
  // null = no wave wash. Otherwise 0..1 ramp percentage applied to target
  // visuals (week → wave-week ramp; month → 1 when wave month active).
  waveRamp: number | null
  // Pacific day key for "today" — passed in so SSR/CSR agree on period length.
  todayKey: DayKey
}

type DragState = {
  index: number
  // Current dragged weekly value in the active currency (clamped to
  // hardCeiling). Drag pill copy derives display units from this.
  value: number
  // Original weekly target value, for the ghost dot + leader line.
  origin: number
  // chartMax snapshot at drag start. Pointer-to-value math uses this fixed
  // reference so the dragged value can't feed back into its own scale —
  // without the snapshot, growing the value grew chartMax which grew the
  // value next frame, causing runaway acceleration toward hardCeiling.
  refMax: number
}

export function SwellRadar({
  swells,
  actuals,
  period,
  primaryBuild,
  secondaryBuild,
  trackingMode,
  waveRamp,
  todayKey,
}: Props) {
  const isHours = trackingMode === 'hours'
  const currencyShort = isHours ? 'hrs' : 'pts'
  const baseScale = scaleConfigFor(trackingMode)

  // Local mirror of weekly targets so dragging feels instant and we don't
  // refetch between drag and the next server roundtrip.
  const [targets, setTargets] = useState<number[]>(() => swells.map(s => s.target))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [, startTransition] = useTransition()

  const svgRef = useRef<SVGSVGElement | null>(null)

  const count = swells.length

  // Period scaling — geometry runs in the period's display units, so the
  // scale config bumps too.
  const periodMultiplier = useMemo(() => {
    if (period === 'month') return daysInMonth(todayKey) / 7
    if (period === 'quarter') return daysInQuarter(todayKey) / 7
    if (period === 'year') return daysInYear(todayKey) / 7
    return 1
  }, [period, todayKey])

  const scale = useMemo(
    () => ({
      initialCeiling: baseScale.initialCeiling * periodMultiplier,
      floor: baseScale.floor * periodMultiplier,
      hardCeiling: baseScale.hardCeiling * periodMultiplier,
      overshootHeadroomPct: baseScale.overshootHeadroomPct,
    }),
    [baseScale, periodMultiplier],
  )

  // Convert a stored weekly target to the period's display value (exact
  // float — the polygon needs unrounded geometry; ceil only at the pill).
  const weeklyToDisplayExact = useMemo(() => {
    return (weekly: number): number => {
      if (period === 'month') return (weekly * daysInMonth(todayKey)) / 7
      if (period === 'quarter') return (weekly * daysInQuarter(todayKey)) / 7
      if (period === 'year') return (weekly * daysInYear(todayKey)) / 7
      return weekly
    }
  }, [period, todayKey])

  const displayToWeekly = useMemo(() => {
    return (display: number): number => {
      if (period === 'month') return (display * 7) / daysInMonth(todayKey)
      if (period === 'quarter') return (display * 7) / daysInQuarter(todayKey)
      if (period === 'year') return (display * 7) / daysInYear(todayKey)
      return display
    }
  }, [period, todayKey])

  // Targets in period-display units, with optional wave ramp applied
  // visually. Geometry uses these directly so wedges and slices match.
  const displayTargets = useMemo(() => {
    const exact = targets.map(weeklyToDisplayExact)
    return waveRamp != null ? exact.map(t => applyRamp(t, waveRamp)) : exact
  }, [targets, waveRamp, weeklyToDisplayExact])

  const chartMax = useMemo(
    () => chartCeiling([...displayTargets, ...actuals], scale),
    [displayTargets, actuals, scale],
  )

  const primaryTargets = useMemo(
    () => buildTargetsFor(primaryBuild, swells, isHours),
    [primaryBuild, swells, isHours],
  )
  const secondaryTargets = useMemo(
    () => buildTargetsFor(secondaryBuild, swells, isHours),
    [secondaryBuild, swells, isHours],
  )
  const blendedBuildTargets = useMemo(
    () => blendTargets(primaryTargets, secondaryBuild ? secondaryTargets : null),
    [primaryTargets, secondaryTargets, secondaryBuild],
  )

  const buildLabel = useMemo(() => {
    const p = getBuildPreset(primaryBuild)?.label.replace(/^The /, '').toLowerCase()
    const s = getBuildPreset(secondaryBuild)?.label.replace(/^The /, '').toLowerCase()
    if (p && s) return `${p} + ${s}`
    if (p) return p
    return null
  }, [primaryBuild, secondaryBuild])

  // Less than 3 axes can't form a polygon. Bail with an empty state so the
  // panel still anchors the page above the existing report sections.
  if (count < 3) {
    return (
      <div className="mb-8 rounded-lg border border-th-border bg-th-surface px-4 py-6 text-center">
        <p className="text-sm text-th-muted">
          Add a third swell to see your shape.
        </p>
      </div>
    )
  }

  // Drag handlers — projecting pointer onto the dragged axis so movement is
  // radial-only (perpendicular drift is ignored). On non-weekly views the
  // projected value is in period units; we convert to weekly so the stored
  // target (and the drag pill copy) stays anchored to weekly source-of-truth.
  function pointerToSvg(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  function startDrag(e: React.PointerEvent, index: number) {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    setDrag({ index, value: targets[index], origin: targets[index], refMax: chartMax })
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return
    const local = pointerToSvg(e)
    const px = projectOnAxis(local, drag.index, count, CENTER)
    // Linear pointer-to-value mapping uses the snapshot scale, not the live
    // chartMax — see DragState comment. Headroom of hardCeiling×10 just gives
    // the soft-cap damping math somewhere to land before the final clamp.
    const linearValue = radialToValue(px, drag.refMax, RADIUS, scale.hardCeiling * 10)
    // Soft cap: past 2× snapshot scale, each pixel contributes ~35% as much
    // value. Lets users push targets above the rest of the chart without
    // rocketing to hardCeiling on a small flick past the chart edge.
    const softCap = drag.refMax * 2
    const dampedValue = linearValue <= softCap
      ? linearValue
      : softCap + (linearValue - softCap) * 0.35
    const displayValue = Math.min(dampedValue, scale.hardCeiling)
    const nextWeekly = displayToWeekly(displayValue)
    setDrag({ ...drag, value: nextWeekly })
    setTargets(prev => {
      const out = prev.slice()
      out[drag.index] = nextWeekly
      return out
    })
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag) return
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    const swell = swells[drag.index]
    const committed = isHours
      ? Math.round(drag.value * 4) / 4
      : Math.round(drag.value)
    setDrag(null)
    setTargets(prev => {
      const out = prev.slice()
      out[drag.index] = committed
      return out
    })
    startTransition(() => {
      void updateSwellTarget(swell.id, trackingMode, committed)
    })
  }

  // Drag pill — weekly source-of-truth on every period; monthly view shows
  // both values so users see the relationship while dragging (ADR 0005 §5).
  // Hours mode keeps 0.1 precision per the ceil-rule exception.
  const formatPill = (weekly: number) => {
    const weeklyDisplay = ceilDisplay(weekly, isHours)
    if (period === 'month') {
      const monthlyDisplay = monthlyTargetDisplay(weekly, todayKey, isHours)
      return `${monthlyDisplay} ${currencyShort}/mo · ${weeklyDisplay} ${currencyShort}/wk`
    }
    if (period === 'quarter') {
      const qtrDisplay = quarterlyTargetDisplay(weekly, todayKey, isHours)
      return `${qtrDisplay} ${currencyShort}/qtr · ${weeklyDisplay} ${currencyShort}/wk`
    }
    if (period === 'year') {
      const yrDisplay = yearlyTargetDisplay(weekly, todayKey, isHours)
      return `${yrDisplay} ${currencyShort}/yr · ${weeklyDisplay} ${currencyShort}/wk`
    }
    return `${weeklyDisplay} ${currencyShort}/wk`
  }

  // Subtitle + wave-pill copy are period-aware.
  const subtitleCopy =
    period === 'month' ? 'Your swells this month'
    : period === 'quarter' ? 'Your swells this quarter'
    : period === 'year' ? 'Your swells this year'
    : 'Your swells this week'
  const waveLabel =
    waveRamp == null ? null
    : waveRamp < 1 ? `Ramp · ${Math.round(waveRamp * 100)}%`
    : period === 'month' ? 'Wave month'
    : 'Wave week'

  // Axis label positioning — push out from the chart edge, anchor by quadrant.
  function labelPos(index: number) {
    const angle = axisAngleRad(index, count)
    const r = RADIUS + LABEL_PAD
    const x = CENTER.x + Math.cos(angle) * r
    const y = CENTER.y + Math.sin(angle) * r
    let anchor: 'start' | 'middle' | 'end' = 'middle'
    if (Math.cos(angle) > 0.2) anchor = 'start'
    else if (Math.cos(angle) < -0.2) anchor = 'end'
    return { x, y, anchor }
  }

  const actualPolygon = actualPolygonPath(actuals, displayTargets, chartMax, RADIUS, CENTER)
  const draggedLabel = drag != null ? swells[drag.index].name : null

  // Reset preview rows — only the build-claimed axes where the seeded value
  // differs from the user's current target.
  const resetRows = swells.map((s, i) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    from: targets[i],
    to: blendedBuildTargets[i],
  })).filter(r => r.to > 0 && Math.abs(r.from - r.to) > 0.01)

  return (
    <div className="relative mb-8">
      {/* Wave wash — week or month, gated by period at the page */}
      {waveRamp != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ backgroundColor: '#378ADD', opacity: 0.08 }}
        />
      )}

      <div className="relative mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">
            {subtitleCopy}
          </p>
          {buildLabel && (
            <span className="rounded-full bg-th-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-th-faint">
              {buildLabel}
            </span>
          )}
        </div>
        {waveLabel && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(55, 138, 221, 0.12)', color: '#185FA5' }}
          >
            {waveLabel}
          </span>
        )}
      </div>

      {/* Wavy underline subtitle decoration on wave periods */}
      {waveRamp != null && (
        <svg
          aria-hidden
          className="relative mb-3 block w-full"
          viewBox="0 0 100 4"
          preserveAspectRatio="none"
          style={{ height: 4 }}
        >
          <path
            d="M 0 2 Q 6.25 0, 12.5 2 T 25 2 T 37.5 2 T 50 2 T 62.5 2 T 75 2 T 87.5 2 T 100 2"
            fill="none"
            stroke="#378ADD"
            strokeWidth="1"
            strokeOpacity="0.55"
          />
        </svg>
      )}

      <div className="relative flex justify-center">
        <svg
          ref={svgRef}
          viewBox={`${VB_ORIGIN} ${VB_ORIGIN} ${VB_SIZE} ${VB_SIZE}`}
          className="w-full"
          role="img"
          aria-label="Weekly shape radar"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: drag ? 'none' : 'auto', overflow: 'visible' }}
        >
          <defs>
            <filter id="frost" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
            <clipPath id="wake-cutout">
              <path d={`M ${VB_ORIGIN} ${VB_ORIGIN} h ${VB_SIZE} v ${VB_SIZE} h -${VB_SIZE} Z ${actualPolygon}`} clipRule="evenodd" />
            </clipPath>
            {swells.map((s, i) => {
              const targetR = chartMax > 0 ? (displayTargets[i] / chartMax) * RADIUS : 0
              return (
                <radialGradient
                  key={`grad-${s.id}`}
                  id={`slice-grad-${s.id}`}
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

          {/* Wedge fills (target ring tiling) — frosted glass effect */}
          {swells.map((s, i) => (
            <g key={`wedge-${s.id}`}>
              <path
                d={wedgePath(i, displayTargets, chartMax, RADIUS, CENTER)}
                fill={s.color}
                fillOpacity={0.25}
                filter="url(#frost)"
              />
              <path
                d={wedgePath(i, displayTargets, chartMax, RADIUS, CENTER)}
                fill="var(--th-frost-overlay)"
                fillOpacity={0.35}
                clipPath="url(#wake-cutout)"
              />
            </g>
          ))}

          {/* Filled slices per swell — ombre from complement at center to swell color at edge */}
          {swells.map((s, i) => {
            const d = slicePath(i, actuals, displayTargets, chartMax, RADIUS, CENTER)
            if (!d) return null
            return (
              <path
                key={`slice-${s.id}`}
                d={d}
                fill={`url(#slice-grad-${s.id})`}
                fillOpacity={0.95}
              />
            )
          })}

          {/* Separator lines along the bisector radials — N boundaries
              between adjacent wedges, each ending at the chord intersection. */}
          {swells.map((_, i) => {
            const b = wedgeBoundary(i, displayTargets, chartMax, RADIUS, CENTER)
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

          {/* Actuals polygon outline — 3N-vertex shoulder polygon, stroke over slices */}
          <path
            d={actualPolygon}
            fill="none"
            stroke="var(--color-th-text, currentColor)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeOpacity="0.85"
          />

          {/* Ghost dot + leader line at original position while dragging */}
          {drag && drag.value !== drag.origin && (() => {
            const ghost = vertexAt(drag.index, count, drag.origin, chartMax, RADIUS, CENTER)
            const current = vertexAt(drag.index, count, drag.value, chartMax, RADIUS, CENTER)
            return (
              <g aria-hidden>
                <line
                  x1={ghost.x}
                  y1={ghost.y}
                  x2={current.x}
                  y2={current.y}
                  stroke="var(--color-th-text, currentColor)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.45"
                />
                <circle
                  cx={ghost.x}
                  cy={ghost.y}
                  r="4"
                  fill="none"
                  stroke="var(--color-th-text, currentColor)"
                  strokeOpacity="0.5"
                />
              </g>
            )
          })()}

          {/* Axis labels */}
          {swells.map((s, i) => {
            const pos = labelPos(i)
            return (
              <text
                key={`label-${s.id}`}
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor}
                dominantBaseline="central"
                fontSize="13"
                fontWeight="500"
                fill="var(--color-th-text, currentColor)"
                fillOpacity="0.85"
              >
                {s.name}
              </text>
            )
          })}

          {swells.map((s, i) => {
            const v = vertexAt(i, count, displayTargets[i], chartMax, RADIUS, CENTER)
            const active = drag?.index === i
            return (
              <circle
                key={`handle-${i}`}
                cx={v.x}
                cy={v.y}
                r={active ? HANDLE_R_ACTIVE : HANDLE_R}
                fill={active ? '#185FA5' : 'var(--color-th-bg, white)'}
                stroke="#185FA5"
                strokeWidth="1.5"
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={(e) => startDrag(e, i)}
              />
            )
          })}
        </svg>

        {/* Live drag pill, bottom-left of the chart panel */}
        {drag && draggedLabel && (
          <div
            className="pointer-events-none absolute bottom-1 left-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
            style={{ backgroundColor: '#185FA5' }}
          >
            {draggedLabel} · {formatPill(drag.value)}
          </div>
        )}
      </div>

      {/* Reset-to-build chip, bottom-right */}
      {buildLabel && resetRows.length > 0 && (
        <div className="relative mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="rounded-full border border-th-border bg-th-bg px-3 py-1 text-[11px] font-medium text-th-muted transition-all hover:bg-th-surface active:scale-[0.97]"
          >
            ↻ Reset to the {buildLabel}
          </button>
        </div>
      )}

      {resetOpen && (
        <ResetDialog
          buildLabel={buildLabel ?? ''}
          rows={resetRows}
          currency={currencyShort}
          isHours={isHours}
          period={period}
          todayKey={todayKey}
          onCancel={() => setResetOpen(false)}
          onConfirm={(opted) => {
            setResetOpen(false)
            setTargets(prev => {
              const out = prev.slice()
              swells.forEach((s, i) => {
                if (opted.has(s.id)) out[i] = blendedBuildTargets[i]
              })
              return out
            })
            startTransition(() => {
              swells.forEach((s, i) => {
                if (!opted.has(s.id)) return
                void updateSwellTarget(s.id, trackingMode, blendedBuildTargets[i])
              })
            })
          }}
        />
      )}
    </div>
  )
}

type ResetRow = { id: string; name: string; color: string; from: number; to: number }

function ResetDialog({
  buildLabel,
  rows,
  currency,
  isHours,
  period,
  todayKey,
  onCancel,
  onConfirm,
}: {
  buildLabel: string
  rows: ResetRow[]
  currency: string
  isHours: boolean
  period: RadarPeriod
  todayKey: DayKey
  onCancel: () => void
  onConfirm: (opted: Set<string>) => void
}) {
  const [opted, setOpted] = useState<Set<string>>(() => new Set(rows.map(r => r.id)))

  // Weekly stays the source of truth — even when we display monthly numbers
  // (ADR 0005 §4: monthly diff with weekly in parens).
  function fmtPair(weekly: number): { primary: string; secondary: string | null } {
    const weeklyDisplay = ceilDisplay(weekly, isHours)
    if (period === 'month') {
      const monthlyDisplay = monthlyTargetDisplay(weekly, todayKey, isHours)
      return { primary: `${monthlyDisplay} ${currency}/mo`, secondary: `(${weeklyDisplay} ${currency}/wk)` }
    }
    if (period === 'quarter') {
      const qtrDisplay = quarterlyTargetDisplay(weekly, todayKey, isHours)
      return { primary: `${qtrDisplay} ${currency}/qtr`, secondary: `(${weeklyDisplay} ${currency}/wk)` }
    }
    if (period === 'year') {
      const yrDisplay = yearlyTargetDisplay(weekly, todayKey, isHours)
      return { primary: `${yrDisplay} ${currency}/yr`, secondary: `(${weeklyDisplay} ${currency}/wk)` }
    }
    return { primary: `${weeklyDisplay} ${currency}/wk`, secondary: null }
  }

  function toggle(id: string) {
    setOpted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 pt-12 sm:items-center">
      <div className="w-full max-w-[22rem] rounded-lg border border-th-border bg-th-bg p-4 shadow-lg">
        <p className="mb-1 text-sm font-semibold text-th-text">
          Reset to the {buildLabel}
        </p>
        <p className="mb-3 text-xs text-th-muted">
          Picks the build&apos;s weekly targets. Uncheck any you want to keep as-is. Logs and motions are untouched.
        </p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {rows.map(r => {
            const on = opted.has(r.id)
            return (
              <li key={r.id}>
                <label className="flex items-center gap-3 rounded-md px-1 py-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4"
                  />
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="flex-1 truncate text-th-text">{r.name}</span>
                  <span className="shrink-0 text-th-faint">
                    {fmtPair(r.from).primary} → {fmtPair(r.to).primary}
                    {fmtPair(r.to).secondary && (
                      <span className="ml-1 opacity-70">{fmtPair(r.to).secondary}</span>
                    )}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-th-border px-3 py-1.5 text-xs text-th-muted transition-all hover:bg-th-surface active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(opted)}
            disabled={opted.size === 0}
            className="rounded-md bg-th-text px-3 py-1.5 text-xs font-medium text-th-bg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export type { BuildKey }
