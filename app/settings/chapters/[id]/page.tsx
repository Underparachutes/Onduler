import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getArchivedChapterDetail, type ArchivedChapterAnchor } from '@/app/actions/chapters'
import { formatPts, formatHrs } from '@/lib/format'
import { formatWeekLabel, formatMonthLabel, formatQuarterLabel, formatYearLabel, type Cycle } from '@/lib/cycles'
import { FrozenRadar } from '@/app/anchors/ceremony/FrozenRadar'

function chapterRange(startedAt: string, endedAt: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${fmt.format(new Date(startedAt))} – ${fmt.format(new Date(endedAt))}`
}

function chapterDays(startedAt: string, endedAt: string): number {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

function entryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}

function cycleLabelFor(a: ArchivedChapterAnchor): string | null {
  if (!a.cycleStart || !a.cycleEnd) return null
  const cycle: Cycle = { cycleStart: a.cycleStart, cycleEnd: a.cycleEnd }
  if (a.cycleType === 'week') return formatWeekLabel(cycle)
  if (a.cycleType === 'month') return formatMonthLabel(cycle)
  if (a.cycleType === 'quarter') return formatQuarterLabel(cycle)
  if (a.cycleType === 'year') return formatYearLabel(cycle)
  return formatWeekLabel(cycle)
}

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapter = await getArchivedChapterDetail(id)
  if (!chapter) notFound()

  const isHours = chapter.trackingMode === 'hours'
  const days = chapterDays(chapter.startedAt, chapter.endedAt)

  const statPieces: string[] = [
    `${chapter.logCount} ${chapter.logCount === 1 ? 'log' : 'logs'}`,
    `${chapter.motions.length} ${chapter.motions.length === 1 ? 'motion' : 'motions'}`,
    `${chapter.swells.length} ${chapter.swells.length === 1 ? 'swell' : 'swells'}`,
    `${chapter.anchors.length} ${chapter.anchors.length === 1 ? 'anchor' : 'anchors'}`,
  ]

  // FrozenRadar expects targets in the active currency. Past chapters carry
  // their own targets; show in the user's current tracking mode (matches the
  // journal's behavior — re-read against today's tracking choice).
  const radarSwells = chapter.swells.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    target: (isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0)),
  }))

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link
            href="/settings/chapters"
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Past chapters
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          {chapterRange(chapter.startedAt, chapter.endedAt)}
        </h1>
        <p className="mb-6 text-xs text-th-muted">
          {days} {days === 1 ? 'day' : 'days'} · {statPieces.join(' · ')}
        </p>

        <div className="flex flex-col gap-10 pb-12">
          {/* Swells */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">
              Swells
            </p>
            {chapter.swells.length === 0 ? (
              <p className="text-xs text-th-faint">No swells in this chapter.</p>
            ) : (
              <div className="flex flex-col">
                {chapter.swells.map(s => {
                  const target = isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0)
                  const targetLabel = target > 0
                    ? isHours
                      ? `${formatHrs(target)}/wk`
                      : `${formatPts(target)}/wk`
                    : null
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 border-b border-th-border-soft py-3 last:border-b-0"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="flex-1 text-sm text-th-text">{s.name}</span>
                      {targetLabel && (
                        <span className="text-xs text-th-muted">{targetLabel}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Motions */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">
              Motions
            </p>
            {chapter.motions.length === 0 ? (
              <p className="text-xs text-th-faint">No motions in this chapter.</p>
            ) : (
              <div className="flex flex-col">
                {chapter.motions.map(m => {
                  const value = isHours ? Number(m.default_hours ?? 0) : m.default_points
                  const valueLabel = isHours ? formatHrs(value) : formatPts(value)
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 border-b border-th-border-soft py-3 last:border-b-0"
                    >
                      <span className="flex-1 text-sm text-th-text">{m.name}</span>
                      <span className="text-xs text-th-muted">{valueLabel}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Anchors — inline, matching the journal card shapes */}
          {chapter.anchors.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">
                Anchors
              </p>
              <div className="flex flex-col gap-3">
                {chapter.anchors.map(a => {
                  const cycleLabel = cycleLabelFor(a)
                  const header = (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-widest text-th-muted">
                          {a.cycleType === 'free' ? 'Anchor' : `${a.cycleType} ceremony`}
                        </p>
                        <p className="text-[10px] text-th-faint">{entryDate(a.createdAt)}</p>
                      </div>
                      {cycleLabel && (
                        <p className="text-xs text-th-secondary">{cycleLabel}</p>
                      )}
                    </>
                  )

                  if (a.cycleType === 'free') {
                    return (
                      <Link
                        key={a.id}
                        href={`/anchors/${a.id}/edit`}
                        className="flex flex-col gap-2 rounded py-2 transition-colors hover:bg-th-surface/50 active:scale-[0.985]"
                      >
                        {header}
                        {a.promptText && (
                          <p className="text-xs italic text-th-faint">{a.promptText}</p>
                        )}
                        {a.bodyText && (
                          <p className="whitespace-pre-wrap text-sm text-th-text">{a.bodyText}</p>
                        )}
                      </Link>
                    )
                  }

                  return (
                    <article key={a.id} className="flex flex-col gap-3 rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-3">
                      {header}
                      {a.actuals ? (
                        <div className="flex justify-center">
                          <FrozenRadar
                            swells={radarSwells}
                            actuals={a.actuals}
                            trackingMode={chapter.trackingMode}
                          />
                        </div>
                      ) : (
                        <p className="text-center text-[10px] uppercase tracking-widest text-th-faint">
                          Radar unavailable
                        </p>
                      )}
                      {a.expectationText && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-th-muted">Expected</p>
                          <p className="whitespace-pre-wrap text-sm text-th-text">{a.expectationText}</p>
                        </div>
                      )}
                      {a.observationText && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-th-muted">Observed</p>
                          <p className="whitespace-pre-wrap text-sm text-th-text">{a.observationText}</p>
                        </div>
                      )}
                      {a.didTune && (
                        <p className="text-[10px] uppercase tracking-widest text-th-secondary">Tuned</p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
