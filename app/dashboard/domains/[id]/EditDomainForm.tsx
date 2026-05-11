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
        <label htmlFor="edit-name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          id="edit-name"
          name="name"
          type="text"
          defaultValue={domain.name}
          required
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-weight" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Weight
        </label>
        <select
          id="edit-weight"
          name="weight"
          defaultValue={domain.weight}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="1">1 — Low</option>
          <option value="2">2</option>
          <option value="3">3 — Medium</option>
          <option value="4">4</option>
          <option value="5">5 — High</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="edit-color" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Color
        </label>
        <input
          id="edit-color"
          name="color"
          type="color"
          defaultValue={domain.color}
          className="h-10 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
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
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
