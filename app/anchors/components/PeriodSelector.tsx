'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export type PeriodOption = {
  start: string
  label: string
  isCurrent: boolean
}

type Props = {
  period: string
  currentLabel: string
  options: PeriodOption[]
  sort?: string
}

export function PeriodSelector({ period, currentLabel, options, sort }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (options.length <= 1) {
    return <h1 className="mb-4 text-lg font-semibold text-th-text">{currentLabel}</h1>
  }

  return (
    <div ref={ref} className="relative mb-4">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 text-lg font-semibold text-th-text"
      >
        {currentLabel}
        <svg width="12" height="12" viewBox="0 0 12 12" className={`text-th-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-xl border border-th-border bg-th-bg shadow-lg">
            {options.map(opt => {
              const params = new URLSearchParams()
              params.set('period', period)
              if (!opt.isCurrent) params.set('start', opt.start)
              if (sort && sort !== 'earned') params.set('sort', sort)
              const href = `/anchors?${params.toString()}`
              return (
                <Link
                  key={opt.start}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    opt.label === currentLabel
                      ? 'bg-th-surface font-medium text-th-text'
                      : 'text-th-muted hover:bg-th-surface hover:text-th-text'
                  }`}
                >
                  {opt.label}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
