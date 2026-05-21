'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveReflection } from '@/app/actions/reflections'
import { archiveAndStartFreshChapter } from '@/app/actions/chapters'
import { FrozenRadar } from './FrozenRadar'
import { ceilDisplay, type DayKey } from '@/lib/periods'
import type { Cadence } from '@/lib/cycles'

type Step = 'expectation' | 'reveal' | 'observation' | 'tune' | 'archive_confirm'

type Swell = { id: string; name: string; color: string; target: number }

type Props = {
  cadence: Cadence
  cycleStart: DayKey
  cycleEnd: DayKey
  cycleLabel: string
  swells: Swell[]
  actuals: number[]
  trackingMode: 'points' | 'hours'
}

// Cadence-specific copy. One shape across all four cadences (ADR 0007) —
// the cadence is the depth knob; the questions stay the same in structure
// but reference the cycle the user just lived through.
const COPY: Record<Cadence, { expectation: string; reveal: string; observation: string }> = {
  week: {
    expectation: 'What did you expect to see this week?',
    reveal: "Here's what last week looked like.",
    observation: 'What did you see?',
  },
  month: {
    expectation: 'What did you expect to see this month?',
    reveal: "Here's what last month looked like.",
    observation: 'What did you see?',
  },
  quarter: {
    expectation: 'What did you expect to see this quarter?',
    reveal: "Here's what last quarter looked like.",
    observation: 'What did you see?',
  },
  year: {
    expectation: 'What did you expect to see this year?',
    reveal: "Here's what last year looked like.",
    observation: 'What did you see?',
  },
}

const CYCLE_NOUN: Record<Cadence, string> = {
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
}

export function CycleCeremony({
  cadence,
  cycleStart,
  cycleEnd,
  cycleLabel,
  swells,
  actuals,
  trackingMode,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('expectation')
  const [expectation, setExpectation] = useState('')
  const [observation, setObservation] = useState('')
  const [isPending, startTransition] = useTransition()

  const isHours = trackingMode === 'hours'
  const totalActual = actuals.reduce((s, v) => s + v, 0)
  const copy = COPY[cadence]
  const noun = CYCLE_NOUN[cadence]

  function persist(didTune: boolean) {
    startTransition(async () => {
      await saveReflection({
        cadence,
        cycleStart,
        cycleEnd,
        expectationText: expectation || null,
        observationText: observation || null,
        didTune,
      })
      router.push('/anchors')
      router.refresh()
    })
  }

  function goToSwells() {
    startTransition(async () => {
      await saveReflection({
        cadence,
        cycleStart,
        cycleEnd,
        expectationText: expectation || null,
        observationText: observation || null,
        didTune: true,
      })
      router.push('/swells')
    })
  }

  function goToMotions() {
    startTransition(async () => {
      await saveReflection({
        cadence,
        cycleStart,
        cycleEnd,
        expectationText: expectation || null,
        observationText: observation || null,
        didTune: true,
      })
      router.push('/dashboard')
    })
  }

  function confirmArchive() {
    startTransition(async () => {
      await saveReflection({
        cadence,
        cycleStart,
        cycleEnd,
        expectationText: expectation || null,
        observationText: observation || null,
        didTune: true,
      })
      const result = await archiveAndStartFreshChapter()
      if (result && 'error' in result && result.error) {
        // Surface failure but stay on the page so the user can retry.
        console.error('Archive failed:', result.error)
        return
      }
      router.push('/onboarding')
    })
  }

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Anchor</p>
          <p className="text-xs text-th-faint">{cycleLabel}</p>
        </div>

        {step === 'expectation' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-th-text">{copy.expectation}</h1>
            <p className="text-sm leading-relaxed text-th-secondary">
              Take a moment. Before you look at the data, what&apos;s your sense of how the {noun} went?
            </p>
            <textarea
              value={expectation}
              onChange={e => setExpectation(e.target.value)}
              rows={5}
              placeholder="Optional. Write as little or as much as you want."
              className="w-full resize-none rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder:text-th-faint focus:border-th-focus focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('reveal')}
                className="text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => setStep('reveal')}
                className="rounded-lg bg-th-btn px-4 py-2 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
              >
                See the {noun}
              </button>
            </div>
          </div>
        )}

        {step === 'reveal' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-th-text">{copy.reveal}</h1>
            <div className="flex justify-center">
              <FrozenRadar swells={swells} actuals={actuals} trackingMode={trackingMode} />
            </div>
            <p className="text-center text-xs text-th-muted">
              {ceilDisplay(totalActual, isHours)} {isHours ? 'hrs' : 'pts'} across {swells.length} swell{swells.length === 1 ? '' : 's'}.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('observation')}
                className="rounded-lg bg-th-btn px-4 py-2 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'observation' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-th-text">{copy.observation}</h1>
            <p className="text-sm leading-relaxed text-th-secondary">
              No judgment, no scorecard. Just what you noticed when you looked.
            </p>
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              rows={5}
              placeholder="Optional. Write as little or as much as you want."
              className="w-full resize-none rounded-lg border border-th-border bg-th-bg px-3 py-2 text-sm text-th-text placeholder:text-th-faint focus:border-th-focus focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('tune')}
                className="text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => setStep('tune')}
                className="rounded-lg bg-th-btn px-4 py-2 text-xs font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'tune' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-th-text">Want to tune something?</h1>
            <p className="text-sm leading-relaxed text-th-secondary">
              The {noun} is closed. If something wants to shift, this is the moment.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={goToSwells}
                disabled={isPending}
                className="flex items-center justify-between rounded-lg border border-th-border px-4 py-3 text-sm text-th-text transition-colors hover:bg-th-surface active:scale-[0.99] disabled:opacity-50"
              >
                <span>Swells — targets, focus, what you&apos;re feeding</span>
                <span className="text-th-faint">→</span>
              </button>
              <button
                type="button"
                onClick={goToMotions}
                disabled={isPending}
                className="flex items-center justify-between rounded-lg border border-th-border px-4 py-3 text-sm text-th-text transition-colors hover:bg-th-surface active:scale-[0.99] disabled:opacity-50"
              >
                <span>Motions — what you actually do, day to day</span>
                <span className="text-th-faint">→</span>
              </button>
              <button
                type="button"
                onClick={() => persist(false)}
                disabled={isPending}
                className="mt-2 text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97] disabled:opacity-50"
              >
                Skip — nothing to change this time
              </button>

              <button
                type="button"
                onClick={() => setStep('archive_confirm')}
                disabled={isPending}
                className="mt-6 text-xs text-th-faint transition-colors hover:text-th-text active:scale-[0.97] disabled:opacity-50"
              >
                Start a new chapter
              </button>
            </div>
          </div>
        )}

        {step === 'archive_confirm' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold text-th-text">Close this chapter?</h1>
            <p className="text-sm leading-relaxed text-th-secondary">
              Your motions, swells, logs, and anchors stay safe — you can revisit them
              from Settings → Past chapters. The active app starts fresh: a new shape,
              new swells, new motions. Reflection unlocks reset.
            </p>
            <p className="text-sm leading-relaxed text-th-secondary">
              Take it as a gift to your future self, not a goodbye.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmArchive}
                disabled={isPending}
                className="rounded-lg border border-th-text bg-th-text px-4 py-3 text-sm font-medium text-th-bg transition-colors hover:bg-th-text/90 active:scale-[0.99] disabled:opacity-50"
              >
                {isPending ? 'Closing…' : 'Yes, close this chapter'}
              </button>
              <button
                type="button"
                onClick={() => setStep('tune')}
                disabled={isPending}
                className="text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97] disabled:opacity-50"
              >
                Not yet — take me back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
