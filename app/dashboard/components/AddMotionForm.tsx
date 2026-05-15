'use client'

import { useActionState, useEffect } from 'react'
import { createMotion } from '@/app/actions/motions'

type Group = { id: string; name: string; color: string }
type TrackingMode = 'points' | 'hours'

type Props = {
  groups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
  onClose: () => void
}

export function AddMotionForm({ groups, groupsEnabled, trackingMode, onClose }: Props) {
  const [state, formAction, pending] = useActionState(createMotion, null)
  const isHours = trackingMode === 'hours'

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  const ptsField = (
    <div className="flex flex-1 items-center gap-2">
      <label htmlFor="default_points" className="shrink-0 text-xs text-th-muted">Pts</label>
      <input
        id="default_points"
        name="default_points"
        type="number"
        defaultValue="1"
        min="1"
        inputMode="numeric"
        className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
      />
    </div>
  )

  const hrsField = (
    <div className="flex flex-1 items-center gap-2">
      <label htmlFor="default_hours" className="shrink-0 text-xs text-th-muted">Hrs</label>
      <input
        id="default_hours"
        name="default_hours"
        type="number"
        defaultValue="1"
        min="0.25"
        step="0.25"
        inputMode="decimal"
        className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
      />
    </div>
  )

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="name"
          type="text"
          placeholder="Motion name"
          required
          autoFocus
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
        />
        <div className="flex gap-3">
          {isHours ? <>{hrsField}{ptsField}</> : <>{ptsField}{hrsField}</>}
        </div>

        {groupsEnabled && groups.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="group_id" className="shrink-0 text-xs text-th-muted">Group</label>
            <select
              id="group_id"
              name="group_id"
              defaultValue=""
              className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
            >
              <option value="">None</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Save'}
        </button>
      </form>
    </>
  )
}
