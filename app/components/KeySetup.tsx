'use client'

// Shared encryption key-setup flow, used both inline on the signup page (where
// the just-typed account password is still in memory) and on /protect (where it
// isn't, so the password path asks). Passkey-first; the recovery code is
// REQUIRED only on the password path — a passkey is its own synced backup, so
// passkey users are merely offered the code as a download.
//
// All key material is built and held in the browser; only WRAPPED blobs + public
// salts are persisted. Spec: docs/specs/private-content-encryption.md

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDek } from '@/app/components/DekProvider'
import {
  buildCoreSlots,
  addPasswordSlot,
  passkeySupported,
  canonicalizeRecoveryCode,
  PasskeyUnsupportedError,
  PrfUnavailableError,
  type CoreSlots,
  type PasskeySlot,
  type WrappedSlot,
} from '@/lib/crypto/keys'
import { registerPasskey } from '@/lib/auth/passkey'
import { persistCoreSlots, persistPasskeySlot } from '@/app/actions/keys'

const btn = 'rounded-xl px-4 py-3 text-center text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50'
export const btnPrimary = `${btn} bg-th-text text-th-bg`
export const btnGhost = `${btn} border border-th-border text-th-text`

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-[22rem]">{children}</div>
    </div>
  )
}

type Step = 'primary' | 'password' | 'recovery'

export function KeySetup({
  password,
  onComplete,
}: {
  userId?: string
  email?: string
  /** The account password, if already in memory (signup path) — reused for the
   *  fallback slot so the user never types a second password. */
  password?: string
  onComplete: () => void
}) {
  const { setDek } = useDek()
  const [step, setStep] = useState<Step>('primary')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reduced, setReduced] = useState(false) // no passkey → weaker setup

  const coreRef = useRef<CoreSlots | null>(null)
  const passkeyRef = useRef<PasskeySlot | null>(null)
  const passwordRef = useRef<WrappedSlot | null>(null)
  const [coreReady, setCoreReady] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)

  const builtRef = useRef(false)
  useEffect(() => {
    if (builtRef.current) return
    builtRef.current = true
    setSupported(passkeySupported())
    buildCoreSlots().then(core => {
      coreRef.current = core
      setRecoveryCode(core.recoveryCode)
      setCoreReady(true)
    })
  }, [])

  async function tryPasskey() {
    const core = coreRef.current
    if (!core) return
    setError(null)
    setBusy(true)
    try {
      // Registers the passkey WITH Supabase Auth (so it's also a login
      // credential) and wraps the DEK into it — one ceremony.
      passkeyRef.current = await registerPasskey(core.dek)
      // Always add the password fallback when the account password is in memory
      // (signup): even a passkey user should be able to unlock with the password
      // they already know, so a lost/un-synced passkey + unsaved code never means
      // total lockout. The honest-operator caveat is accepted for this slot.
      if (password) passwordRef.current = await addPasswordSlot(core.dek, password)
      setStep('recovery')
    } catch (e) {
      if (e instanceof PasskeyUnsupportedError || e instanceof PrfUnavailableError) {
        await fallbackToPassword()
      } else {
        setError('Passkey setup didn’t complete. Try again, or use your password instead.')
      }
    } finally {
      setBusy(false)
    }
  }

  // Fallback entry: if the account password is already in memory (signup),
  // build the slot from it silently; otherwise collect it.
  async function fallbackToPassword() {
    setReduced(true)
    setError(null)
    if (password) {
      const core = coreRef.current
      if (!core) return
      passwordRef.current = await addPasswordSlot(core.dek, password)
      setStep('recovery')
    } else {
      setStep('password')
    }
  }

  async function submitTypedPassword(pw: string) {
    const core = coreRef.current
    if (!core) return
    setError(null)
    setBusy(true)
    try {
      passwordRef.current = await addPasswordSlot(core.dek, pw)
      setStep('recovery')
    } catch {
      setError('Couldn’t set up the password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function finishSetup() {
    const core = coreRef.current
    if (!core) return
    setError(null)
    setBusy(true)
    try {
      const res = await persistCoreSlots({
        recovery: core.recovery,
        password: passwordRef.current ?? undefined,
      })
      if (res.error) throw new Error(res.error)
      if (passkeyRef.current) {
        const pkRes = await persistPasskeySlot(passkeyRef.current, { replaceExisting: true })
        if (pkRes.error) throw new Error(pkRes.error)
      }
      await setDek(core.dek)
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong saving your keys.')
      setBusy(false)
    }
  }

  if (step === 'primary') {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-semibold text-th-text">Protect what you write</h1>
        <p className="mb-4 text-sm leading-relaxed text-th-muted">
          Your labels and journal entries are yours. Onduler locks them so only you can read them.
        </p>
        <p className="mb-6 text-sm leading-relaxed text-th-muted">
          Use Face ID, Touch ID, or your device passkey — it’s the strongest option and there’s
          nothing to remember.
        </p>
        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
        {supported === false ? (
          <p className="mb-4 text-sm text-th-muted">
            This device doesn’t support passkeys. You’ll use your password instead.
          </p>
        ) : (
          <button
            className={btnPrimary + ' w-full'}
            disabled={busy || !coreReady || supported === null}
            onClick={tryPasskey}
          >
            {busy ? 'Setting up…' : coreReady && supported ? 'Choose your passkey' : 'Preparing…'}
          </button>
        )}
        <button
          className={btnGhost + ' mt-3 w-full'}
          disabled={busy || !coreReady}
          onClick={fallbackToPassword}
        >
          Use your password instead
        </button>
      </Shell>
    )
  }

  if (step === 'password') {
    return <PasswordAskStep reduced={reduced} busy={busy} error={error} onSubmit={submitTypedPassword} />
  }

  return (
    <RecoveryStep
      recoveryCode={recoveryCode}
      required={!passkeyRef.current}
      reduced={reduced}
      busy={busy}
      error={error}
      onConfirm={finishSetup}
    />
  )
}

// Only reached on /protect when there's no in-memory password (e.g. a returning
// user adopting encryption). The signup path never shows this — it reuses the
// password already typed.
function PasswordAskStep({
  reduced,
  busy,
  error,
  onSubmit,
}: {
  reduced: boolean
  busy: boolean
  error: string | null
  onSubmit: (pw: string) => void
}) {
  const [pw, setPw] = useState('')
  const ok = pw.length > 0

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-semibold text-th-text">Enter your password</h1>
      <p className="mb-6 text-sm leading-relaxed text-th-muted">
        Enter your account password. Onduler uses it to unlock your private content on this and
        other devices. Nothing extra to remember.
      </p>
      <div className="flex flex-col gap-3">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {reduced && (
          <p className="text-xs text-th-faint">
            Without a passkey, your privacy setup is weaker. You can add a passkey anytime in
            Settings.
          </p>
        )}
        <button className={btnPrimary + ' w-full'} disabled={!ok || busy} onClick={() => onSubmit(pw)}>
          {busy ? 'Setting up…' : 'Continue'}
        </button>
      </div>
    </Shell>
  )
}

function RecoveryStep({
  recoveryCode,
  required,
  reduced,
  busy,
  error,
  onConfirm,
}: {
  recoveryCode: string
  /** Force a save + type-back before continuing (password path only). */
  required: boolean
  reduced: boolean
  busy: boolean
  error: string | null
  onConfirm: () => void
}) {
  const [saved, setSaved] = useState(false)
  const [typed, setTyped] = useState('')
  const [copied, setCopied] = useState(false)
  const matches = canonicalizeRecoveryCode(typed) === canonicalizeRecoveryCode(recoveryCode)

  function download() {
    const blob = new Blob(
      [
        `Onduler recovery code\n\n${recoveryCode}\n\n` +
          `Keep this somewhere safe. It’s the way back into your private content\n` +
          `if you lose your passkey and devices. We can’t recover it for you.\n`,
      ],
      { type: 'text/plain' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'onduler-recovery-code.txt'
    a.click()
    URL.revokeObjectURL(url)
    setSaved(true)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      setSaved(true)
    } catch {
      // clipboard blocked — download still satisfies the save gate
    }
  }

  // Passkey path: offer the code, but Continue is always available.
  if (!required) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-semibold text-th-text">Save your recovery code</h1>
        <p className="mb-5 text-sm leading-relaxed text-th-muted">
          Your passkey is your everyday unlock, and your account password works too. Keep this code
          as a last-resort backup in case you lose both — we can’t recover it for you.
        </p>
        <div className="mb-5 select-all rounded-xl border border-th-border bg-th-surface px-4 py-4 text-center font-mono text-lg tracking-widest text-th-text">
          {recoveryCode}
        </div>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <div className="flex flex-col gap-3">
          <button className={btnGhost + ' w-full'} onClick={download}>
            Download code
          </button>
          <button className={btnGhost + ' w-full'} onClick={copy}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button className={btnPrimary + ' w-full'} disabled={busy} onClick={onConfirm}>
            {busy ? 'Finishing…' : 'Continue'}
          </button>
        </div>
      </Shell>
    )
  }

  // Password path: mandatory save + type-back.
  if (!saved) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-semibold text-th-text">Save your recovery code</h1>
        <p className="mb-5 text-sm leading-relaxed text-th-muted">
          This is your only backup. {reduced ? 'Because you’re using a password, ' : ''}if you forget
          it, your private content can’t be recovered — not even by us. Save it somewhere safe.
        </p>
        <div className="mb-5 select-all rounded-xl border border-th-border bg-th-surface px-4 py-4 text-center font-mono text-lg tracking-widest text-th-text">
          {recoveryCode}
        </div>
        <div className="flex flex-col gap-3">
          <button className={btnPrimary + ' w-full'} onClick={download}>
            Download code
          </button>
          <button className={btnGhost + ' w-full'} onClick={copy}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-semibold text-th-text">Confirm you saved it</h1>
      <p className="mb-5 text-sm leading-relaxed text-th-muted">
        Type your recovery code back in to be sure it’s safe.
      </p>
      <input
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
        value={typed}
        onChange={e => setTyped(e.target.value)}
        className="mb-3 w-full rounded-lg border border-th-border bg-th-surface px-3 py-2 text-center font-mono text-sm tracking-widest text-th-text outline-none focus:border-th-focus"
      />
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <button className={btnPrimary + ' w-full'} disabled={!matches || busy} onClick={onConfirm}>
        {busy ? 'Finishing…' : 'Finish setup'}
      </button>
      <button className="mt-3 w-full text-center text-xs text-th-faint" onClick={() => setSaved(false)}>
        Show the code again
      </button>
    </Shell>
  )
}
