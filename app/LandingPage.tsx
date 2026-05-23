'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { generateRandomWake } from '@/lib/wakes'
import { WaveField, type WaveLine } from '@/app/components/WaveField'
import { joinWaitlist } from '@/app/actions/waitlist'

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

export function LandingPage({ source }: { source: string | null }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await joinWaitlist(email, null, source)
      if (result.ok) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

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
        <h1
          className="mb-4 text-center font-[family-name:var(--font-manrope)] text-2xl font-semibold tracking-wide text-th-text"
        >
          Every motion leaves a wake.
        </h1>

        {/* Paragraph */}
        <p className="mb-8 w-full text-justify text-sm leading-relaxed text-th-muted">
          Onduler tracks what you actually do through your daily motions.
          You set up your daily motions to feed your swells. Over time, it
          shows you the wake they create. There will be times when you need
          to step back. That&apos;s life. Onduler will be there when
          you&apos;re ready to get back on the board.
        </p>

        {/* Email capture */}
        {submitted ? (
          <div className="w-full rounded-xl border border-th-border bg-th-surface/60 px-5 py-5 text-center">
            <p className="text-sm font-medium text-th-text">You&apos;re on the list.</p>
            <p className="mt-1.5 text-xs text-th-muted">We&apos;ll reach out when it&apos;s your turn.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-th-border bg-th-surface/60 px-4 py-3 text-sm text-th-text placeholder:text-th-faint outline-none transition-colors focus:border-th-muted"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-th-text px-4 py-3 font-[family-name:var(--font-manrope)] text-sm font-medium text-th-bg transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Request an invite'}
            </button>
            <p className="mt-1 text-center text-[11px] leading-snug text-th-faint">
              By requesting an invite, you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-2">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </form>
        )}

        {/* Footer */}
        <footer className="mt-auto pt-12 flex flex-col items-center gap-3">
          <div className="flex gap-3 text-[11px] text-th-faint">
            <Link href="/privacy" className="hover:text-th-muted transition-colors">Privacy</Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-th-muted transition-colors">Terms</Link>
            <span>|</span>
            <Link href="/cookies" className="hover:text-th-muted transition-colors">Cookies</Link>
          </div>
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs text-th-faint">
            Not all those who wander are lost.
          </p>
        </footer>
      </div>
    </div>
  )
}
