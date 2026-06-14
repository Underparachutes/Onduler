'use client'

import { Suspense, useActionState, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signUp } from '@/app/actions/auth'
import { generateRandomWake } from '@/lib/wakes'
import { WaveField, type WaveLine } from '@/app/components/WaveField'

// The same seeded breathing wake as the landing hero, so a QR arrival and the
// marketing surface feel like one thing. Monochrome on the deep-ocean ground.
const WAKE_PATH = generateRandomWake(42, 7, 80, { x: 100, y: 100 })

const HERO_WAVES: WaveLine[] = [
  { yBase: 0.50, amplitude: 10, frequency: 0.018, speed: 0.0010, phase: 0.0, width: 0.5, opacity: 0.04 },
  { yBase: 0.55, amplitude: 12, frequency: 0.025, speed: 0.0028, phase: 1.4, width: 0.6, opacity: 0.06 },
  { yBase: 0.60, amplitude: 11, frequency: 0.022, speed: 0.0018, phase: 2.6, width: 0.7, opacity: 0.08 },
  { yBase: 0.65, amplitude: 14, frequency: 0.028, speed: 0.0040, phase: 0.8, width: 0.8, opacity: 0.10 },
  { yBase: 0.70, amplitude: 13, frequency: 0.020, speed: 0.0014, phase: 3.2, width: 0.9, opacity: 0.13 },
  { yBase: 0.75, amplitude: 16, frequency: 0.030, speed: 0.0048, phase: 1.9, width: 1.0, opacity: 0.16 },
  { yBase: 0.80, amplitude: 15, frequency: 0.024, speed: 0.0022, phase: 0.3, width: 1.2, opacity: 0.20 },
  { yBase: 0.85, amplitude: 18, frequency: 0.026, speed: 0.0052, phase: 2.8, width: 1.4, opacity: 0.24 },
  { yBase: 0.90, amplitude: 20, frequency: 0.021, speed: 0.0032, phase: 1.1, width: 1.8, opacity: 0.30 },
  { yBase: 0.95, amplitude: 22, frequency: 0.028, speed: 0.0016, phase: 3.6, width: 2.2, opacity: 0.36 },
]

// Step one: explain what Onduler is before any form field appears. The arrival
// from a bulletin-board QR never read the back of the card; this carries that
// copy. Informational only — collects nothing, blocks nothing.
function IntroScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <WaveField lines={HERO_WAVES} />
      </div>

      <div className="relative z-10 flex w-full max-w-[22rem] flex-1 flex-col items-center justify-start py-12">
        {/* Wake */}
        <div className="relative mb-8 h-[200px] w-[200px]">
          <svg
            viewBox="0 0 200 200"
            width={200}
            height={200}
            className="absolute inset-0"
            style={{ filter: 'blur(8px)', opacity: 0.6 }}
          >
            <path
              d={WAKE_PATH}
              fill="var(--th-accent)"
              fillOpacity="0.18"
              stroke="var(--th-accent)"
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
          </svg>
          <svg
            viewBox="0 0 200 200"
            width={200}
            height={200}
            className="absolute inset-0"
            style={{ animation: 'slow-breathe 4s ease-in-out infinite', transformOrigin: 'center' }}
          >
            <path
              d={WAKE_PATH}
              fill="none"
              stroke="var(--th-text)"
              strokeWidth="0.6"
              opacity="0.55"
            />
          </svg>
        </div>

        {/* Tagline */}
        <h1 className="mb-4 text-center font-[family-name:var(--font-manrope)] text-2xl font-semibold tracking-wide text-th-text">
          Every motion leaves a wake.
        </h1>

        {/* Explainer — the back-of-card copy, adapted for screen */}
        <div className="mb-8 flex w-full flex-col gap-4 text-sm leading-relaxed text-th-muted">
          <p>Onduler is a daily tracker for reflection, momentum, and noticing your patterns.</p>
          <p>
            Choose the motions you want to track. Connect them to the swells they
            feed. Watch your wake build over time.
          </p>
          <p>
            Made for people who are curious about what their daily life is actually
            building.
          </p>
        </div>

        {/* CTA */}
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="block rounded-xl bg-th-text px-4 py-3 text-center font-[family-name:var(--font-manrope)] text-sm font-medium text-th-bg transition-all active:scale-[0.97]"
          >
            Get started
          </button>
          <p className="text-center text-sm text-th-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-th-text underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function SignupForm({ utmSource }: { utmSource: string }) {
  const [state, action, pending] = useActionState(signUp, undefined)

  if (state && 'emailSent' in state && state.emailSent) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-[22rem]">
          <h1 className="mb-2 text-2xl font-semibold text-th-text">Check your email</h1>
          <p className="mb-8 text-sm text-th-muted">
            We sent a confirmation link to <span className="text-th-text">{state.email}</span>. Open it to finish setting up your account, then sign in.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-th-btn px-4 py-2 text-center text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
          >
            Back to sign in
          </Link>
          <p className="mt-6 text-center text-xs text-th-faint">
            Didn&apos;t get it? Check your spam folder, or{' '}
            <a href="/signup" className="underline underline-offset-4 hover:text-th-muted">try a different email</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Create your account
        </h1>
        <p className="mb-8 text-sm text-th-muted">Start riding your tides</p>

        <form action={action} className="flex flex-col gap-4">
          {/* Acquisition source rides through as a hidden field — the intro step
              kept us on the same URL, so utm_source is still present at submit. */}
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

function SignupFlow() {
  const searchParams = useSearchParams()
  const utmSource = searchParams.get('utm_source') ?? ''
  // Default to the intro for every visitor. ?step=form lands straight on the
  // form (shareable skip link / landing-page Get started, if we ever point it
  // here). We advance intro -> form via local state, never navigating, so the
  // UTM params stay in the URL through to submit.
  const [step, setStep] = useState<'intro' | 'form'>(
    searchParams.get('step') === 'form' ? 'form' : 'intro',
  )

  if (step === 'intro') {
    return <IntroScreen onContinue={() => setStep('form')} />
  }

  return <SignupForm utmSource={utmSource} />
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupFlow />
    </Suspense>
  )
}
