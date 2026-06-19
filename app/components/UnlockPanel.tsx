'use client'

// Shared content-unlock surface: re-derive the DEK from whichever slot the user
// has on this device — passkey, password, or recovery code. Used by /protect
// (returning users on a fresh device) and by /reset-password (re-securing the
// password slot after a forgotten-password reset). The unwrapped DEK is handed
// to `onUnlock`; the panel does NOT navigate or touch the DekProvider itself, so
// each caller decides what to do with the key (cache it, re-wrap a slot, both).
//
// All crypto runs in the browser. Only WRAPPED blobs + public salts come in via
// the envelope. Spec: docs/specs/private-content-encryption.md (step 7).

import { useState } from 'react'
import {
  unlockWithPasskey,
  unlockWithPassword,
  unlockWithRecoveryCode,
  passkeySupported,
} from '@/lib/crypto/keys'
import { btnPrimary, btnGhost } from '@/app/components/KeySetup'
import type { PasskeySlotWire, WrappedSlot } from '@/app/actions/keys'

export type UnlockEnvelope = {
  passkeys: PasskeySlotWire[]
  recovery: WrappedSlot | null
  password: WrappedSlot | null
}

export function UnlockPanel({
  envelope,
  onUnlock,
  recoveryLabel = 'Unlock with recovery code',
}: {
  envelope: UnlockEnvelope
  /** Called with the unwrapped DEK. May throw to surface an error in the panel
   *  (e.g. a downstream re-wrap failed) — the slot itself unlocked fine. */
  onUnlock: (dek: CryptoKey) => void | Promise<void>
  recoveryLabel?: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [secret, setSecret] = useState('')

  // Unlock via one slot, then hand the DEK off. A thrown onUnlock surfaces a
  // distinct message: the key was right, the follow-up step failed.
  async function go(unlock: () => Promise<CryptoKey>) {
    setError(null)
    setBusy(true)
    try {
      const dek = await unlock()
      try {
        await onUnlock(dek)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unlocked, but the next step failed.')
        setBusy(false)
      }
    } catch {
      setError('That didn’t unlock your content. Try again.')
      setBusy(false)
    }
  }

  async function unlockPasskey() {
    setError(null)
    setBusy(true)
    for (const pk of envelope.passkeys) {
      try {
        const dek = await unlockWithPasskey(pk)
        await onUnlock(dek)
        return
      } catch {
        // try the next registered passkey
      }
    }
    setError('Couldn’t unlock with a passkey on this device.')
    setBusy(false)
  }

  return (
    <>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {!showRecovery && envelope.passkeys.length > 0 && passkeySupported() && (
        <button className={btnPrimary + ' mb-3 w-full'} disabled={busy} onClick={unlockPasskey}>
          {busy ? 'Unlocking…' : 'Unlock with passkey'}
        </button>
      )}

      {!showRecovery && envelope.password && (
        <div className="mb-3 flex flex-col gap-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
          />
          <button
            className={btnGhost + ' w-full'}
            disabled={busy || !secret}
            onClick={() => go(() => unlockWithPassword(secret, envelope.password!))}
          >
            Unlock with password
          </button>
        </div>
      )}

      {showRecovery && envelope.recovery && (
        <div className="mb-3 flex flex-col gap-3">
          <input
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-center font-mono text-sm tracking-widest text-th-text outline-none focus:border-th-focus"
          />
          <button
            className={btnPrimary + ' w-full'}
            disabled={busy || !secret}
            onClick={() => go(() => unlockWithRecoveryCode(secret, envelope.recovery!))}
          >
            {recoveryLabel}
          </button>
        </div>
      )}

      {envelope.recovery && (
        <button
          className="mt-2 w-full text-center text-xs text-th-faint"
          onClick={() => {
            setShowRecovery(s => !s)
            setSecret('')
            setError(null)
          }}
        >
          {showRecovery ? 'Back to other options' : 'Use my recovery code instead'}
        </button>
      )}
    </>
  )
}
