'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAnchor, deleteFreeAnchor } from '@/app/actions/reflections'
import { formatWeekLabel } from '@/lib/cycles'

type Cycle = { cycleStart: string; cycleEnd: string }

type Props = {
  id: string
  bodyText: string
  promptText: string | null
  cycleStart: string | null
  cycleEnd: string | null
  thisWeek: Cycle
  lastWeek: Cycle
}

type CycleChoice = 'this' | 'last' | 'none' | 'custom'

export function EditAnchorForm({
  id,
  bodyText,
  promptText,
  cycleStart,
  cycleEnd,
  thisWeek,
  lastWeek,
}: Props) {
  const router = useRouter()
  const boundUpdate = updateAnchor.bind(null, id)
  const [state, formAction, pending] = useActionState(boundUpdate, null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, startDelete] = useTransition()

  const initialChoice: CycleChoice = !cycleStart || !cycleEnd
    ? 'none'
    : cycleStart === thisWeek.cycleStart
    ? 'this'
    : cycleStart === lastWeek.cycleStart
    ? 'last'
    : 'custom'

  const [choice, setChoice] = useState<CycleChoice>(initialChoice)

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      router.push('/anchors/journal')
    }
  }, [state, router])

  const submittedCycleStart =
    choice === 'this' ? thisWeek.cycleStart
    : choice === 'last' ? lastWeek.cycleStart
    : choice === 'custom' ? (cycleStart ?? '')
    : ''
  const submittedCycleEnd =
    choice === 'this' ? thisWeek.cycleEnd
    : choice === 'last' ? lastWeek.cycleEnd
    : choice === 'custom' ? (cycleEnd ?? '')
    : ''

  async function onDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    startDelete(async () => {
      const result = await deleteFreeAnchor(id)
      if (result && 'success' in result && result.success) {
        router.push('/anchors/journal')
      }
    })
  }

  const chipBase = 'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]'
  const chipActive = 'border-th-text bg-th-text text-th-bg'
  const chipIdle = 'border-th-border text-th-muted hover:bg-th-surface'

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-th-muted">Edit anchor</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="cycle_start" value={submittedCycleStart} />
        <input type="hidden" name="cycle_end" value={submittedCycleEnd} />
        <input type="hidden" name="prompt_text" value={promptText ?? ''} />

        {promptText && (
          <p className="rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-2 text-xs italic text-th-secondary">
            {promptText}
          </p>
        )}

        <textarea
          name="body_text"
          defaultValue={bodyText}
          required
          autoFocus
          rows={6}
          className="resize-none rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
        />

        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-th-muted">Anchored to</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setChoice('this')}
              className={`${chipBase} ${choice === 'this' ? chipActive : chipIdle}`}
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => setChoice('last')}
              className={`${chipBase} ${choice === 'last' ? chipActive : chipIdle}`}
            >
              Last week
            </button>
            <button
              type="button"
              onClick={() => setChoice('none')}
              className={`${chipBase} ${choice === 'none' ? chipActive : chipIdle}`}
            >
              No cycle
            </button>
            {initialChoice === 'custom' && (
              <button
                type="button"
                onClick={() => setChoice('custom')}
                className={`${chipBase} ${choice === 'custom' ? chipActive : chipIdle}`}
              >
                Original
              </button>
            )}
          </div>
          <p className="text-[10px] text-th-faint">
            {choice === 'this' && formatWeekLabel(thisWeek)}
            {choice === 'last' && formatWeekLabel(lastWeek)}
            {choice === 'none' && 'Untethered'}
            {choice === 'custom' && cycleStart && cycleEnd && formatWeekLabel({ cycleStart, cycleEnd })}
          </p>
        </div>

        {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="mt-8 border-t border-th-border-soft pt-6">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-xs text-th-faint transition-colors hover:text-red-500 active:scale-[0.97] disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : confirmingDelete ? 'Tap again to confirm delete' : 'Delete anchor'}
        </button>
      </div>
    </>
  )
}
