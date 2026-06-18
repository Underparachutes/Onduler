'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatPts, formatHrs } from '@/lib/format'
import { ceilDisplay, monthlyTargetDisplay, lifetimeTargetDisplay, parseHoursInput, type DayKey } from '@/lib/periods'
import { setSwellHidden, updateSwellDirect, setSwellGroup, deleteSwell } from '@/app/actions/swells'
import { unlogMotion } from '@/app/actions/logs'
import { hideMotion } from '@/app/actions/motions'
import { AddMotionForm } from '@/app/dashboard/components/AddMotionForm'
import { MotionDetailSheet } from '@/app/dashboard/components/MotionDetailSheet'
import { MilestonesSection, type Milestone } from './MilestonesSection'
import { useSaveGuard } from '@/app/components/useSaveGuard'
import { useContentCrypto } from '@/app/components/useContentCrypto'

type Swell = {
  id: string
  name: string
  color: string
  target_points: number | null
  target_hours: number | null
  groupId: string | null
  hidden: boolean
}

type Group = { id: string; name: string; color: string }
type ChipSwell = { id: string; name: string; color: string }
type MotionSwell = { id: string; name: string; color: string; weight: number }
type MotionFull = {
  id: string
  name: string
  default_points: number
  default_hours: number
  swells: MotionSwell[]
  groupId: string | null
  submotionMode: 'distribute' | 'rollup' | null
}
type SubSwell = { id: string; name: string; color: string; weight: number }
type SubFull = {
  id: string
  name: string
  default_points: number
  default_hours: number
  swells: SubSwell[]
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
  monthBonus: number
  weeksActive: number
  weeksSinceFirstLog: number
  motions: MotionStat[]
  milestones: Milestone[]
  trackingMode: 'points' | 'hours'
  todayKey: DayKey
  groupsEnabled: boolean
  allGroups: Group[]
  allSwells: ChipSwell[]
  motionDetails: MotionFull[]
  submotionsByParent: Record<string, SubFull[]>
  doneMotionIds: string[]
  submotionsEnabled: boolean
}

const TIME_OPTIONS: { value: TimeView; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'lifetime', label: 'Lifetime' },
]

const CONSTELLATION_CAP = 8
const NODE_MIN_RADIUS = 12
const NODE_MAX_RADIUS = 26
const LABEL_MAX_CHARS = 10

function activityOpacity(m: MotionStat): number {
  if (m.week.count > 0) return 1
  if (m.month.count > 0) return 0.55
  if (m.lifetime.count > 0) return 0.32
  return 0.22
}

function truncate(name: string): string {
  if (name.length <= LABEL_MAX_CHARS) return name
  return name.slice(0, LABEL_MAX_CHARS - 1) + '…'
}

export function SwellProficiencyView({
  swell,
  weekPts,
  weekHrs,
  lifetimePts,
  lifetimeHrs,
  monthBonus,
  weeksActive,
  weeksSinceFirstLog,
  motions,
  milestones,
  trackingMode,
  todayKey,
  groupsEnabled,
  allGroups,
  allSwells,
  motionDetails,
  submotionsByParent,
  doneMotionIds,
  submotionsEnabled,
}: Props) {
  const router = useRouter()
  const guard = useSaveGuard()
  const { encryptContent } = useContentCrypto()
  const [timeView, setTimeView] = useState<TimeView>('week')
  const [viewMode, setViewMode] = useState<ViewMode>('constellation')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null)

  // Inline-edit state: header name / color / weekly target. Mirrors the
  // MotionDetailSheet pattern — autosave on blur via updateSwellDirect.
  const [editingName, setEditingName] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [draftName, setDraftName] = useState(swell.name)
  const [draftTarget, setDraftTarget] = useState('')
  const [, startSave] = useTransition()
  const lastValidName = useRef(swell.name)

  function persistAll(name: string, color: string, targetPts: number | null, targetHrs: number | null) {
    startSave(async () => {
      if (await guard(updateSwellDirect(swell.id, await encryptContent(name), color, targetPts, targetHrs))) {
        router.refresh()
      }
    })
  }

  function commitName() {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setDraftName(lastValidName.current)
      setEditingName(false)
      return
    }
    if (trimmed === lastValidName.current) {
      setEditingName(false)
      return
    }
    lastValidName.current = trimmed
    setEditingName(false)
    persistAll(trimmed, swell.color, swell.target_points, swell.target_hours)
  }

  const [localColor, setLocalColor] = useState(swell.color)
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync prop → local state for color picker
  useEffect(() => { setLocalColor(swell.color) }, [swell.color])

  function handleColorChange(nextColor: string) {
    setLocalColor(nextColor)
    if (colorTimer.current) clearTimeout(colorTimer.current)
    colorTimer.current = setTimeout(() => {
      if (nextColor !== swell.color) {
        persistAll(lastValidName.current, nextColor, swell.target_points, swell.target_hours)
      }
    }, 400)
  }

  function commitTarget() {
    const raw = draftTarget.trim()
    if (raw === '') {
      setEditingTarget(false)
      persistAll(lastValidName.current, swell.color, null, null)
      return
    }
    setEditingTarget(false)
    if (trackingMode === 'hours') {
      const num = parseHoursInput(raw)
      if (num === null || num <= 0) return
      const rounded = Math.round(num * 4) / 4
      persistAll(lastValidName.current, swell.color, null, rounded)
    } else {
      const num = parseFloat(raw)
      if (isNaN(num) || num <= 0) return
      persistAll(lastValidName.current, swell.color, Math.round(num), null)
    }
  }

  // Group assignment — optimistic toggle, autosave.
  const [localGroupId, setLocalGroupId] = useState<string | null>(swell.groupId)
  const [, startGroup] = useTransition()
  function toggleGroup(groupId: string) {
    const next = localGroupId === groupId ? null : groupId
    setLocalGroupId(next)
    startGroup(async () => { await guard(setSwellGroup(swell.id, next)) })
  }

  // Delete — two-tap confirm pattern, matches MotionDetailSheet.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isDeleting, startDelete] = useTransition()
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      deleteTimer.current = setTimeout(() => setConfirmingDelete(false), 3000)
      return
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current)
    startDelete(async () => {
      if (await guard(deleteSwell(swell.id))) {
        router.push('/swells')
      }
    })
  }

  const isHours = trackingMode === 'hours'
  const weekValue = isHours ? weekHrs : weekPts
  const lifetimeValue = isHours ? lifetimeHrs : lifetimePts
  const target = isHours ? swell.target_hours : swell.target_points
  const progress = target ? Math.min((weekValue / target) * 100, 100) : null
  const hitTarget = target !== null && weekValue >= target
  const formatValue = (n: number) => isHours ? formatHrs(ceilDisplay(n, true)) : formatPts(ceilDisplay(n))

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
  function valueOf(m: MotionStat): number {
    const b = bucketOf(m)
    return isHours ? b.hrs : b.pts
  }

  // Swell-level totals for the constellation center text. Month is summed from
  // per-motion buckets; lifetime comes pre-aggregated from the page query.
  // Bonus from waypoint hits/one-shot completions in the month adds in points
  // mode only (see ADR 0004 §7).
  const monthValue = motions.reduce(
    (sum, m) => sum + (isHours ? m.month.hrs : m.month.pts),
    0,
  ) + (isHours ? 0 : monthBonus)
  // Calendar-month target derives from the weekly target via ADR 0005 §2.
  // Lifetime target only meaningful once the user has more than one week of
  // history — otherwise it collapses to the week target and the LIFETIME tab
  // reads identical to WEEK, so we fall back to the absolute lifetime total.
  const centerWindow: { value: number; target: number | null } =
    timeView === 'week'
      ? { value: weekValue, target }
      : timeView === 'month'
      ? { value: monthValue, target: target !== null ? monthlyTargetDisplay(target, todayKey, isHours) : null }
      : {
          value: lifetimeValue,
          target: target !== null && weeksSinceFirstLog > 1
            ? lifetimeTargetDisplay(target, weeksSinceFirstLog, isHours)
            : null,
        }

  // Node size = points (or hours) earned in the active window, scaled against
  // the loudest motion in the constellation. Zero-value motions still get the
  // minimum so they remain visible.
  const peakValue = Math.max(
    1,
    ...constellationMotions.map(valueOf),
  )
  function nodeRadius(m: MotionStat) {
    const v = valueOf(m)
    const span = NODE_MAX_RADIUS - NODE_MIN_RADIUS
    return NODE_MIN_RADIUS + span * Math.min(v / peakValue, 1)
  }

  const motionCountLabel = motions.length === 1 ? '1 motion' : `${motions.length} motions`

  const [, startHide] = useTransition()
  function toggleHidden() {
    const next = !swell.hidden
    startHide(async () => {
      if (!await guard(setSwellHidden(swell.id, next))) return
      // Hiding moves the swell out of the main list; bouncing back to the
      // swells page makes the action feel resolved. Restoring keeps the user
      // on the proficiency view since the swell is now visible again.
      if (next) router.push('/swells')
      else router.refresh()
    })
  }

  // SVG geometry — extra vertical space at the bottom so the 6-o'clock label fits.
  const size = 280
  const center = size / 2
  const viewBoxHeight = 312
  const orbitRadius = 100
  const centerNodeRadius = 36

  const constellationView = motions.length > 0 ? (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${viewBoxHeight}`}
        className="w-full max-w-[280px]"
        role="img"
        aria-label={`${swell.name} constellation`}
      >
        {constellationMotions.map((m, i) => {
          const angle = (2 * Math.PI * i) / constellationMotions.length - Math.PI / 2
          const x = center + orbitRadius * Math.cos(angle)
          const y = center + orbitRadius * Math.sin(angle)
          const op = activityOpacity(m)
          const sizeFactor = nodeRadius(m) / NODE_MAX_RADIUS
          const sw = 1 + sizeFactor * 2
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
          {centerWindow.target !== null
            ? `${formatValue(centerWindow.value)}/${formatValue(centerWindow.target)}`
            : formatValue(centerWindow.value)}
        </text>

        {constellationMotions.map((m, i) => {
          const angle = (2 * Math.PI * i) / constellationMotions.length - Math.PI / 2
          const x = center + orbitRadius * Math.cos(angle)
          const y = center + orbitRadius * Math.sin(angle)
          const radius = nodeRadius(m)
          const op = activityOpacity(m)
          const b = bucketOf(m)
          const value = valueOf(m)
          const displayValue = ceilDisplay(value, isHours)
          const sizeFactor = radius / NODE_MAX_RADIUS
          const countLabel = b.count === 1 ? '1 log' : `${b.count} logs`
          return (
            <g
              key={`node-${m.id}`}
              onClick={() => setSelectedMotionId(m.id)}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${m.name}: ${formatValue(value)}, ${countLabel}`}</title>
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="var(--color-th-bg)"
                stroke={swell.color}
                strokeWidth={1 + sizeFactor * 2}
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
                {displayValue > 0 ? (isHours ? formatHrs(displayValue) : displayValue) : ''}
              </text>
              <text
                x={x}
                y={y + radius + 11}
                textAnchor="middle"
                fill="var(--color-th-secondary)"
                fontSize="10"
                opacity={Math.max(0.6, op)}
              >
                {truncate(m.name)}
              </text>
            </g>
          )
        })}
      </svg>

      {overflowCount > 0 && (
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className="mt-2 text-xs text-th-muted transition-colors hover:text-th-text active:scale-[0.97] lg:hidden"
        >
          + {overflowCount} more
        </button>
      )}

      <p className="mt-2 text-[10px] uppercase tracking-widest text-th-faint">
        {motionCountLabel}
      </p>
    </div>
  ) : null

  const listView = (
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
              onClick={() => setSelectedMotionId(m.id)}
              className="flex cursor-pointer items-center gap-3 px-1 py-2.5 transition-colors active:bg-th-surface"
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
  )

  const timeToggle = motions.length > 0 ? (
    <div className="mb-3 flex gap-1">
      {TIME_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTimeView(value)}
          className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
            timeView === value
              ? 'border-th-text bg-th-text text-th-bg'
              : 'border-th-border text-th-muted hover:bg-th-surface'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  ) : null

  if (addOpen) {
    return (
      <div className="flex min-h-full flex-col items-center px-5 pb-12">
        <div className="w-full max-w-[22rem]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
          <AddMotionForm
            groups={[]}
            groupsEnabled={false}
            trackingMode={trackingMode}
            swellId={swell.id}
            swellLabel={swell.name}
            onClose={() => {
              setAddOpen(false)
              router.refresh()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-5 lg:items-start">
      <div className="w-full max-w-[22rem] lg:max-w-none lg:grid lg:grid-cols-[22rem_1fr] lg:gap-10">
        {/* Left column: header + constellation */}
        <div className="contents lg:block lg:sticky lg:top-0 lg:self-start">
          <div className="sticky top-0 z-10 bg-th-bg pb-3">
            <div className="mb-2 flex items-center gap-2">
              <label className="relative inline-block h-3 w-3 shrink-0 cursor-pointer">
                <span
                  aria-hidden
                  className="block h-full w-full rounded-full"
                  style={{ backgroundColor: localColor }}
                />
                <input
                  type="color"
                  value={localColor}
                  onChange={e => handleColorChange(e.target.value)}
                  aria-label="Swell color"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {editingName ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setDraftName(lastValidName.current)
                      setEditingName(false)
                    }
                  }}
                  className="min-w-0 flex-1 rounded border border-th-focus bg-th-bg px-2 py-1 text-lg font-semibold text-th-text outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setDraftName(swell.name); setEditingName(true) }}
                  className="min-w-0 flex-1 truncate text-left text-lg font-semibold text-th-text transition-colors hover:text-th-secondary"
                  aria-label="Edit swell name"
                >
                  {swell.name}
                </button>
              )}
            </div>

            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="text-xs uppercase tracking-widest text-th-muted">This week</p>
              <p className="shrink-0 text-sm font-medium text-th-text">
                {formatValue(weekValue)}
                {editingTarget ? (
                  <>
                    <span className="text-th-faint"> / </span>
                    <input
                      autoFocus
                      type={isHours ? 'text' : 'number'}
                      inputMode={isHours ? 'decimal' : 'numeric'}
                      {...(isHours ? {} : { min: '1', step: '1' })}
                      value={draftTarget}
                      onChange={e => setDraftTarget(e.target.value)}
                      onBlur={commitTarget}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditingTarget(false)
                        }
                      }}
                      className="w-16 rounded border border-th-focus bg-th-bg px-1 py-0.5 text-right text-sm font-medium text-th-text outline-none"
                    />
                  </>
                ) : target !== null ? (
                  <button
                    type="button"
                    onClick={() => { setDraftTarget(isHours ? formatHrs(Number(target)) : String(target)); setEditingTarget(true) }}
                    className="text-th-faint transition-colors hover:text-th-secondary"
                    aria-label="Edit weekly target"
                  >
                    {' / '}{formatValue(target)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setDraftTarget(''); setEditingTarget(true) }}
                    className="ml-2 text-xs text-th-faint transition-colors hover:text-th-secondary"
                  >
                    + target
                  </button>
                )}
                {hitTarget && <span className="ml-1 text-th-faint">&#10003;</span>}
              </p>
            </div>

            {progress !== null && target !== null && (
              <div className="mb-2 rounded-full bg-th-surface/40" style={{ height: '5px' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: `linear-gradient(to right, color-mix(in oklch, ${swell.color} 35%, var(--th-surface)), ${swell.color})`, backgroundSize: `${100 / (progress / 100)}% 100%` }}
                />
              </div>
            )}

            {lifetimeValue > 0 && (
              <p className="text-xs text-th-faint">
                {formatValue(lifetimeValue)} · {weeksLabel}
              </p>
            )}

            {groupsEnabled && allGroups.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {allGroups.map(g => {
                  const active = localGroupId === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors"
                      style={active
                        ? { backgroundColor: g.color, borderColor: g.color, color: '#fff' }
                        : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Constellation: desktop only (mobile renders it in the section below) */}
          {constellationView && (
            <div className="mt-6 hidden lg:block">
              {constellationView}
            </div>
          )}
        </div>

        {/* Right column: motions list + waypoints */}
        <div>
          {/* Mobile: section header with Stars/List toggle */}
          <section className="mt-6 lg:mt-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">
                Motions feeding this swell
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {motions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'constellation' ? 'list' : 'constellation')}
                    className="rounded-md border border-th-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-th-muted transition-colors hover:bg-th-surface lg:hidden"
                    aria-label={viewMode === 'constellation' ? 'Switch to list view' : 'Switch to constellation view'}
                  >
                    {viewMode === 'constellation' ? 'List' : 'Stars'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  aria-label={`Add motion to ${swell.name}`}
                  className="flex h-6 w-6 items-center justify-center text-xl font-light leading-none text-th-muted transition-colors hover:text-th-text active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Desktop: time toggle + list always visible in right col */}
            <div className="hidden lg:block">
              {timeToggle}
              {motions.length === 0 ? (
                <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
                  No motions assigned yet.
                </p>
              ) : listView}
            </div>

            {/* Mobile: constellation or list based on viewMode */}
            <div className="lg:hidden">
              {motions.length === 0 ? (
                <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
                  No motions assigned yet.
                </p>
              ) : viewMode === 'constellation' ? (
                <>
                  {timeToggle}
                  {constellationView}
                </>
              ) : (
                <>
                  {timeToggle}
                  {listView}
                </>
              )}
            </div>
          </section>

          <MilestonesSection
            swellId={swell.id}
            swellColor={swell.color}
            milestones={milestones}
            swellMotions={motions.map(m => ({ id: m.id, name: m.name }))}
          />

          <div className="sticky bottom-0 z-10 border-t border-th-border bg-th-bg pb-4 pt-4">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={toggleHidden}
                className="text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
              >
                {swell.hidden ? 'Restore swell' : 'Hide swell'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`text-xs transition-colors disabled:opacity-50 ${
                  confirmingDelete ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'
                }`}
              >
                {isDeleting
                  ? 'Deleting…'
                  : confirmingDelete
                  ? 'Tap again to delete swell'
                  : 'Delete swell'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedMotionId && (() => {
        const detail = motionDetails.find(m => m.id === selectedMotionId)
        if (!detail) return null
        const isLogged = doneMotionIds.includes(selectedMotionId)
        return (
          <MotionDetailSheet
            motion={detail}
            submotions={submotionsByParent[selectedMotionId] ?? []}
            doneMotionIds={doneMotionIds}
            onClose={() => setSelectedMotionId(null)}
            onPointsDelta={() => router.refresh()}
            onHide={async (id) => {
              setSelectedMotionId(null)
              if (await guard(hideMotion(id))) router.refresh()
            }}
            isLogged={isLogged}
            onUnlog={async () => {
              if (await guard(unlogMotion(selectedMotionId))) router.refresh()
            }}
            allSwells={allSwells}
            allGroups={allGroups}
            groupsEnabled={groupsEnabled}
            submotionsEnabled={submotionsEnabled}
            trackingMode={trackingMode}
            onOpenDuplicate={(id) => setSelectedMotionId(id)}
          />
        )
      })()}
    </div>
  )
}
