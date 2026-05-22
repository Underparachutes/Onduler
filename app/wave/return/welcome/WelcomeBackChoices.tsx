'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setWelcomeBackMode } from '@/app/actions/welcomeback'

export function WelcomeBackChoices() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function choose(mode: 'ease' | 'full') {
    startTransition(async () => {
      await setWelcomeBackMode(mode)
      router.push('/dashboard')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => choose('ease')}
        className="group flex flex-col items-start gap-1 rounded-xl border border-th-border bg-th-surface px-4 py-4 text-left transition-all hover:bg-th-bg active:scale-[0.99]"
      >
        <div className="flex w-full items-center justify-between">
          <p className="text-sm font-medium text-th-text">Ease back in</p>
          <span className="rounded-full bg-th-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-th-faint">
            Recommended
          </span>
        </div>
        <p className="text-xs text-th-muted">
          Soft 3-week ramp — targets at 40% this week, 70% next, then back to full.
        </p>
      </button>

      <button
        type="button"
        onClick={() => choose('full')}
        className="flex flex-col items-start gap-1 rounded-xl border border-th-border px-4 py-4 text-left transition-all hover:bg-th-surface active:scale-[0.99]"
      >
        <p className="text-sm font-medium text-th-text">
          Pick up where you left off
        </p>
        <p className="text-xs text-th-muted">
          Full weekly targets — same as before the wave.
        </p>
      </button>
    </div>
  )
}
