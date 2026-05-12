'use client'

import { useActionState } from 'react'
import { createDomain } from '@/app/actions/domains'

export function AddDomainForm() {
  const [state, formAction, pending] = useActionState(createDomain, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-th-secondary">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Health, Creative, Work"
          required
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="weight" className="text-sm font-medium text-th-secondary">
          Weight <span className="font-normal text-th-faint">(how much this domain matters right now)</span>
        </label>
        <select
          id="weight"
          name="weight"
          defaultValue="3"
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
        >
          <option value="1">1 — Low</option>
          <option value="2">2</option>
          <option value="3">3 — Medium</option>
          <option value="4">4</option>
          <option value="5">5 — High</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="color" className="text-sm font-medium text-th-secondary">
          Color
        </label>
        <input
          id="color"
          name="color"
          type="color"
          defaultValue="#6366f1"
          className="h-10 w-full cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add domain'}
      </button>
    </form>
  )
}
