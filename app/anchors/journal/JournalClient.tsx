'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteAnchor } from '@/app/actions/reflections'
import { deleteArchivedChapter } from '@/app/actions/chapters'
import { FrozenRadar } from '@/app/anchors/ceremony/FrozenRadar'
import { WaveField, type WaveLine } from '@/app/components/WaveField'
import type { ChapterRenderData, WeekRenderData, AnchorWithRadar } from './page'

const WAVE_STRIP_LINES: WaveLine[] = [
  { yBase: 0.3, amplitude: 8, frequency: 0.035, speed: 0.002, phase: 0.0, width: 0.8, opacity: 0.15 },
  { yBase: 0.5, amplitude: 10, frequency: 0.025, speed: 0.003, phase: 1.5, width: 1.0, opacity: 0.25 },
  { yBase: 0.7, amplitude: 8, frequency: 0.030, speed: 0.004, phase: 3.0, width: 0.8, opacity: 0.15 },
]

function entryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}

function cycleTypeLabel(a: AnchorWithRadar): string {
  if (a.cycle_type === 'free') return 'Anchor'
  return `${a.cycle_type} ceremony`
}

type Props = {
  chapters: ChapterRenderData[]
  trackingMode: 'points' | 'hours'
}

export function JournalClient({ chapters, trackingMode }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const allKeys = chapters.flatMap(ch => ch.weeks.map(w => `${ch.chapterId}:${w.cycleStart}`))
  const allExpanded = allKeys.length > 0 && allKeys.every(k => expanded.has(k))

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set())
    } else {
      setExpanded(new Set(allKeys))
    }
  }

  function toggleWeek(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-th-muted transition-colors hover:text-th-text"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="flex flex-col gap-10 pb-12">
        {chapters.map(chapter => (
          <section key={chapter.chapterId} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between border-b border-th-border-soft pb-2">
              <p className="text-[10px] uppercase tracking-widest text-th-muted">Chapter</p>
              <p className="text-[10px] text-th-faint">{chapter.label}</p>
            </div>
            {!chapter.active && <ChapterDeleteControl chapterId={chapter.chapterId} />}

            {chapter.weeks.length === 0 ? (
              <p className="mt-2 text-xs text-th-faint">No activity in this chapter.</p>
            ) : (
              chapter.weeks.map(week => {
                const key = `${chapter.chapterId}:${week.cycleStart}`
                const isOpen = expanded.has(key)
                return (
                  <WeekRow
                    key={key}
                    week={week}
                    isOpen={isOpen}
                    onToggle={() => toggleWeek(key)}
                    trackingMode={trackingMode}
                  />
                )
              })
            )}
          </section>
        ))}
      </div>
    </>
  )
}

function WeekRow({
  week,
  isOpen,
  onToggle,
  trackingMode,
}: {
  week: WeekRenderData
  isOpen: boolean
  onToggle: () => void
  trackingMode: 'points' | 'hours'
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2 text-left active:scale-[0.985]"
      >
        <span className="text-sm text-th-text">{week.label}</span>
        <span className="text-xs text-th-faint">{isOpen ? '−' : '›'}</span>
      </button>

      {isOpen && (
        <div className="pb-3 pl-1">
          {week.kind === 'wave' && <WaveWeek />}
          {week.kind === 'logs-only' && (
            <LogsOnlyWeek week={week} trackingMode={trackingMode} />
          )}
          {week.kind === 'anchors' && (
            <AnchorsWeek week={week} trackingMode={trackingMode} />
          )}
        </div>
      )}
    </div>
  )
}

function AnchorDeleteButton({ anchorId }: { anchorId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, startDelete] = useTransition()

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    startDelete(async () => {
      const result = await deleteAnchor(anchorId)
      if (result && 'success' in result && result.success) {
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={deleting}
      className="text-[10px] text-th-faint transition-colors hover:text-red-500 active:scale-[0.97] disabled:opacity-50"
    >
      {deleting ? 'Deleting...' : confirming ? 'Tap again to confirm' : 'Delete'}
    </button>
  )
}

function ChapterDeleteControl({ chapterId }: { chapterId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, startDelete] = useTransition()

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    startDelete(async () => {
      const result = await deleteArchivedChapter(chapterId)
      if (result && 'success' in result && result.success) {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1 pt-1">
      {confirming && !deleting && (
        <p className="text-right text-[10px] text-red-500">
          This deletes the chapter&apos;s swells, motions, logs, and anchors. It cannot be undone.
        </p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        disabled={deleting}
        className="text-[10px] text-th-faint transition-colors hover:text-red-500 active:scale-[0.97] disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : confirming ? 'Tap again to confirm' : 'Delete chapter'}
      </button>
    </div>
  )
}

function WaveWeek() {
  return (
    <div className="relative overflow-hidden rounded-lg" style={{ height: 48 }}>
      <WaveField lines={WAVE_STRIP_LINES} />
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
        <p className="text-[10px] uppercase tracking-widest text-th-muted">Wave week</p>
      </div>
    </div>
  )
}

function LogsOnlyWeek({ week, trackingMode }: { week: WeekRenderData; trackingMode: 'points' | 'hours' }) {
  if (week.radarSwells && week.radarActuals) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[280px]">
          <FrozenRadar swells={week.radarSwells} actuals={week.radarActuals} trackingMode={trackingMode} />
        </div>
      </div>
    )
  }
  return null
}

function AnchorsWeek({ week, trackingMode }: { week: WeekRenderData; trackingMode: 'points' | 'hours' }) {
  const hasCeremonyRadar = week.anchors.some(a => a.cycle_type !== 'free' && a.radarSwells && a.radarActuals)

  return (
    <div className="flex flex-col gap-4">
      {week.anchors.map(a => {
        const isCeremony = a.cycle_type !== 'free'
        const canRenderRadar = isCeremony && a.radarSwells && a.radarSwells.length >= 3 && a.radarActuals

        return (
          <article key={a.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-widest text-th-muted">
                {cycleTypeLabel(a)}
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-[10px] text-th-faint">{entryDate(a.created_at)}</p>
                <AnchorDeleteButton anchorId={a.id} />
              </div>
            </div>

            {isCeremony ? (
              <div className="flex flex-col gap-3 rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-3">
                {canRenderRadar && (
                  <div className="flex justify-center">
                    <FrozenRadar swells={a.radarSwells!} actuals={a.radarActuals!} trackingMode={trackingMode} />
                  </div>
                )}
                {a.expectation_text && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-th-muted">Expected</p>
                    <p className="whitespace-pre-wrap text-sm text-th-text">{a.expectation_text}</p>
                  </div>
                )}
                {a.observation_text && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-th-muted">Observed</p>
                    <p className="whitespace-pre-wrap text-sm text-th-text">{a.observation_text}</p>
                  </div>
                )}
                {a.did_tune && (
                  <p className="text-[10px] uppercase tracking-widest text-th-secondary">Tuned</p>
                )}
              </div>
            ) : (
              <Link
                href={`/anchors/${a.id}/edit`}
                className="flex flex-col gap-2 rounded py-1 transition-colors hover:bg-th-surface/50 active:scale-[0.985]"
              >
                {a.prompt_text && (
                  <p className="text-xs italic text-th-faint">{a.prompt_text}</p>
                )}
                {a.body_text && (
                  <p className="whitespace-pre-wrap text-sm text-th-text">{a.body_text}</p>
                )}
              </Link>
            )}
          </article>
        )
      })}

      {!hasCeremonyRadar && week.radarSwells && week.radarSwells.length >= 3 && (
        (() => {
          const weekActuals = week.radarActuals ?? week.radarSwells.map(() => 0)
          if (weekActuals.every(v => v <= 0)) return null
          return (
            <div className="flex justify-center">
              <div className="w-full max-w-[280px]">
                <FrozenRadar swells={week.radarSwells} actuals={weekActuals} trackingMode={trackingMode} />
              </div>
            </div>
          )
        })()
      )}
    </div>
  )
}
