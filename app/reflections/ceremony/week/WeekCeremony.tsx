'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveWeekReflection } from '@/app/actions/reflections'
import { FrozenRadar } from './FrozenRadar'
import { ceilDisplay, type DayKey } from '@/lib/periods'

type Step = 'expectation' | 'reveal' | 'observation' | 'tune'

type Swell = { id: string; name: string; color: string; target: number }

type Props = {
  cycleStart: DayKey
  cycleEnd: DayKey
  weekLabel: string
  swells: Swell[]
  actuals: number[]
  trackingMode: 'points' | 'hours'
}

// One shape across all four cadences (ADR 0007). Two prompts, a radar
// reveal between them, then a tune-or-skip CTA. Every step is skippable.
export function WeekCeremony({
  cycleStart,
  cycleEnd,
  weekLabel,
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

  function persist(didTune: boolean) {
    startTransition(async () => {
      await saveWeekReflection({
        cycleStart,
        cycleEnd,
        expectationText: expectation || null,
        observationText: observation || null,
        didTune,
      })
      router.push('/reflections')
      router.refresh()
    })
  }

  function goToSwells() {
    startTransition(async () => {
      await saveWeekReflection({
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
      await saveWeekReflection({
        cycleStart,
        cycleEnd,
        expectationText: expectation || null,
        observationText: observation || null,
        didTune: true,
      })
      router.push('/dashboard')
    })
  }

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Reflection</p>
          <p className="text-xs text-th-faint">{weekLabel}</p>
        </div>

        {step === 'expectation' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-th-text">
              What did you expect to see this week?
            </h1>
            <p className="text-sm leading-relaxed text-th-secondary">
              Take a moment. Before you look at the data, what&apos;s your sense of how the week went?
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
                See the week
              </button>
            </div>
          </div>
        )}

        {step === 'reveal' && (
          <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-th-text">
              Here&apos;s what last week looked like.
            </h1>
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
            <h1 className="text-2xl font-semibold tracking-tight text-th-text">
              What did you see?
            </h1>
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
            <h1 className="text-2xl font-semibold tracking-tight text-th-text">
              Want to tune something?
            </h1>
            <p className="text-sm leading-relaxed text-th-secondary">
              The week is closed. If something wants to shift, this is the moment.
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
