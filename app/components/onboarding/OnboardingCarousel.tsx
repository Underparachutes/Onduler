'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { WaveField, type WaveLine } from '@/app/components/WaveField'
import {
  WakeMark,
  MotionsMock,
  SwellsMock,
  AnchorsMock,
  PrivacyMock,
} from './OnboardingVisuals'

// Same background swell as the landing hero — a stack of slow sine lines that
// paint the deep-ocean ground behind the carousel.
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

type Visual = 'wake' | 'motions' | 'swells' | 'anchors' | 'privacy'

interface Slide {
  id: string
  headline: string
  body: string
  visual: Visual
}

// Centralized slide content. Copy is approved and intentionally affirmative —
// record, notice, choose, feed, grow, reflect, encrypt. No negative framing.
const onboardingSlides: Slide[] = [
  {
    id: 'motions',
    headline: 'A list for what matters.',
    body: 'Choose the daily motions you want to notice and check them off as you go. You decide what belongs on your list.',
    visual: 'motions',
  },
  {
    id: 'swells',
    headline: 'See your life take shape.',
    body: 'Watch your daily motions feed into the areas of life you want to grow. These are your swells.',
    visual: 'swells',
  },
  {
    id: 'anchors',
    headline: 'Drop anchors.',
    body: 'Jot down reflections, feelings, or ideas. Adjust as you go.',
    visual: 'anchors',
  },
  {
    id: 'privacy',
    headline: 'Your words are yours.',
    body: 'A private space to reflect. All text is encrypted.',
    visual: 'privacy',
  },
  // Finale — the wake bursts out and the tagline is revealed.
  {
    id: 'wake',
    headline: 'Record when you can.\nPause when you want.',
    body: 'Notice what your days are quietly building.',
    visual: 'wake',
  },
]

function SlideVisual({ visual, active }: { visual: Visual; active: boolean }) {
  switch (visual) {
    case 'wake':
      return <WakeMark size={200} ombre />
    case 'motions':
      return <MotionsMock key={active ? 'on' : 'off'} active={active} />
    case 'swells':
      return <SwellsMock key={active ? 'on' : 'off'} active={active} />
    case 'anchors':
      return <AnchorsMock key={active ? 'on' : 'off'} active={active} />
    case 'privacy':
      return <PrivacyMock />
  }
}

export function OnboardingCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const lastIndex = onboardingSlides.length - 1
  // Warm off-white, shared by the secondary action and the fine print.
  const cream = 'color-mix(in oklch, var(--th-text) 84%, #e9dcc0)'

  // Derive the active slide from scroll position so swipe and dot-taps stay in
  // sync without a carousel library.
  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setActive(prev => (prev === i ? prev : i))
  }, [])

  const goTo = useCallback((i: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-th-bg">
      {/* Background swell + a soft top glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <WaveField lines={HERO_WAVES} />
        <div
          className="absolute inset-x-0 top-0 h-1/2"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--th-accent) 12%, transparent), transparent)',
          }}
        />
      </div>

      {/* Persistent brand header. "Onduler" rides every slide; the tagline is
          held back until the finale, then fades in beside it. */}
      <header className="relative z-10 px-6 pb-2 pt-10">
        <div className="mx-auto flex w-full max-w-sm items-baseline justify-between gap-4">
          <span className="brand-text font-[family-name:var(--font-manrope)] text-sm font-semibold tracking-wide">
            Onduler
          </span>
          <span
            aria-hidden={active !== lastIndex}
            className={`max-w-[60%] text-right text-[11px] leading-snug transition-opacity duration-700 ${
              active === lastIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ color: 'var(--brand)' }}
          >
            Every motion leaves a wake.
          </span>
        </div>
      </header>

      {/* Swipeable track — one full-width snap slide per concept */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="relative z-10 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-roledescription="carousel"
        aria-label="What Onduler does"
      >
        {onboardingSlides.map((slide, i) => (
          <section
            key={slide.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${onboardingSlides.length}`}
            className="flex h-full w-full shrink-0 snap-center snap-always flex-col overflow-y-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
              {/* Headline above the visual, body below it */}
              <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6">
                <h2 className="whitespace-pre-line text-center font-[family-name:var(--font-manrope)] text-2xl font-semibold tracking-wide text-th-text">
                  {slide.headline}
                </h2>
                <div className="flex w-full items-center justify-center">
                  <SlideVisual visual={slide.visual} active={i === active} />
                </div>
                <p className="max-w-[20rem] text-center text-sm leading-relaxed text-th-muted">
                  {slide.body}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Pagination dots — subtle, current dot widened */}
      <div className="relative z-10 flex justify-center gap-2 pb-2 pt-1">
        {onboardingSlides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? 'w-5 bg-th-text' : 'w-1.5 bg-th-faint'
            }`}
          />
        ))}
      </div>

      {/* Persistent bottom actions — stay put as the carousel changes */}
      <div className="relative z-10 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/signup?step=form"
            style={{ backgroundImage: 'var(--brand-fill)', color: 'var(--brand-fg)' }}
            className="block rounded-xl px-4 py-3 text-center font-[family-name:var(--font-manrope)] text-sm font-medium transition-all active:scale-[0.97]"
          >
            Get started
          </Link>
          <Link
            href="/login"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--th-muted), #f5c87e)', color: '#241a10' }}
            className="block rounded-xl px-4 py-3 text-center font-[family-name:var(--font-manrope)] text-sm font-medium transition-all active:scale-[0.97]"
          >
            Sign in
          </Link>
          <p className="mt-1 text-center text-[11px] leading-snug" style={{ color: cream }}>
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
          <p className="text-center text-[11px]" style={{ color: cream }}>
            On a phone?{' '}
            <Link href="/welcome" className="underline underline-offset-2">
              Install to your home screen
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
