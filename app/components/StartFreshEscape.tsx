'use client'

// The door out of the unlock screen for a genuine lockout: the user has lost
// every way to unlock (passkey, password, recovery code), so their encrypted
// content is unrecoverable by anyone — that's the E2EE promise, and its cost.
// Rather than trap them on the unlock overlay forever, offer an honest,
// two-step, irreversible "start fresh" that wipes the unreadable content + key
// material and sends them to set up a clean account. Rare last resort — buried
// behind blunt copy, never a casual button.
//
// Shown inside both the UnlockGate overlay and /protect's unlock flow.
// Spec: docs/specs/private-content-encryption.md (step 7 / Recovery option B).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDek } from '@/app/components/DekProvider'
import { startFreshAfterLockout } from '@/app/actions/keys'

export function StartFreshEscape() {
  const router = useRouter()
  const { refreshEncEnabled, clearDek } = useDek()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setBusy(true)
    setError(null)
    const res = await startFreshAfterLockout()
    if (res.error) {
      setError(res.error)
      setBusy(false)
      return
    }
    // Stand the gate down (enc_enabled is now false, no key) and head to setup.
    await clearDek()
    await refreshEncEnabled()
    router.replace('/protect')
  }

  if (!open) {
    return (
      <button
        className="mt-8 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted"
        onClick={() => setOpen(true)}
      >
        I’ve lost my passkey, password, and recovery code
      </button>
    )
  }

  return (
    <div className="mt-8 rounded-xl border border-th-border p-4">
      <p className="mb-3 text-sm leading-relaxed text-th-muted">
        If you’ve lost all three, your previous private entries can’t be recovered — not by anyone,
        including us. That’s the privacy promise, and its cost.
      </p>
      <p className="mb-4 text-sm leading-relaxed text-th-muted">
        You can start fresh with a clean account and set up new protection. This permanently deletes
        your locked content and can’t be undone.
      </p>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <button
        className="w-full rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
        disabled={busy}
        onClick={go}
      >
        {busy ? 'Starting fresh…' : 'Permanently delete and start fresh'}
      </button>
      <button
        className="mt-3 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-50"
        disabled={busy}
        onClick={() => setOpen(false)}
      >
        Never mind
      </button>
    </div>
  )
}
