'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signUp } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { KeySetup } from '@/app/components/KeySetup'
import { OnboardingCarousel } from '@/app/components/onboarding/OnboardingCarousel'

function SignupForm({
  utmSource,
  email,
  password,
  setEmail,
  setPassword,
  onEmailSent,
}: {
  utmSource: string
  email: string
  password: string
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  onEmailSent: () => void
}) {
  const [state, action, pending] = useActionState(signUp, undefined)

  // The account is created and the confirmation code is on its way — advance to
  // the code step without leaving the page, so the password stays in memory.
  useEffect(() => {
    if (state && 'emailSent' in state && state.emailSent) onEmailSent()
  }, [state, onEmailSent])

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Create your account</h1>
        <p className="mb-8 text-sm text-th-muted">Start riding your tides</p>

        <form action={action} className="flex flex-col gap-4">
          {/* Acquisition source rides through as a hidden field. */}
          <input type="hidden" name="utm_source" value={utmSource} />

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

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-th-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-th-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-th-text underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function CodeStep({ email, onVerified }: { email: string; onVerified: (userId: string) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  // Accept whatever length the project's "Email OTP Length" setting produces
  // (Supabase defaults to 6; this project is on 8) — don't hardcode a length.
  const clean = code.replace(/\D/g, '')

  async function verify() {
    setError(null)
    setBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({ email, token: clean, type: 'signup' })
      if (error) {
        setError(error.message)
        setBusy(false)
        return
      }
      const uid = data.user?.id ?? data.session?.user?.id
      if (!uid) {
        setError('Couldn’t confirm that code. Try again.')
        setBusy(false)
        return
      }
      onVerified(uid)
    } catch {
      setError('Something went wrong. Try again.')
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      const supabase = createClient()
      await supabase.auth.resend({ type: 'signup', email })
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
          We sent a code to <span className="text-th-text">{email}</span>. Enter it here to
          confirm your account — you can grab it from any device.
        </p>

        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter code"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
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

type Step = 'intro' | 'form' | 'code' | 'setup'

function SignupFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const utmSource = searchParams.get('utm_source') ?? ''

  const [step, setStep] = useState<Step>(searchParams.get('step') === 'form' ? 'form' : 'intro')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userId, setUserId] = useState('')

  if (step === 'intro') return <OnboardingCarousel onGetStarted={() => setStep('form')} />

  if (step === 'form') {
    return (
      <SignupForm
        utmSource={utmSource}
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        onEmailSent={() => setStep('code')}
      />
    )
  }

  if (step === 'code') {
    return (
      <CodeStep
        email={email}
        onVerified={uid => {
          setUserId(uid)
          setStep('setup')
        }}
      />
    )
  }

  // Inline key setup — the password is still in memory, so the fallback path
  // reuses it without a second prompt.
  return (
    <KeySetup
      userId={userId}
      email={email}
      password={password}
      onComplete={() => router.replace('/onboarding')}
    />
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupFlow />
    </Suspense>
  )
}
