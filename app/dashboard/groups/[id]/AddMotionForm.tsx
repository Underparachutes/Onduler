'use client'

import { useActionState } from 'react'
import { createMotionInGroup } from '@/app/actions/motions'

type State = { error?: string; success?: boolean } | null

export function AddMotionForm({ groupId }: { groupId: string }) {
  const createForGroup = createMotionInGroup.bind(null, groupId)
  const [state, formAction, pending] = useActionState<State, FormData>(createForGroup, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-th-secondary">
          Motion name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Morning run, Cook a meal"
          required
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="default_points" className="text-sm font-medium text-th-secondary">Points</label>
          <input
            id="default_points"
            name="default_points"
            type="number"
            defaultValue="1"
            min="1"
            className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="default_hours" className="text-sm font-medium text-th-secondary">Hours</label>
          <input
            id="default_hours"
            name="default_hours"
            type="number"
            defaultValue="1"
            min="0.25"
            step="0.25"
            className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add motion'}
      </button>
    </form>
  )
}
