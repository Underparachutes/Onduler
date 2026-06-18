'use client'

// The /protect surface. Setup mode delegates to the shared <KeySetup> (no
// in-memory password here, so its password path asks). Unlock mode lets a
// returning user with an uncached DEK re-derive it. Latent in Phase 2 — nothing
// routes here in unlock mode yet since no content is encrypted — but ready for
// Phase 4. Spec: docs/specs/private-content-encryption.md

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDek } from '@/app/components/DekProvider'
import { KeySetup, Shell, btnPrimary, btnGhost } from '@/app/components/KeySetup'
import {
  unlockWithPasskey,
  unlockWithPassword,
  unlockWithRecoveryCode,
  passkeySupported,
} from '@/lib/crypto/keys'
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
  envelope?: Envelope
}

export function ProtectFlow(props: Props) {
  const router = useRouter()

  if (props.mode === 'setup') {
    return (
      <KeySetup
        userId={props.userId}
        email={props.email}
        onComplete={() => router.replace(props.nextHref)}
      />
    )
  }

  return <UnlockFlow nextHref={props.nextHref} envelope={props.envelope!} router={router} />
}

function UnlockFlow({
  nextHref,
  envelope,
  router,
}: {
  nextHref: string
  envelope: Envelope
  router: ReturnType<typeof useRouter>
}) {
  const { dek, loading: dekLoading, setDek } = useDek()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [secret, setSecret] = useState('')

  // Already unlocked this session (cache hydrated) → straight through.
  useEffect(() => {
    if (!dekLoading && dek) router.replace(nextHref)
  }, [dek, dekLoading, nextHref, router])

  async function go(unlock: () => Promise<CryptoKey>) {
    setError(null)
    setBusy(true)
    try {
      await setDek(await unlock())
      router.replace(nextHref)
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
        router.replace(nextHref)
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
