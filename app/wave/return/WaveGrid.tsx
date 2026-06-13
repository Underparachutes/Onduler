'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordWaveCheckin } from '@/app/actions/wave'
import { useSaveGuard } from '@/app/components/useSaveGuard'

export function WaveGrid({ durationSeconds }: { durationSeconds: number | null }) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const [isPending, startTransition] = useTransition()
  const gridRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const guard = useSaveGuard()

  function handleInteraction(clientX: number, clientY: number) {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    setPoint({ x, y })
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    handleInteraction(e.clientX, e.clientY)
  }

  function handleTouch(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault()
    const touch = e.touches[0]
    if (touch) handleInteraction(touch.clientX, touch.clientY)
  }

  function submit() {
    if (!point) return
    startTransition(async () => {
      if (guard(await recordWaveCheckin(point.x, point.y, durationSeconds))) {
        router.push('/wave/return/welcome')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-th-muted">High energy</p>

      <div className="flex w-full items-center gap-3">
        <p className="w-14 shrink-0 text-right text-xs leading-tight text-th-muted">
          Negative
        </p>

        <div
          ref={gridRef}
          onClick={handleClick}
          onTouchStart={handleTouch}
          className="relative aspect-square flex-1 cursor-crosshair touch-none select-none rounded-xl border border-th-border bg-th-surface"
        >
          {/* center lines */}
          <div className="pointer-events-none absolute inset-0 flex items-center">
            <div className="h-px w-full bg-th-border" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex justify-center">
            <div className="h-full w-px bg-th-border" />
          </div>

          {point && (
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-th-btn shadow"
              style={{ left: `${point.x * 100}%`, bottom: `${point.y * 100}%` }}
            />
          )}
        </div>

        <p className="w-14 shrink-0 text-xs leading-tight text-th-muted">
          Positive
        </p>
      </div>

      <p className="text-xs text-th-muted">Low energy</p>

      <button
        onClick={submit}
        disabled={!point || isPending}
        className="mt-4 w-full rounded-lg bg-th-btn px-4 py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-40"
      >
        {isPending ? 'Checking in…' : 'Check in'}
      </button>
    </div>
  )
}
