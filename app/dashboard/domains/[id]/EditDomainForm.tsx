'use client'

import { useActionState } from 'react'
import { updateDomain } from '@/app/actions/domains'

type Domain = {
  id: string
  name: string
  weight: number
  color: string
}

export function EditDomainForm({ domain }: { domain: Domain }) {
  const updateDomainById = updateDomain.bind(null, domain.id)
  const [state, formAction, pending] = useActionState(updateDomainById, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="edit-name" className="text-sm font-medium text-th-secondary">
          Name
        </label>
        <input
          id="edit-name"
          name="name"
          type="text"
          defaultValue={domain.name}
          required
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-weight" className="text-sm font-medium text-th-secondary">
          Weight
        </label>
        <select
          id="edit-weight"
          name="weight"
          defaultValue={domain.weight}
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
        <label htmlFor="edit-color" className="text-sm font-medium text-th-secondary">
          Color
        </label>
        <input
          id="edit-color"
          name="color"
          type="color"
          defaultValue={domain.color}
          className="h-10 w-full cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-emerald-500">Saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
