'use client'

// Forgot-password reset, content-encryption aware. Resetting the login password
// does NOT unlock previously-written private content: that content's password
// slot is still wrapped under the OLD password the user no longer has. So after
// the password update, if a password slot exists we re-secure it — the user
// unlocks the DEK with their passkey or recovery code, and we re-wrap the
// password slot under the NEW password. A passkey-only user has nothing to
// re-wrap and skips straight through.
//
// The DEK only ever lives in the browser, so the re-wrap can't be a server step.
// Spec: docs/specs/private-content-encryption.md (step 7 — locked-out reset).

import { useState } from 'react'
import { changePassword } from '@/app/actions/auth'
import { getEncSetupState, getKeyEnvelope, persistPasswordSlot } from '@/app/actions/keys'
import { addPasswordSlot } from '@/lib/crypto/keys'
import { useDek } from '@/app/components/DekProvider'
import { UnlockPanel, type UnlockEnvelope } from '@/app/components/UnlockPanel'

type Step =
  | { name: 'form' }
  | { name: 'resecure'; newPassword: string; envelope: UnlockEnvelope }
  | { name: 'done' }

export default function ResetPasswordPage() {
  const { setDek } = useDek()
  const [step, setStep] = useState<Step>({ name: 'form' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setError(null)
    const newPassword = (formData.get('new_password') as string)?.trim()
    const confirm = (formData.get('confirm_password') as string)?.trim()
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }

    setPending(true)
    try {
      const result = await changePassword(null, formData)
      if (result?.error) {
        setError(result.error)
        return
      }

      // Password updated. Does this account have a password content-slot that
      // the change just stranded? Only fetch the envelope when re-securing is
      // actually needed.
      const enc = await getEncSetupState()
      if (!enc.hasPassword) {
        setStep({ name: 'done' })
        return
      }
      const envelope = await getKeyEnvelope()
      setStep({ name: 'resecure', newPassword, envelope })
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  if (step.name === 'resecure') {
    return (
      <ResecureStep
        newPassword={step.newPassword}
        envelope={step.envelope}
        onUnlocked={setDek}
        onDone={() => setStep({ name: 'done' })}
      />
    )
  }

  if (step.name === 'done') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-[22rem] text-center">
          <h1 className="mb-2 text-2xl font-semibold text-th-text">Password updated</h1>
          <p className="mb-8 text-sm text-th-muted">
            You&apos;re all set.{' '}
            <a href="/dashboard" className="font-medium text-th-text underline underline-offset-4">
              Go to your dashboard
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Set a new password</h1>
        <p className="mb-4 text-sm text-th-muted">
          Choose something you&apos;ll remember this time.
        </p>
        <p className="mb-8 rounded-lg bg-th-surface px-3 py-2 text-xs leading-relaxed text-th-muted">
          Heads up: a new password alone doesn&apos;t unlock your private notes. After this,
          you&apos;ll re-open them with your passkey or recovery code.
        </p>

        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new_password" className="text-sm font-medium text-th-secondary">
              New password
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm_password" className="text-sm font-medium text-th-secondary">
              Confirm password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// After a successful password reset: unlock the DEK (passkey or recovery code),
// then re-wrap the password slot under the new password and persist it. The
// unlocked DEK is also cached via onUnlocked so the rest of the session can read
// content. If the user has neither a passkey nor their recovery code, there's no
// way back into the old content — be honest and let them continue.
function ResecureStep({
  newPassword,
  envelope,
  onUnlocked,
  onDone,
}: {
  newPassword: string
  envelope: UnlockEnvelope
  onUnlocked: (dek: CryptoKey) => Promise<void>
  onDone: () => void
}) {
  const [gaveUp, setGaveUp] = useState(false)

  async function resecure(dek: CryptoKey) {
    // Cache the DEK for this session's reads, then re-wrap the password slot.
    await onUnlocked(dek)
    const slot = await addPasswordSlot(dek, newPassword)
    const res = await persistPasswordSlot(slot)
    if (res.error) {
      // Surfaced inside UnlockPanel (it catches onUnlock throws): the key was
      // right, only the save failed.
      throw new Error('Re-securing your content failed. Try again.')
    }
    onDone()
  }

  if (gaveUp) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-[22rem]">
          <h1 className="mb-3 text-2xl font-semibold text-th-text">Password updated</h1>
          <p className="mb-4 text-sm leading-relaxed text-th-muted">
            Your new password is set, so you can sign in. But without your passkey or recovery code,
            anything you wrote before stays locked — not even we can open it.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-th-muted">
            If you find your passkey or recovery code later, you can unlock from any of your devices.
          </p>
          <a
            href="/dashboard"
            className="block w-full rounded-lg bg-th-btn px-4 py-2 text-center text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover"
          >
            Continue to your dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-3 text-2xl font-semibold text-th-text">Re-open your private content</h1>
        <p className="mb-6 text-sm leading-relaxed text-th-muted">
          Your password is updated. To reconnect your private labels and journal entries to it,
          unlock them once with your passkey or recovery code.
        </p>
        {/* The password slot is wrapped under the OLD password they just forgot,
            so it can't unlock here — offer only passkey + recovery. */}
        <UnlockPanel
          envelope={{ ...envelope, password: null }}
          onUnlock={resecure}
          recoveryLabel="Unlock and re-secure"
        />
        <button
          className="mt-6 w-full text-center text-xs text-th-faint transition-colors hover:text-th-muted"
          onClick={() => setGaveUp(true)}
        >
          I don&apos;t have my passkey or recovery code
        </button>
      </div>
    </div>
  )
}
