'use client'

import { useActionState } from 'react'
import { createActivity } from '@/app/actions/activities'

export function AddActivityForm({ domainId }: { domainId: string }) {
  const createActivityForDomain = createActivity.bind(null, domainId)
  const [state, formAction, pending] = useActionState(createActivityForDomain, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Activity name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Morning run, Cook a meal"
          required
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="default_points" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Default points
        </label>
        <input
          id="default_points"
          name="default_points"
          type="number"
          defaultValue="1"
          min="1"
          max="10"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Adding…' : 'Add activity'}
      </button>
    </form>
  )
}
