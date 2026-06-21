'use client'

import { useActionState, useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateAnchor, deleteAnchor } from '@/app/actions/reflections'
import { useContentCrypto } from '@/app/components/useContentCrypto'
import { useDecryptedReady } from '@/app/components/useDecrypted'
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
  bodyText: rawBodyText,
  promptText: rawPromptText,
  cycleStart,
  cycleEnd,
  thisWeek,
  lastWeek,
}: Props) {
  const router = useRouter()
  // The uncontrolled body textarea and the re-submitted hidden prompt input must
  // seed with PLAINTEXT — seeding a raw enc: blob would double-encrypt on save.
  // So decrypt and gate the form render on `ready`. Inert + ready immediately
  // until rows are ciphertext post-migration.
  const { data: { bodyText, promptText }, ready, locked } = useDecryptedReady({
    bodyText: rawBodyText,
    promptText: rawPromptText,
  })
  const { encryptFormData } = useContentCrypto()
  // Encrypt whichever content fields this anchor type submits; encryptFormData
  // skips the absent ones (free → body/prompt, ceremony → expectation/observation).
  const action = useCallback(
    async (prev: unknown, fd: FormData) => {
      await encryptFormData(fd, ['body_text', 'prompt_text', 'expectation_text', 'observation_text'])
      return updateAnchor(id, prev, fd)
    },
    [encryptFormData, id],
  )
  const [state, formAction, pending] = useActionState(action, null)
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
      const result = await deleteAnchor(id)
      if (result && 'success' in result && result.success) {
        router.push('/anchors/journal')
      }
    })
  }

  const chipBase = 'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97]'
  const chipActive = 'border-th-text bg-th-text text-th-bg'
  const chipIdle = 'border-th-border text-th-muted hover:bg-th-surface'

  // Hold the form until decryption settles so uncontrolled inputs seed with
  // plaintext. Never blocks today (inert decrypt is ready synchronously).
  if (!ready) return <p className="text-xs text-th-muted">Decrypting…</p>

  // Locked: the body/prompt are unreadable on this device, so editing would seed
  // the "🔒 Locked" placeholder. Send them to unlock instead of corrupting it.
  if (locked) return (
    <p className="text-sm leading-relaxed text-th-muted">
      🔒 This anchor is locked on this device. Unlock your content to read or edit it.
    </p>
  )

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
          <p className="break-words rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-2 text-xs italic text-th-secondary">
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
