'use client'

import { useActionState, useEffect, useState } from 'react'
import { createSwell } from '@/app/actions/swells'
import { detectMode, getRandomThemeAccent } from '@/lib/theme-colors'

type TrackingMode = 'points' | 'hours'

type Props = {
  trackingMode: TrackingMode
  onClose: () => void
}

export function AddSwellForm({ trackingMode, onClose }: Props) {
  const [state, action, isPending] = useActionState(createSwell, null)
  const [color, setColor] = useState('#6b7280')
  const isHours = trackingMode === 'hours'

  useEffect(() => {
    const theme = document.documentElement.dataset.theme ?? 'biarritz'
    setColor(getRandomThemeAccent(theme, detectMode()))
  }, [])

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

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

      <p className="mb-4 text-xs leading-relaxed text-th-muted">
        Swells are nouns. Add things that matter to you. Motions feed swells.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="Swell name"
            required
            autoFocus
            className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
          />
          <input
            type="color"
            name="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
          />
        </div>

        {isHours ? (
          <div className="flex items-center gap-2">
            <label htmlFor="target_hours" className="shrink-0 text-xs text-th-muted">Weekly hrs</label>
            <input
              id="target_hours"
              type="number"
              name="target_hours"
              min="0.25"
              step="0.25"
              placeholder="5"
              defaultValue="5"
              inputMode="decimal"
              className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label htmlFor="target_points" className="shrink-0 text-xs text-th-muted">Weekly pts</label>
            <input
              id="target_points"
              type="number"
              name="target_points"
              min="1"
              placeholder="100"
              defaultValue="100"
              inputMode="numeric"
              className="w-full rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>
        )}

        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
        >
          {isPending ? 'Adding…' : 'Save'}
        </button>
      </form>
    </>
  )
}
