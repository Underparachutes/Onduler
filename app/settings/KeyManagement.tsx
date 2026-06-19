'use client'

// Settings → Privacy: manage the unlock slots that protect your private content.
// View what's enrolled, add a passkey (another device), and turn the password
// fallback on or off. All crypto runs in the browser — the DEK never leaves it,
// and only WRAPPED blobs reach the server. Adding a slot needs the DEK in memory
// (so the content must be unlocked); removing one doesn't.
//
// Guard rail: never drop below one primary unlock (passkey or password). Recovery
// is a backup, not a day-to-day unlock, so it can't be the last thing standing.
// Spec: docs/specs/private-content-encryption.md (step 7 — slot management).

import { useEffect, useState } from 'react'
import { useDek } from '@/app/components/DekProvider'
import {
  addPasswordSlot,
  buildRecoverySlot,
  passkeySupported,
  PasskeyUnsupportedError,
  PrfUnavailableError,
  type WrappedSlot,
} from '@/lib/crypto/keys'
import { registerPasskey } from '@/lib/auth/passkey'
import {
  getEncSetupState,
  getKeyEnvelope,
  persistPasskeySlot,
  persistPasswordSlot,
  persistRecoverySlot,
  removePasskeySlot,
  removePasswordSlot,
  type EncSetupState,
} from '@/app/actions/keys'

type PasskeyRow = { credentialId: string; label: string | null }

export function KeyManagement() {
  const { dek } = useDek()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<EncSetupState | null>(null)
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null) // 'password' | credentialId
  const [showPwForm, setShowPwForm] = useState(false)
  const [pw, setPw] = useState('')
  // Recovery-code regeneration: hold the new code + its (not-yet-persisted) slot
  // so the OLD code stays valid until the user confirms they saved the new one.
  const [newCode, setNewCode] = useState<{ code: string; slot: WrappedSlot } | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  async function refresh() {
    const [s, env] = await Promise.all([getEncSetupState(), getKeyEnvelope()])
    setState(s)
    setPasskeys(env.passkeys.map(p => ({ credentialId: p.credentialId, label: p.label ?? null })))
  }

  useEffect(() => {
    let active = true
    Promise.all([getEncSetupState(), getKeyEnvelope()])
      .then(([s, env]) => {
        if (!active) return
        setState(s)
        setPasskeys(env.passkeys.map(p => ({ credentialId: p.credentialId, label: p.label ?? null })))
      })
      .catch(() => { if (active) setError('Couldn’t load your privacy settings.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // After any slot change, refresh so the guard logic and counts stay honest.
  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
      setConfirmRemove(null)
    }
  }

  async function addPasskey() {
    if (!dek) { setError('Unlock your private content first, then add a passkey.'); return }
    await run(async () => {
      try {
        const slot = await registerPasskey(dek)
        const res = await persistPasskeySlot(slot, { replaceExisting: false })
        if (res.error) throw new Error(res.error)
        setNotice('Passkey added.')
      } catch (e) {
        if (e instanceof PasskeyUnsupportedError) throw new Error('This device doesn’t support passkeys.')
        if (e instanceof PrfUnavailableError) throw new Error('That passkey can’t protect your content. Try a different one.')
        throw e
      }
    })
  }

  async function enablePassword() {
    if (!dek) { setError('Unlock your private content first, then add a password.'); return }
    const value = pw.trim()
    if (value.length < 6) { setError('Use at least 6 characters — your account password.'); return }
    await run(async () => {
      const slot = await addPasswordSlot(dek, value)
      const res = await persistPasswordSlot(slot)
      if (res.error) throw new Error(res.error)
      setShowPwForm(false)
      setPw('')
      setNotice('Password fallback enabled.')
    })
  }

  async function disablePassword() {
    // Don't strip the last primary unlock.
    if (passkeys.length === 0) {
      setError('Add a passkey first — you’d have no way to unlock without the password.')
      setConfirmRemove(null)
      return
    }
    await run(async () => {
      const res = await removePasswordSlot()
      if (res.error) throw new Error(res.error)
      setNotice('Password fallback removed.')
    })
  }

  async function removeOnePasskey(credentialId: string) {
    if (passkeys.length <= 1 && !state?.hasPassword) {
      setError('This is your only unlock. Add another passkey or a password first.')
      setConfirmRemove(null)
      return
    }
    await run(async () => {
      const res = await removePasskeySlot(credentialId)
      if (res.error) throw new Error(res.error)
      setNotice('Passkey removed.')
    })
  }

  // Mint a fresh recovery code (needs the DEK in memory). Build it client-side
  // and show it; only persist — invalidating the old code — once the user
  // confirms they saved it.
  async function regenerateCode() {
    if (!dek) { setError('Unlock your private content first, then regenerate your code.'); return }
    setError(null)
    setNotice(null)
    setCodeCopied(false)
    try {
      const { recoveryCode, recovery } = await buildRecoverySlot(dek)
      setNewCode({ code: recoveryCode, slot: recovery })
    } catch {
      setError('Couldn’t generate a new code. Try again.')
    }
  }

  function downloadCode(code: string) {
    const blob = new Blob(
      [
        `Onduler recovery code\n\n${code}\n\n` +
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
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCodeCopied(true)
    } catch {
      // clipboard blocked — download still works
    }
  }

  // Confirm: persist the new slot (old code dies here) and clear the local copy.
  async function confirmNewCode() {
    if (!newCode) return
    await run(async () => {
      const res = await persistRecoverySlot(newCode.slot)
      if (res.error) throw new Error(res.error)
      setNewCode(null)
      setCodeCopied(false)
      setNotice('New recovery code saved. Your old code no longer works.')
    })
  }

  if (loading) {
    return <p className="px-4 py-3 text-xs text-th-faint">Loading…</p>
  }

  // No keys yet (shouldn't happen for an onboarded user — the encryption gate
  // sets them up before Settings is reachable — but degrade gracefully).
  if (!state?.hasRecovery) {
    return (
      <p className="px-4 py-3 text-xs text-th-muted">
        Private-content encryption isn’t set up on this account yet.
      </p>
    )
  }

  const locked = !dek
  const canAddPasskey = passkeySupported()

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <p className="text-xs leading-relaxed text-th-muted">
        Your labels and journal entries are locked so only you can read them. These are the ways
        you can unlock them.
      </p>

      {locked && (
        <p className="rounded-lg bg-th-surface px-3 py-2 text-xs text-th-faint">
          Unlock your private content to add a passkey or password.
        </p>
      )}

      {/* Passkeys */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-th-text">Passkeys</p>
        {passkeys.length === 0 ? (
          <p className="text-xs text-th-faint">None yet.</p>
        ) : (
          passkeys.map((p, i) => (
            <div key={p.credentialId} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-th-secondary">{p.label || `Passkey ${i + 1}`}</span>
              {confirmRemove === p.credentialId ? (
                <button
                  onClick={() => removeOnePasskey(p.credentialId)}
                  disabled={busy}
                  className="text-xs font-medium text-red-500 disabled:opacity-40"
                >
                  Confirm remove
                </button>
              ) : (
                <button
                  onClick={() => { setConfirmRemove(p.credentialId); setError(null); setNotice(null) }}
                  className="text-xs text-th-faint transition-colors hover:text-th-muted"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
        {canAddPasskey && (
          <button
            onClick={addPasskey}
            disabled={busy || locked}
            className="self-start text-sm text-th-secondary hover:underline disabled:opacity-40"
          >
            {busy ? 'Working…' : 'Add a passkey'}
          </button>
        )}
      </div>

      {/* Password fallback */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-th-text">Password fallback</p>
            <p className="text-xs text-th-muted">
              {state.hasPassword ? 'On — your account password can unlock content.' : 'Off — passkey only.'}
            </p>
          </div>
          {state.hasPassword ? (
            confirmRemove === 'password' ? (
              <button
                onClick={disablePassword}
                disabled={busy}
                className="text-xs font-medium text-red-500 disabled:opacity-40"
              >
                Confirm remove
              </button>
            ) : (
              <button
                onClick={() => { setConfirmRemove('password'); setError(null); setNotice(null) }}
                className="text-xs text-th-faint transition-colors hover:text-th-muted"
              >
                Remove
              </button>
            )
          ) : (
            !showPwForm && (
              <button
                onClick={() => { setShowPwForm(true); setError(null); setNotice(null) }}
                disabled={locked}
                className="text-sm text-th-secondary hover:underline disabled:opacity-40"
              >
                Enable
              </button>
            )
          )}
        </div>

        {showPwForm && !state.hasPassword && (
          <div className="flex flex-col gap-2">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Your account password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
            <p className="text-xs text-th-faint">
              Use the same password you sign in with. It becomes a second way to unlock your content.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={enablePassword}
                disabled={busy}
                className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
              >
                {busy ? 'Enabling…' : 'Enable'}
              </button>
              <button
                onClick={() => { setShowPwForm(false); setPw(''); setError(null) }}
                className="text-xs text-th-faint transition-colors hover:text-th-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recovery code — view status + regenerate */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-th-text">Recovery code</p>
            <p className="text-xs text-th-muted">Saved during setup. It’s your last way back in.</p>
          </div>
          {!newCode && (
            <button
              onClick={regenerateCode}
              disabled={busy || locked}
              className="shrink-0 text-sm text-th-secondary hover:underline disabled:opacity-40"
            >
              Regenerate
            </button>
          )}
        </div>

        {newCode && (
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-th-faint">
              Save this new code. It replaces your old one — the old code stops working once you
              confirm. We can’t recover it for you.
            </p>
            <div className="select-all rounded-xl border border-th-border bg-th-surface px-4 py-3 text-center font-mono text-base tracking-widest text-th-text">
              {newCode.code}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadCode(newCode.code)}
                className="rounded-lg border border-th-border px-3 py-2 text-xs font-medium text-th-text"
              >
                Download
              </button>
              <button
                onClick={() => copyCode(newCode.code)}
                className="rounded-lg border border-th-border px-3 py-2 text-xs font-medium text-th-text"
              >
                {codeCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmNewCode}
                disabled={busy}
                className="rounded-lg bg-th-btn px-3 py-2 text-xs font-medium text-th-btn-text disabled:opacity-40"
              >
                {busy ? 'Saving…' : 'I saved it'}
              </button>
              <button
                onClick={() => { setNewCode(null); setCodeCopied(false) }}
                disabled={busy}
                className="text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {notice && <p className="text-xs text-green-600">{notice}</p>}
    </div>
  )
}
