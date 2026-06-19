'use client'

// Password reset, code-based (OTP) — NOT a magic link. Link-based PKCE resets
// break on phones: tapping the email link opens an in-app browser with its own
// cookie jar, so the PKCE verifier set when the request was made isn't there and
// the exchange fails. A typed code has no device/cookie binding — request on one
// device, finish on any. Mirrors the signup OTP flow.
//
// Flow: email → 6–8 digit code (verifyOtp type:'recovery' sets a session) →
// navigate to /reset-password, which sets the new password and re-secures the
// content-encryption password slot. Spec: docs/specs/private-content-encryption.md

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')

  if (step === 'code') {
    return <CodeStep email={email} onVerified={() => router.push('/reset-password')} />
  }

  return <EmailStep email={email} setEmail={setEmail} onSent={() => setStep('code')} />
}

function EmailStep({
  email,
  setEmail,
  onSent,
}: {
  email: string
  setEmail: (v: string) => void
  onSent: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function send(formData: FormData) {
    setError(null)
    setPending(true)
    try {
      const result = await resetPassword(null, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSent()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Reset your password</h1>
        <p className="mb-8 text-sm text-th-muted">
          Enter your email and we&apos;ll send you a code.
        </p>

        <form action={send} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-th-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send code'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-th-muted">
          Remember it?{' '}
          <Link href="/login" className="font-medium text-th-text underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function CodeStep({ email, onVerified }: { email: string; onVerified: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  // Accept whatever length the project's "Email OTP Length" produces (this
  // project is on 8) — don't hardcode 6.
  const clean = code.replace(/\D/g, '')

  async function verify() {
    setError(null)
    setBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({ email, token: clean, type: 'recovery' })
      if (error) {
        setError(error.message)
        setBusy(false)
        return
      }
      if (!data.session) {
        setError('Couldn’t confirm that code. Try again.')
        setBusy(false)
        return
      }
      // Session is set (cookies). /reset-password takes over: new password +
      // re-secure the encryption password slot.
      onVerified()
    } catch {
      setError('Something went wrong. Try again.')
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      // No dedicated resend for recovery — re-issuing the reset re-sends the code.
      const fd = new FormData()
      fd.set('email', email)
      await resetPassword(null, fd)
      setResent(true)
    } catch {
      setError('Couldn’t resend the code.')
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Enter your code</h1>
        <p className="mb-8 text-sm text-th-muted">
          We sent a code to <span className="text-th-text">{email}</span>. Enter it here — you can
          grab it from any device.
        </p>

        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder="Enter code"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="mb-3 w-full rounded-lg border border-th-border bg-th-surface px-3 py-3 text-center font-mono text-2xl tracking-[0.3em] text-th-text outline-none focus:border-th-focus"
        />
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={verify}
          disabled={busy || clean.length < 6}
          className="w-full rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
        >
          {busy ? 'Confirming…' : 'Confirm'}
        </button>

        <p className="mt-6 text-center text-sm text-th-muted">
          {resent ? (
            'New code sent.'
          ) : (
            <button onClick={resend} className="font-medium text-th-text underline underline-offset-4">
              Resend code
            </button>
          )}
        </p>
      </div>
    </div>
  )
}
