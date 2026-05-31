'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logMotionOnDay, removeLogById } from '@/app/actions/logs'

type MotionSwell = { id: string; name: string; color: string; weight: number }
type Motion = { id: string; name: string; default_points: number; default_hours: number; swells: MotionSwell[]; groupId: string | null; submotionMode: 'distribute' | 'rollup' | null }
type Submotion = { id: string; name: string; default_points: number; default_hours: number; swells: { id: string; name: string; color: string; weight: number }[] }
type TrackingMode = 'points' | 'hours'

type Swell = { id: string; name: string; color: string }

type Props = {
  motions: Motion[]
  submotionsMap: Record<string, Submotion[]>
  submotionsEnabled: boolean
  trackingMode: TrackingMode
  weeklyLogMap: Record<string, Record<string, string[]>>
  hidePtsHrs: boolean
  weekOffset: number
  onWeekOffsetChange: (offset: number) => void
  onLogDelta?: (delta: number) => void
  bySwell?: boolean
  allSwells?: Swell[]
  hideDone?: boolean
  hideNav?: boolean
}

import { getWeekDayKeys } from './weekDayKeys'
export { getWeekDayKeys }

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function DayBox({
  count,
  isFuture,
  dayIndex,
  onTap,
}: {
  count: number
  isFuture: boolean
  dayIndex: number
  onTap: () => void
}) {
  const intensity = 15 + dayIndex * 7
  return (
    <button
      onClick={onTap}
      disabled={isFuture}
      className={`flex h-7 w-7 items-center justify-center rounded text-xs transition-colors ${
        isFuture
          ? 'bg-th-surface/50 text-th-faint/30 cursor-default'
          : count > 0
            ? 'text-th-btn font-semibold'
            : 'bg-th-surface text-th-faint hover:bg-th-border'
      }`}
      style={count > 0 && !isFuture ? {
        background: `color-mix(in oklch, var(--th-accent) ${intensity}%, var(--th-surface))`,
      } : undefined}
    >
      {count === 0 ? '' : count === 1 ? '✓' : `${count}×`}
    </button>
  )
}

function MotionWeekRow({
  motion,
  dayKeys,
  logMap,
  trackingMode,
  hidePtsHrs,
  todayKey,
  onTapDay,
  indent,
  readOnly,
}: {
  motion: { id: string; name: string; default_points: number; default_hours: number }
  dayKeys: string[]
  logMap: Record<string, string[]>
  trackingMode: TrackingMode
  hidePtsHrs: boolean
  todayKey: string
  onTapDay: (motionId: string, dayKey: string, logIds: string[]) => void
  indent?: boolean
  readOnly?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${indent ? 'pl-6' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-th-text">
          {motion.name}
        </p>
      </div>
      {!hidePtsHrs && (
        <span className="shrink-0 text-xs text-th-faint">
          {trackingMode === 'hours' ? `${motion.default_hours}h` : `${motion.default_points}`}
        </span>
      )}
      <div className="flex shrink-0 gap-1">
        {dayKeys.map((dk, i) => {
          const isFuture = dk > todayKey
          const ids = logMap[dk] ?? []
          const count = ids.length
          const intensity = 15 + i * 7
          if (readOnly) {
            return (
              <div
                key={dk}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
                  count > 0
                    ? 'text-th-btn/60'
                    : 'bg-th-surface/50 text-th-faint/30'
                }`}
                style={count > 0 ? {
                  background: `color-mix(in oklch, var(--th-accent) ${intensity * 0.5}%, var(--th-surface))`,
                } : undefined}
              >
                {count === 0 ? '' : count === 1 ? '✓' : `${count}×`}
              </div>
            )
          }
          return (
            <DayBox
              key={dk}
              count={count}
              isFuture={isFuture}
              dayIndex={i}
              onTap={() => onTapDay(motion.id, dk, ids)}
            />
          )
        })}
      </div>
    </div>
  )
}

export function WeekEditView({
  motions,
  submotionsMap,
  submotionsEnabled,
  trackingMode,
  weeklyLogMap,
  hidePtsHrs,
  weekOffset,
  onWeekOffsetChange,
  onLogDelta,
  bySwell,
  allSwells,
  hideDone,
  hideNav,
}: Props) {
  const [, startTransition] = useTransition()
  const router = useRouter()
  const dayKeys = getWeekDayKeys(weekOffset)

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const todayKey = `${y}-${m}-${d}`

  const [localLogMap, setLocalLogMap] = useState(weeklyLogMap)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync prop → local state for optimistic updates
  useEffect(() => { setLocalLogMap(weeklyLogMap) }, [weeklyLogMap])

  function handleTapDay(motionId: string, dayKey: string, logIds: string[]) {
    const allMotions = [...motions, ...Object.values(submotionsMap).flat()]
    const motion = allMotions.find(m => m.id === motionId)
    const delta = motion
      ? (trackingMode === 'hours' ? Number(motion.default_hours) : motion.default_points)
      : 0

    if (logIds.length === 0) {
      setLocalLogMap(prev => {
        const motionMap = { ...(prev[motionId] ?? {}) }
        motionMap[dayKey] = [...(motionMap[dayKey] ?? []), '__pending__']
        return { ...prev, [motionId]: motionMap }
      })
      onLogDelta?.(delta)
      startTransition(async () => {
        await logMotionOnDay(motionId, dayKey)
        router.refresh()
      })
    } else {
      const removeId = logIds[0]
      setLocalLogMap(prev => {
        const motionMap = { ...(prev[motionId] ?? {}) }
        const ids = [...(motionMap[dayKey] ?? [])]
        const idx = ids.indexOf(removeId)
        if (idx !== -1) ids.splice(idx, 1)
        motionMap[dayKey] = ids
        return { ...prev, [motionId]: motionMap }
      })
      onLogDelta?.(-delta)
      startTransition(async () => {
        await removeLogById(removeId)
        router.refresh()
      })
    }
  }

  const weekLabel = weekOffset === 0 ? 'This week' : 'Last week'

  const eligibleDays = dayKeys.filter(dk => dk <= todayKey)
  const weekCompleteIds = new Set<string>()
  if (hideDone && eligibleDays.length > 0) {
    const allItems = [...motions, ...Object.values(submotionsMap).flat()]
    for (const m of allItems) {
      const logs = localLogMap[m.id] ?? {}
      if (eligibleDays.every(dk => (logs[dk] ?? []).length > 0)) {
        weekCompleteIds.add(m.id)
      }
    }
    for (const motion of motions) {
      if (motion.submotionMode === 'distribute') {
        const subs = submotionsMap[motion.id] ?? []
        if (subs.length > 0 && subs.every(s => weekCompleteIds.has(s.id))) {
          weekCompleteIds.add(motion.id)
        }
      }
    }
  }

  function renderMotionRow(motion: Motion) {
    if (weekCompleteIds.has(motion.id)) return null
    const subs = submotionsEnabled ? (submotionsMap[motion.id] ?? []) : []
    const isDistribute = motion.submotionMode === 'distribute'
    const hasSubs = subs.length > 0
    const visibleSubs = subs.filter(s => !weekCompleteIds.has(s.id))

    return (
      <div key={motion.id} className="flex flex-col gap-2">
        <MotionWeekRow
          motion={motion}
          dayKeys={dayKeys}
          logMap={localLogMap[motion.id] ?? {}}
          trackingMode={trackingMode}
          hidePtsHrs={hidePtsHrs}
          todayKey={todayKey}
          onTapDay={handleTapDay}
          readOnly={hasSubs && isDistribute}
        />
        {hasSubs && visibleSubs.map(sub => (
          <MotionWeekRow
            key={sub.id}
            motion={sub}
            dayKeys={dayKeys}
            logMap={localLogMap[sub.id] ?? {}}
            trackingMode={trackingMode}
            hidePtsHrs={hidePtsHrs}
            todayKey={todayKey}
            onTapDay={handleTapDay}
            indent
          />
        ))}
      </div>
    )
  }

  function renderMotionSections() {
    if (bySwell && allSwells && allSwells.length > 0) {
      const sections: { id: string; label: string; color?: string; motions: Motion[] }[] = []
      for (const swell of allSwells) {
        const ms = motions.filter(m => m.swells.some(s => s.id === swell.id) && !weekCompleteIds.has(m.id))
        if (ms.length > 0) sections.push({ id: swell.id, label: swell.name, color: swell.color, motions: ms })
      }
      const unassigned = motions.filter(m => m.swells.length === 0 && !weekCompleteIds.has(m.id))
      if (unassigned.length > 0) sections.push({ id: 'unassigned', label: 'Unassigned', motions: unassigned })

      return (
        <div className="flex flex-col gap-6">
          {sections.map(section => (
            <div key={section.id}>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-widest"
                style={section.color ? { color: section.color } : undefined}
              >
                {section.label}
              </p>
              <div className="flex flex-col gap-2">
                {section.motions.map(renderMotionRow)}
              </div>
            </div>
          ))}
        </div>
      )
    }

    const visible = motions.filter(m => !weekCompleteIds.has(m.id))
    return (
      <div className="flex flex-col gap-2">
        {visible.map(renderMotionRow)}
      </div>
    )
  }

  return (
    <div>
      {!hideNav && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-th-muted">{weekLabel}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onWeekOffsetChange(-1)}
                disabled={weekOffset === -1}
                className="px-2 py-1 text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-30"
              >
                ‹ Last
              </button>
              <button
                onClick={() => onWeekOffsetChange(0)}
                disabled={weekOffset === 0}
                className="px-2 py-1 text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-30"
              >
                This ›
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex-1" />
            {!hidePtsHrs && <span className="shrink-0 w-6" />}
            <div className="flex shrink-0 gap-1">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="flex h-5 w-7 items-center justify-center text-[10px] font-semibold uppercase text-th-faint">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {renderMotionSections()}
    </div>
  )
}
