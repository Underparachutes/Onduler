'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { setAnchorTarget } from '@/app/actions/settings'
import { useSaveGuard } from '@/app/components/useSaveGuard'

type Props = {
  period: string
  unlocks: Record<string, boolean>
  anchorCount: number
  anchorTarget: number
  anchorTargetPerWeek: number
  progressBarColor: string | null
  sort?: string
}

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
] as const

export function AnchorsToolbar({ period, unlocks, anchorCount, anchorTarget, anchorTargetPerWeek, progressBarColor, sort }: Props) {
  const [eyeOpen, setEyeOpen] = useState(false)
  const eyeRef = useRef<HTMLDivElement>(null)
  const [weeklyTarget, setWeeklyTarget] = useState(anchorTargetPerWeek)
  const [, startTransition] = useTransition()
  const guard = useSaveGuard()

  useEffect(() => {
    if (!eyeOpen) return
    function handler(e: MouseEvent) {
      if (eyeRef.current && !eyeRef.current.contains(e.target as Node)) setEyeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [eyeOpen])

  const progress = anchorTarget > 0 ? Math.min(100, (anchorCount / anchorTarget) * 100) : 0
  const color = progressBarColor ?? 'var(--brand)'

  function adjust(delta: number) {
    const next = Math.max(0, Math.min(7, weeklyTarget + delta))
    setWeeklyTarget(next)
    startTransition(async () => { guard(await setAnchorTarget(next)) })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Link
          href="/anchors/journal"
          className="shrink-0 p-1.5 text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
          aria-label="Go to your journal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
            <rect x="5" y="4" width="15" height="17" />
            <path d="M5 7 C 3 7, 3 9, 5 9" />
            <path d="M5 11 C 3 11, 3 13, 5 13" />
            <path d="M5 15 C 3 15, 3 17, 5 17" />
            <line x1="8" y1="8" x2="17.5" y2="8" />
            <line x1="8" y1="12" x2="17.5" y2="12" />
            <line x1="8" y1="16" x2="17.5" y2="16" />
          </svg>
        </Link>

        {anchorTarget > 0 ? (
          <div className="flex-1 overflow-hidden rounded-full bg-th-surface" style={{ height: '3px' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, color-mix(in oklch, ${color} 35%, var(--th-surface)), ${color})`,
                backgroundSize: progress > 0 ? `${100 / (progress / 100)}% 100%` : '100% 100%',
              }}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="relative shrink-0" ref={eyeRef}>
          <button
            onClick={() => setEyeOpen(prev => !prev)}
            className="p-1.5 text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
            aria-label="View options"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {eyeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setEyeOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-th-border bg-th-bg p-1 shadow-lg">
                {PERIODS.filter(p => unlocks[p.value]).map(p => {
                  const params = new URLSearchParams()
                  params.set('period', p.value)
                  if (sort && sort !== 'earned') params.set('sort', sort)
                  return (
                    <Link
                      key={p.value}
                      href={`/anchors?${params.toString()}`}
                      onClick={() => setEyeOpen(false)}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        period === p.value
                          ? 'bg-th-surface font-medium text-th-text'
                          : 'text-th-muted hover:bg-th-surface hover:text-th-text'
                      }`}
                    >
                      {p.label}
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {anchorTarget > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-th-faint">
            {anchorCount} / {anchorTarget}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjust(-1)}
              disabled={weeklyTarget <= 0}
              className="flex h-5 w-5 items-center justify-center rounded border border-th-border text-[10px] text-th-muted transition-colors hover:bg-th-surface disabled:opacity-30"
            >
              −
            </button>
            <span className="text-[10px] text-th-faint">{weeklyTarget}/wk</span>
            <button
              type="button"
              onClick={() => adjust(1)}
              disabled={weeklyTarget >= 7}
              className="flex h-5 w-5 items-center justify-center rounded border border-th-border text-[10px] text-th-muted transition-colors hover:bg-th-surface disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
