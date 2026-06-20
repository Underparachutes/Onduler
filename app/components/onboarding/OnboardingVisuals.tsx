'use client'

import { useEffect, useState } from 'react'
import { generateRandomWake } from '@/lib/wakes'

// Same seeded breathing wake as the landing hero and signup intro, so the whole
// arrival — postcard QR, landing, onboarding — feels like one surface.
const WAKE_PATH = generateRandomWake(42, 7, 80, { x: 100, y: 100 })

// The central brand element. Two stacked layers: a soft blurred glow behind a
// crisp breathing stroke. `dimmed` pushes it behind the privacy lock. `ombre`
// fills the wake with a gradient across the three theme brand colors —
// Tjornuvik green, Bolinas gold, Biarritz coral — for the finale.
export function WakeMark({
  size = 200,
  dimmed = false,
  ombre = false,
}: {
  size?: number
  dimmed?: boolean
  ombre?: boolean
}) {
  const glowFill = ombre ? 'url(#wake-ombre)' : 'var(--th-accent)'
  return (
    <div className="relative" style={{ height: size, width: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ filter: dimmed ? 'blur(16px)' : 'blur(8px)', opacity: dimmed ? 0.35 : 0.6 }}
      >
        {ombre && (
          <defs>
            <linearGradient id="wake-ombre" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#72f189" />
              <stop offset="50%" stopColor="#f2c421" />
              <stop offset="100%" stopColor="#f67e4e" />
            </linearGradient>
          </defs>
        )}
        <path
          d={WAKE_PATH}
          fill={glowFill}
          fillOpacity={ombre ? '0.3' : '0.18'}
          stroke={glowFill}
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
      </svg>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="absolute inset-0"
        style={{
          animation: 'slow-breathe 4s ease-in-out infinite',
          transformOrigin: 'center',
          opacity: dimmed ? 0.4 : 1,
        }}
      >
        <path
          d={WAKE_PATH}
          fill={ombre ? 'url(#wake-ombre)' : 'none'}
          fillOpacity={ombre ? '0.85' : '0'}
          stroke={ombre ? 'url(#wake-ombre)' : 'var(--th-text)'}
          strokeWidth={ombre ? '0.8' : '0.6'}
          opacity={ombre ? 1 : 0.55}
        />
      </svg>
    </div>
  )
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
      <path
        d="M1 5l3.5 3.5L11 1"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MotionRow({ name, done }: { name: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors duration-300 ${
          done ? 'border-th-btn text-th-btn' : 'border-th-border'
        }`}
      >
        <span
          className={`transition-all duration-300 ${done ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        >
          <CheckGlyph />
        </span>
      </span>
      <span
        className={`text-sm font-medium transition-colors duration-300 ${
          done ? 'text-th-muted line-through' : 'text-th-text'
        }`}
      >
        {name}
      </span>
    </div>
  )
}

// Slide 2 — a simplified daily motions checklist. Mirrors the real row markup
// from dashboard/components/SortableMotionList. When the slide is active, "Cook"
// checks itself off so the gesture of completing a motion is visible.
export function MotionsMock({ active }: { active: boolean }) {
  const [cookDone, setCookDone] = useState(false)

  // Reset is handled by remount (keyed on `active` in the parent), so the effect
  // only schedules the check-off — no synchronous setState in the effect body.
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setCookDone(true), 900)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div className="w-full rounded-2xl border border-th-border bg-th-surface/40 p-3 backdrop-blur-sm">
      <MotionRow name="Read" done />
      <MotionRow name="Hike" done />
      <MotionRow name="Cook" done={cookDone} />
      <MotionRow name="Meditate" done={false} />
    </div>
  )
}

// Slide 3 — simplified swells with contribution bars. Mirrors swells/SwellRow.
// When the slide is active, Health fills in to suggest motions feeding a swell.
const SWELLS: { name: string; color: string; progress: number; animate?: boolean }[] = [
  { name: 'Creativity', color: '#8ea2d8', progress: 70 },
  { name: 'Health', color: '#6fb2a0', progress: 45, animate: true },
  { name: 'Connection', color: '#cf9a8c', progress: 60 },
]

export function SwellsMock({ active }: { active: boolean }) {
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setFilled(true), 350)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-th-border bg-th-surface/40 p-4 backdrop-blur-sm">
      {SWELLS.map(s => {
        const width = s.animate ? (filled ? s.progress : 4) : s.progress
        return (
          <div key={s.name}>
            <p
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: s.color }}
            >
              {s.name}
            </p>
            <div className="h-1 rounded-full bg-th-surface">
              <div
                className={`h-full rounded-full ${s.animate ? 'transition-[width] duration-[1200ms] ease-out' : ''}`}
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(to right, color-mix(in oklch, ${s.color} 35%, var(--th-surface)), ${s.color})`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Slide 4 — a simplified anchors journal entry. Mirrors anchors/InlineAnchorLog.
// When the slide is active, the closing reflection types itself in.
const ANCHOR_PREFIX = 'Walked by the water after work. '
const ANCHOR_SUFFIX = 'Felt clearer afterward than I expected.'

export function AnchorsMock({ active }: { active: boolean }) {
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    if (!active) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(i)
      if (i >= ANCHOR_SUFFIX.length) clearInterval(id)
    }, 45)
    return () => clearInterval(id)
  }, [active])

  const typing = active && typed < ANCHOR_SUFFIX.length

  return (
    <div className="w-full rounded-2xl border border-th-border bg-th-surface/40 p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-th-text">Tuesday</p>
        <p className="text-xs text-th-faint">June 16</p>
      </div>
      <p className="text-sm leading-relaxed text-th-text/90">
        {ANCHOR_PREFIX}
        {ANCHOR_SUFFIX.slice(0, typed)}
        {typing && (
          <span className="ml-px inline-block h-3 w-[1.5px] translate-y-[1px] bg-th-muted align-[-1px] animate-pulse" />
        )}
      </p>
    </div>
  )
}

function LockGlyph() {
  return (
    <svg
      viewBox="0 0 48 48"
      width={56}
      height={56}
      fill="none"
      stroke="var(--th-text)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="10" y="21" width="28" height="20" rx="4" />
      <path d="M16 21 V15 a8 8 0 0 1 16 0 V21" />
      <circle cx="24" cy="29.5" r="2.4" fill="var(--th-text)" stroke="none" />
      <path d="M24 32 V35.5" />
    </svg>
  )
}

// Slide 5 — privacy. The wake, dimmed and blurred, sits behind a lock. A soft
// edgeless halo lifts the lock off the wake without hiding it.
export function PrivacyMock() {
  return (
    <div className="relative flex h-[200px] w-[200px] items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <WakeMark size={200} dimmed />
      </div>
      <div
        className="absolute h-[150px] w-[150px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in oklch, var(--th-text) 7%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className="relative">
        <LockGlyph />
      </div>
    </div>
  )
}
