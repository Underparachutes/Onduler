'use client'

import { useState, useActionState } from 'react'
import { updateSwell, deleteSwell } from '@/app/actions/swells'
import { formatPts, formatHrs } from '@/lib/format'

type Motion = { id: string; name: string; default_points: number; default_hours: number; swellIds: string[] }
type SwellStub = { id: string; name: string; color: string }
type TrackingMode = 'points' | 'hours'

type Props = {
  swell: { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; motions: Motion[] }
  swellPtsToday: number
  swellHrsToday: number
  ptsToday: Map<string, number>
  hrsToday: Map<string, number>
  allSwells: SwellStub[]
  localHiddenIds: Set<string>
  trackingMode: TrackingMode
  onOpenMotion: (id: string) => void
}

export function SwellRow({ swell, swellPtsToday, swellHrsToday, ptsToday, hrsToday, allSwells, localHiddenIds, trackingMode, onOpenMotion }: Props) {
  const [editing, setEditing] = useState(false)
  const updateById = updateSwell.bind(null, swell.id)
  const [state, action, isPending] = useActionState(updateById, null)
  const deleteById = deleteSwell.bind(null, swell.id)

  const isHours = trackingMode === 'hours'

  // Choose which target field to show in edit form (preselect from populated column).
  const showHoursField =
    swell.target_hours !== null && swell.target_points === null
      ? true
      : swell.target_points !== null && swell.target_hours === null
      ? false
      : isHours

  // Display: only the progress for the current mode.
  const todayValue = isHours ? swellHrsToday : swellPtsToday
  const target = isHours ? (swell.target_hours !== null ? Number(swell.target_hours) : null) : swell.target_points
  const progress = target ? Math.min((todayValue / target) * 100, 100) : null
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
            <form action={deleteById} className="ml-auto">
              <button type="submit" className="text-xs text-th-faint transition-colors hover:text-red-500">
                Delete
              </button>
            </form>
          </div>
        </form>
        {state?.error && <p className="mb-2 text-xs text-red-500">{state.error}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swell.color }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: swell.color }}>
            {swell.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-th-faint">{formatValue(todayValue)} today</span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            Edit
          </button>
        </div>
      </div>

      {progress !== null && target !== null && (
        <div className="mb-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-right text-[10px] text-th-faint">
              {todayValue}/{target} {isHours ? 'hrs' : 'pts'}
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

      {swell.motions.filter(m => !localHiddenIds.has(m.id)).length === 0 ? (
        <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
          No motions assigned yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {swell.motions
            .filter(m => !localHiddenIds.has(m.id))
            .map(motion => (
              <button
                key={motion.id}
                onClick={() => onOpenMotion(motion.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-th-surface"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-th-text">{motion.name}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-th-secondary">
                  {isHours ? formatHrs(motion.default_hours) : formatPts(motion.default_points)}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
