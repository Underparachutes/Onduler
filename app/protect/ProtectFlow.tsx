'use client'

// The /protect surface, now also the one-time migration gate. Flow:
//   1. Get a DEK — setup (new envelope) or unlock (re-derive an existing one).
//      Both leave it in DekProvider, which re-renders us.
//   2. DEK in hand + already encrypted  → just unlocking, continue.
//   3. DEK in hand + NOT yet encrypted  → migrate this user's content to
//      ciphertext, flip enc_enabled, then continue.
// Spec: docs/specs/private-content-encryption.md

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDek } from '@/app/components/DekProvider'
import { KeySetup, Shell, btnPrimary, btnGhost } from '@/app/components/KeySetup'
import {
  unlockWithPasskey,
  unlockWithPassword,
  unlockWithRecoveryCode,
  passkeySupported,
} from '@/lib/crypto/keys'
import { runMigration } from './runMigration'
import type { PasskeySlotWire, WrappedSlot as WireSlot } from '@/app/actions/keys'

type Envelope = {
  passkeys: PasskeySlotWire[]
  recovery: WireSlot | null
  password: WireSlot | null
}

type Props = {
  mode: 'setup' | 'unlock'
  nextHref: string
  userId: string
  email: string
  /** The server's view of enc_enabled at load. False → this visit migrates. */
  encEnabled: boolean
  envelope?: Envelope
}

export function ProtectFlow(props: Props) {
  const { dek, loading: dekLoading } = useDek()

  // `DekProvider` lives in the root layout and survives the /dashboard→/protect
  // redirect, so its `loading` can already be false on the client while the
  // server rendered it true — branching on it directly causes a hydration
  // mismatch. Gate on a mount flag instead: SSR and the first client render
  // both show the stable placeholder, and the dek-dependent logic only runs
  // after mount (which also lets the cached-DEK lookup settle, so we never flash
  // the auth UI at an already-unlocked user).
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe mount flag
  useEffect(() => setMounted(true), [])

  if (!mounted || dekLoading) {
    return (
      <Shell>
        <p className="text-sm text-th-muted">Loading…</p>
      </Shell>
    )
  }

  // Step 1 — obtain a DEK. Setup builds one; unlock re-derives it.
  if (!dek) {
    if (props.mode === 'setup') {
      // onComplete is a no-op: setDek (inside KeySetup) updates the context,
      // which re-renders us with `dek` set and carries us to the next step.
      return <KeySetup userId={props.userId} email={props.email} onComplete={() => {}} />
    }
    return <UnlockFlow envelope={props.envelope!} />
  }

  // Step 2 — already ciphertext: we were only here to unlock for reading.
  if (props.encEnabled) return <Done nextHref={props.nextHref} />

  // Step 3 — not yet encrypted: migrate, then continue.
  return <SecuringStep dek={dek} nextHref={props.nextHref} />
}

function Done({ nextHref }: { nextHref: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(nextHref)
  }, [nextHref, router])
  return (
    <Shell>
      <p className="text-sm text-th-muted">Unlocked. Taking you in…</p>
    </Shell>
  )
}

function SecuringStep({ dek, nextHref }: { dek: CryptoKey; nextHref: string }) {
  const router = useRouter()
  const { refreshEncEnabled } = useDek()
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const ranRef = useRef(-1)

  useEffect(() => {
    // The ref guard already runs the migration exactly once across StrictMode's
    // double-invoke (the fiber/ref persists), so we deliberately DON'T use an
    // active/cleanup flag — StrictMode's cleanup would otherwise cancel the only
    // run's navigation and strand the user on this screen even after a
    // successful migration.
    if (ranRef.current === attempt) return
    ranRef.current = attempt
    ;(async () => {
      try {
        await runMigration(dek)
        await refreshEncEnabled()
        router.replace(nextHref)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong securing your content.')
      }
    })()
  }, [dek, nextHref, refreshEncEnabled, router, attempt])

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-semibold text-th-text">Securing your content</h1>
      {!error ? (
        <p className="text-sm leading-relaxed text-th-muted">
          Locking your labels and journal entries so only you can read them. This happens once and
          may take a moment.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-red-500">{error}</p>
          <p className="mb-4 text-xs text-th-muted">
            Nothing was lost — your content is safe. You can retry.
          </p>
          <button
            className={btnPrimary + ' w-full'}
            onClick={() => {
              setError(null)
              setAttempt(a => a + 1)
            }}
          >
            Try again
          </button>
        </>
      )}
    </Shell>
  )
}

// Re-derives the DEK from one unlock slot and hands it to DekProvider. It does
// NOT navigate — once the context has a DEK, ProtectFlow re-renders and decides
// whether to migrate or continue.
function UnlockFlow({ envelope }: { envelope: Envelope }) {
  const { setDek } = useDek()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [secret, setSecret] = useState('')

  async function go(unlock: () => Promise<CryptoKey>) {
    setError(null)
    setBusy(true)
    try {
      await setDek(await unlock())
      // success → context now holds the DEK; ProtectFlow takes over (we unmount).
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
        await setDek(await unlockWithPasskey(pk))
        return
      } catch {
        // try the next registered passkey
      }
    }
    setError('Couldn’t unlock with a passkey on this device.')
    setBusy(false)
  }

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-semibold text-th-text">Unlock your content</h1>
      <p className="mb-6 text-sm leading-relaxed text-th-muted">
        Unlock your private labels and journal entries on this device.
      </p>
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
            Unlock with recovery code
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
    </Shell>
  )
}
