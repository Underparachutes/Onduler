'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal } from '@/app/actions/goals'

export function AddGoalForm() {
  const [state, action, isPending] = useActionState(createGoal, null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state])

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          name="name"
          placeholder="Goal name"
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
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
      >
        {isPending ? 'Adding…' : 'Add goal'}
      </button>
    </form>
  )
}
