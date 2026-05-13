'use client'

import { useActionState } from 'react'
import { createActivity } from '@/app/actions/activities'

const createWithNoDomain = createActivity.bind(null, null)

export function AddActivityStandaloneForm() {
  const [state, formAction, pending] = useActionState(createWithNoDomain, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-th-secondary">
          Activity name
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

      <div className="flex flex-col gap-1">
        <label htmlFor="default_points" className="text-sm font-medium text-th-secondary">
          Default points
        </label>
        <input
          id="default_points"
          name="default_points"
          type="number"
          defaultValue="1"
          min="1"
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
        />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add activity'}
      </button>
    </form>
  )
}
