'use client'

import { useActionState, useEffect, useTransition } from 'react'
import { updateMotion, deleteMotion } from '@/app/actions/motions'

type Motion = { id: string; name: string; default_points: number; default_hours: number }
type State = { error?: string; success?: boolean } | null

export function MotionEditRow({
  motion,
  onClose,
}: {
  motion: Motion
  onClose: () => void
}) {
  const updateById = updateMotion.bind(null, motion.id)
  const [state, formAction, pending] = useActionState<State, FormData>(updateById, null)
  const [deleting, startDelete] = useTransition()

  useEffect(() => {
    if (state?.success) onClose()
  }, [state, onClose])

  return (
    <div className="rounded-lg border border-th-border px-4 py-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="name"
          defaultValue={motion.name}
          autoFocus
          required
          className="rounded border border-th-border bg-th-surface px-3 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
        />
        <div className="flex items-center gap-3">
          <label className="text-xs text-th-muted shrink-0">pts</label>
          <input
            name="default_points"
            type="number"
            defaultValue={motion.default_points}
            min="1"
            className="w-16 rounded border border-th-border bg-th-surface px-3 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          />
          <label className="text-xs text-th-muted shrink-0">hrs</label>
          <input
            name="default_hours"
            type="number"
            defaultValue={motion.default_hours}
            min="0.25"
            step="0.25"
            className="w-16 rounded border border-th-border bg-th-surface px-3 py-1.5 text-sm text-th-text outline-none focus:border-th-focus"
          />
        </div>
        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending || deleting}
            className="rounded-lg bg-th-btn px-3 py-1.5 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending || deleting}
            className="rounded-lg border border-th-border px-3 py-1.5 text-xs text-th-muted transition-colors hover:bg-th-surface disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => startDelete(async () => { await deleteMotion(motion.id); onClose() })}
            disabled={pending || deleting}
            className="ml-auto text-xs text-th-faint transition-colors hover:text-red-500 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </form>
    </div>
  )
}
