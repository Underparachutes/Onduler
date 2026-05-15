'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { updateGroup, deleteGroup } from '@/app/actions/groups'

type Group = { id: string; name: string; color: string }

type Props = {
  group: Group
  onClose: () => void
}

export function EditGroupForm({ group, onClose }: Props) {
  const updateById = updateGroup.bind(null, group.id)
  const [state, formAction, pending] = useActionState(updateById, null)
  const [color, setColor] = useState(group.color)
  const [confirming, setConfirming] = useState(false)
  const [deleting, startDelete] = useTransition()
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }
  }, [])

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    startDelete(async () => {
      await deleteGroup(group.id)
      onClose()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="name"
          type="text"
          defaultValue={group.name}
          required
          autoFocus
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
        />

        <div className="flex items-center gap-2">
          <label htmlFor="color" className="shrink-0 text-xs text-th-muted">Color</label>
          <input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-th-border bg-th-surface p-1"
          />
        </div>

        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="ml-auto rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <div className="border-t border-th-border pt-4">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs transition-colors disabled:opacity-50 ${confirming ? 'font-medium text-orange-500' : 'text-th-faint hover:text-red-500'}`}
        >
          {deleting ? 'Deleting…' : confirming ? 'Tap again to confirm delete' : 'Delete group'}
        </button>
      </div>
    </div>
  )
}
