'use client'

import { useState, useActionState } from 'react'
import { updateSwell, deleteSwell } from '@/app/actions/swells'
import { MotionSwellToggle } from './MotionSwellToggle'

type Motion = { id: string; name: string; default_points: number; default_hours: number; swellIds: string[] }
type SwellStub = { id: string; name: string; color: string }

type Props = {
  swell: { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; motions: Motion[] }
  swellPtsToday: number
  swellHrsToday: number
  ptsToday: Map<string, number>
  hrsToday: Map<string, number>
  allSwells: SwellStub[]
}

export function SwellRow({ swell, swellPtsToday, swellHrsToday, ptsToday, hrsToday, allSwells }: Props) {
  const [editing, setEditing] = useState(false)
  const updateById = updateSwell.bind(null, swell.id)
  const [state, action, isPending] = useActionState(updateById, null)
  const deleteById = deleteSwell.bind(null, swell.id)

  const ptsProgress = swell.target_points ? Math.min((swellPtsToday / swell.target_points) * 100, 100) : null
  const hrsProgress = swell.target_hours ? Math.min((swellHrsToday / Number(swell.target_hours)) * 100, 100) : null

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
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-th-muted">Target pts</label>
              <input
                type="number"
                name="target_points"
                defaultValue={swell.target_points ?? ''}
                min="1"
                placeholder="None"
                className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-th-muted">Target hrs</label>
              <input
                type="number"
                name="target_hours"
                defaultValue={swell.target_hours ?? ''}
                min="0.25"
                step="0.25"
                placeholder="None"
                className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>
          </div>
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
          <span className="text-xs text-th-faint">{swellPtsToday} pts today</span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-th-faint transition-colors hover:text-th-muted"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Target progress */}
      {(ptsProgress !== null || hrsProgress !== null) && (
        <div className="mb-3 flex flex-col gap-1.5">
          {ptsProgress !== null && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-right text-[10px] text-th-faint">{swellPtsToday}/{swell.target_points} pts</span>
              <div className="flex-1 rounded-full bg-th-surface" style={{ height: '4px' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${ptsProgress}%`, backgroundColor: swell.color }}
                />
              </div>
              <span className="w-8 text-right text-[10px] text-th-faint">{Math.round(ptsProgress)}%</span>
            </div>
          )}
          {hrsProgress !== null && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-right text-[10px] text-th-faint">{swellHrsToday}/{swell.target_hours} hrs</span>
              <div className="flex-1 rounded-full bg-th-surface" style={{ height: '4px' }}>
                <div
                  className="h-full rounded-full transition-all opacity-60"
                  style={{ width: `${hrsProgress}%`, backgroundColor: swell.color }}
                />
              </div>
              <span className="w-8 text-right text-[10px] text-th-faint">{Math.round(hrsProgress)}%</span>
            </div>
          )}
        </div>
      )}

      {swell.motions.length === 0 ? (
        <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
          No motions assigned yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {swell.motions.map(motion => (
            <div key={motion.id} className="flex items-center gap-3 rounded-lg border border-th-border px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-th-text truncate">{motion.name}</p>
                <p className="text-xs text-th-faint">{motion.default_points} pts · {motion.default_hours} hrs</p>
              </div>
              {ptsToday.get(motion.id) ? (
                <span className="text-xs font-medium text-th-secondary shrink-0">
                  +{ptsToday.get(motion.id)} today
                </span>
              ) : null}
              <MotionSwellToggle
                motionId={motion.id}
                allSwells={allSwells}
                currentSwellIds={motion.swellIds}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
