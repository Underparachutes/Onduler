'use client'

import { useState, useActionState, useTransition, useRef, useEffect } from 'react'
import { updateSwell, deleteSwell, setSwellGroup } from '@/app/actions/swells'
import { formatPts, formatHrs } from '@/lib/format'

type Motion = { id: string; name: string; default_points: number; default_hours: number; swellIds: string[]; swellWeights: Record<string, number> }
type SwellStub = { id: string; name: string; color: string }
type Group = { id: string; name: string; color: string }
type TrackingMode = 'points' | 'hours'

type Props = {
  swell: { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; groupId: string | null; motions: Motion[] }
  swellPtsToday: number
  swellHrsToday: number
  swellPtsAllTime: number
  swellHrsAllTime: number
  ptsToday: Map<string, number>
  hrsToday: Map<string, number>
  allSwells: SwellStub[]
  allGroups: Group[]
  groupsEnabled: boolean
  localHiddenIds: Set<string>
  trackingMode: TrackingMode
  expanded: boolean
  onToggleExpand: () => void
  onOpenMotion: (id: string) => void
}

export function SwellRow({
  swell, swellPtsAllTime, swellHrsAllTime,
  allGroups, groupsEnabled, localHiddenIds, trackingMode,
  expanded, onToggleExpand, onOpenMotion,
}: Props) {
  const [editing, setEditing] = useState(false)
  const updateById = updateSwell.bind(null, swell.id)
  const [state, action, isPending] = useActionState(updateById, null)

  const [deleting, startDelete] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Group assignment
  const [localGroupId, setLocalGroupId] = useState<string | null>(swell.groupId)
  const [, startGroupTransition] = useTransition()

  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }
  }, [])

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
    } else {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      startDelete(async () => { await deleteSwell(swell.id) })
    }
  }

  function toggleGroup(groupId: string) {
    const next = localGroupId === groupId ? null : groupId
    setLocalGroupId(next)
    startGroupTransition(async () => { await setSwellGroup(swell.id, next) })
  }

  const isHours = trackingMode === 'hours'

  const showHoursField =
    swell.target_hours !== null && swell.target_points === null
      ? true
      : swell.target_points !== null && swell.target_hours === null
      ? false
      : isHours

  // All-time values for display
  const allTimeValue = isHours ? swellHrsAllTime : swellPtsAllTime
  const target = isHours ? (swell.target_hours !== null ? Number(swell.target_hours) : null) : swell.target_points
  const progress = target ? Math.min((allTimeValue / target) * 100, 100) : null
  const formatValue = (n: number) => isHours ? formatHrs(n) : formatPts(n)

  if (editing) {
    return (
      <div>
        <form action={action} className="flex flex-col gap-3 mb-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="name"
              defaultValue={swell.name}
              required
              autoFocus
              className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <input
              type="color"
              name="color"
              defaultValue={swell.color}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
            />
          </div>
          {showHoursField ? (
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs text-th-muted">Target hrs</label>
              <input
                type="number"
                name="target_hours"
                defaultValue={swell.target_hours ?? ''}
                min="0.25"
                step="0.25"
                placeholder="None"
                inputMode="decimal"
                className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs text-th-muted">Target pts</label>
              <input
                type="number"
                name="target_points"
                defaultValue={swell.target_points ?? ''}
                min="1"
                placeholder="None"
                inputMode="numeric"
                className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>
          )}
          {/* Group picker (same UI as motions) */}
          {groupsEnabled && allGroups.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-th-faint">Group</p>
              <div className="flex flex-wrap gap-1.5">
                {allGroups.map(g => {
                  const active = localGroupId === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className="rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                      style={active
                        ? { backgroundColor: g.color, borderColor: g.color, color: '#fff' }
                        : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-th-faint transition-colors hover:text-th-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || deleting}
              className={`ml-auto text-xs transition-colors disabled:opacity-50 ${confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
            >
              {deleting ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete'}
            </button>
          </div>
        </form>
        {state?.error && <p className="mb-2 text-xs text-red-500">{state.error}</p>}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onToggleExpand}
        className="mb-2 flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3 w-3 text-th-faint transition-transform ${expanded ? '' : '-rotate-90'}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swell.color }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: swell.color }}>
            {swell.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-th-faint">{formatValue(allTimeValue)} total</span>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            className="text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            Edit
          </button>
        </div>
      </button>

      {progress !== null && target !== null && (
        <div className="mb-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-right text-[10px] text-th-faint">
              {isHours ? allTimeValue.toFixed(1) : Math.round(allTimeValue)}/{target} {isHours ? 'hrs' : 'pts'}
            </span>
            <div className="flex-1 rounded-full bg-th-surface" style={{ height: '4px' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: swell.color }}
              />
            </div>
            <span className="w-8 text-right text-[10px] text-th-faint">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* Motions list — collapsed by default (Prompt 5) */}
      {expanded && (
        <>
          {swell.motions.filter(m => !localHiddenIds.has(m.id)).length === 0 ? (
            <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
              No motions assigned yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {swell.motions
                .filter(m => !localHiddenIds.has(m.id))
                .map(motion => {
                  const w = motion.swellWeights?.[swell.id] ?? 1
                  const weightedPts = Math.floor(motion.default_points * w)
                  const weightedHrs = motion.default_hours * w
                  const showWeight = w < 1
                  return (
                    <button
                      key={motion.id}
                      onClick={() => onOpenMotion(motion.id)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-th-surface"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-th-text">{motion.name}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-th-secondary">
                        {isHours ? formatHrs(weightedHrs) : formatPts(weightedPts)}
                        {showWeight && <span className="ml-1 text-xs font-normal text-th-faint">({Math.round(w * 100)}%)</span>}
                      </span>
                    </button>
                  )
                })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
