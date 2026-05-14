'use client'

import { useActionState } from 'react'
import { createSwell } from '@/app/actions/swells'

export function AddSwellForm() {
  const [state, action, isPending] = useActionState(createSwell, null)

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          name="name"
          placeholder="Swell name"
          required
          className="flex-1 rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-sm text-th-text outline-none focus:border-th-focus"
        />
        <input
          type="color"
          name="color"
          defaultValue="#6b7280"
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="target_points" className="text-xs text-th-muted">Target pts <span className="text-th-faint">(optional)</span></label>
          <input
            id="target_points"
            type="number"
            name="target_points"
            min="1"
            placeholder="e.g. 1,000"
            defaultValue="1000"
            className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="target_hours" className="text-xs text-th-muted">Target hrs <span className="text-th-faint">(optional)</span></label>
          <input
            id="target_hours"
            type="number"
            name="target_hours"
            min="0.25"
            step="0.25"
            placeholder="e.g. 10,000"
            defaultValue="10000"
            className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
      </div>

      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
      >
        {isPending ? 'Adding…' : 'Add swell'}
      </button>
    </form>
  )
}
