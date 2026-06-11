'use client'

import { useActionState, useEffect, useState } from 'react'
import { createMotion } from '@/app/actions/motions'

type Group = { id: string; name: string; color: string }
type Swell = { id: string; name: string; color: string }
type TrackingMode = 'points' | 'hours'

type Props = {
  groups: Group[]
  groupsEnabled: boolean
  trackingMode: TrackingMode
  onClose: () => void
  // Existing swells available for multi-select at creation. Hidden when the
  // form is opened from a swell context (swellId set) since that flow links
  // the motion to the single contextual swell at 100% weight.
  allSwells?: Swell[]
  // When set, the new motion is auto-linked to this swell at 100% contribution
  // weight, and the form header kicker reads the swell name for context.
  swellId?: string
  swellLabel?: string
}

export function AddMotionForm({ groups, groupsEnabled, trackingMode, onClose, allSwells, swellId, swellLabel }: Props) {
  const [state, formAction, pending] = useActionState(createMotion, null)
  const isHours = trackingMode === 'hours'
  const swellPickerOpen = !swellId && (allSwells?.length ?? 0) > 0
  const [selectedSwells, setSelectedSwells] = useState<Map<string, number>>(new Map())

  function toggleSwell(id: string) {
    setSelectedSwells(prev => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, 1)
      return next
    })
  }

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
        type="text"
        defaultValue="1:00"
        inputMode="decimal"
        className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
      />
    </div>
  )

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-th-muted">
          {swellLabel ? `Add to ${swellLabel}` : 'Onduler'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-th-muted">
        Motions are verbs. Add actions that are important to you.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        {swellId && <input type="hidden" name="swell_id" value={swellId} />}
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

        {swellPickerOpen && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-th-muted">Feeds</p>
            <div className="flex flex-wrap gap-1.5">
              {allSwells!.map(s => {
                const active = selectedSwells.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSwell(s.id)}
                    className="rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                    style={active
                      ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                      : { borderColor: 'var(--color-th-border)', color: 'var(--color-th-muted)' }}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
            <input
              type="hidden"
              name="swell_entries"
              value={JSON.stringify(Array.from(selectedSwells.entries()).map(([swellId, weight]) => ({ swellId, weight })))}
            />
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
