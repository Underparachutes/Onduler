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
import { getBuildPreset, type BuildKey } from '@/lib/builds'
import { updateSwellTarget } from '@/app/actions/swells'

const SIZE = 320
const CENTER = { x: SIZE / 2, y: SIZE / 2 }
const RADIUS = 108
const HANDLE_R = 5
const HANDLE_R_ACTIVE = 8

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
  // Target in the active currency. 0 means no target set.
  target: number
}

type Props = {
  swells: RadarSwell[]
  // Parallel to `swells`. Actual value earned this week in the active currency.
  actuals: number[]
  primaryBuild: BuildKey | null
  secondaryBuild: BuildKey | null
  trackingMode: 'points' | 'hours'
  // null = not a wave week. Otherwise 0..1 ramp percentage applied to target visuals.
  waveWeekRamp: number | null
}

type DragState = {
  index: number
  // Current dragged value in the active currency (clamped to hardCeiling).
  value: number
  // Original target value, for the ghost dot + leader line.
  origin: number
}

export function SwellRadar({
  swells,
  actuals,
  primaryBuild,
  secondaryBuild,
  trackingMode,
  waveWeekRamp,
}: Props) {
  const isHours = trackingMode === 'hours'
  const currencyShort = isHours ? 'hrs' : 'pts'
  const scale = scaleConfigFor(trackingMode)

  // Local mirror of targets so dragging feels instant and we don't refetch
  // between drag and the next server roundtrip.
  const [targets, setTargets] = useState<number[]>(() => swells.map(s => s.target))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [, startTransition] = useTransition()

  const svgRef = useRef<SVGSVGElement | null>(null)

  const count = swells.length

  // Apply the wave-week ramp to the *visual* target ring. The underlying
  // target value (what drag edits and what gets saved) is unchanged.
  const displayTargets = useMemo(
    () => (waveWeekRamp != null ? targets.map(t => applyRamp(t, waveWeekRamp)) : targets),
    [targets, waveWeekRamp],
  )

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
  // radial-only (perpendicular drift is ignored).
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
    setDrag({ index, value: targets[index], origin: targets[index] })
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return
    const local = pointerToSvg(e)
    const px = projectOnAxis(local, drag.index, count, CENTER)
    const next = radialToValue(px, chartMax, RADIUS, scale.hardCeiling)
    setDrag({ ...drag, value: next })
    setTargets(prev => {
      const out = prev.slice()
      out[drag.index] = next
      return out
    })
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag) return
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
    const swell = swells[drag.index]
    const committed = isHours
      ? Math.round(drag.value * 10) / 10
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

  // Drag pill copy formatter — short variant, "100 pts/wk".
  const formatPill = (n: number) => {
    const rounded = isHours ? Math.round(n * 10) / 10 : Math.round(n)
    return `${rounded} ${currencyShort}/wk`
  }

  // Axis label positioning — push out from the chart edge, anchor by quadrant.
  function labelPos(index: number) {
    const angle = axisAngleRad(index, count)
    const r = RADIUS + 18
    const x = CENTER.x + Math.cos(angle) * r
    const y = CENTER.y + Math.sin(angle) * r
    let anchor: 'start' | 'middle' | 'end' = 'middle'
    if (Math.cos(angle) > 0.2) anchor = 'start'
    else if (Math.cos(angle) < -0.2) anchor = 'end'
    return { x, y, anchor }
  }

  const actualPolygon = actualPolygonPath(actuals, chartMax, RADIUS, CENTER)
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
      {/* Wave week wash */}
      {waveWeekRamp != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ backgroundColor: '#378ADD', opacity: 0.08 }}
        />
      )}

      <div className="relative mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">
            Your swells this week
          </p>
          {buildLabel && (
            <span className="rounded-full bg-th-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-th-faint">
              {buildLabel}
            </span>
          )}
        </div>
        {waveWeekRamp != null && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(55, 138, 221, 0.12)', color: '#185FA5' }}
          >
            Ramp · {Math.round(waveWeekRamp * 100)}%
          </span>
        )}
      </div>

      {/* Wavy underline subtitle decoration on wave weeks */}
      {waveWeekRamp != null && (
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
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[320px]"
          role="img"
          aria-label="Weekly shape radar"
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: drag ? 'none' : 'auto' }}
        >
          {/* Wedge fills (target ring tiling) */}
          {swells.map((s, i) => (
            <path
              key={`wedge-${s.id}`}
              d={wedgePath(i, displayTargets, chartMax, RADIUS, CENTER)}
              fill={s.color}
              fillOpacity={0.34}
            />
          ))}

          {/* Filled slices per swell — fuel-gauge shape inside each wedge */}
          {swells.map((s, i) => {
            const d = slicePath(i, actuals, chartMax, RADIUS, CENTER)
            if (!d) return null
            return (
              <path
                key={`slice-${s.id}`}
                d={d}
                fill={s.color}
                fillOpacity={0.65}
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
                fontSize="10"
                fill="var(--color-th-muted, currentColor)"
              >
                {s.name}
              </text>
            )
          })}

          {/* Drag handles — sit at each target vertex */}
          {swells.map((_, i) => {
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
  onCancel,
  onConfirm,
}: {
  buildLabel: string
  rows: ResetRow[]
  currency: string
  isHours: boolean
  onCancel: () => void
  onConfirm: (opted: Set<string>) => void
}) {
  const [opted, setOpted] = useState<Set<string>>(() => new Set(rows.map(r => r.id)))
  const fmt = (n: number) => (isHours ? Math.round(n * 10) / 10 : Math.round(n))

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
                    {fmt(r.from)} → {fmt(r.to)} {currency}
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
