'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { createGroup } from '@/app/actions/groups'
import { useContentCrypto } from '@/app/components/useContentCrypto'
import { detectMode, getRandomThemeAccent } from '@/lib/theme-colors'

type Props = {
  onClose: () => void
}

export function AddGroupForm({ onClose }: Props) {
  const { encryptFormData } = useContentCrypto()
  // Encrypt the content field client-side before the server action sees it.
  const action = useCallback(
    async (prev: unknown, fd: FormData) => {
      await encryptFormData(fd, ['name'])
      return createGroup(prev, fd)
    },
    [encryptFormData],
  )
  const [state, formAction, pending] = useActionState(action, null)
  const [color, setColor] = useState('#6366f1')

  // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM read for theme on mount
  useEffect(() => { setColor(getRandomThemeAccent(document.documentElement.dataset.theme ?? 'biarritz', detectMode())) }, [])

  useEffect(() => {
    if (state && 'success' in state && state.success) onClose()
  }, [state, onClose])

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="brand-text text-xs uppercase tracking-widest text-th-muted">Onduler</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="name"
          type="text"
          placeholder="Bucket name"
          required
          autoFocus
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2.5 text-base text-th-text outline-none focus:border-th-focus"
        />
        <p className="text-xs text-th-muted">
          Buckets are how your motions cluster in your day. Name them by context (Morning, Evening, At work, Saturday) or however works best for you.
        </p>

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

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-th-btn py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Save'}
        </button>
      </form>
    </>
  )
}
