import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getArchivedChapterDetail } from '@/app/actions/chapters'
import { formatPts, formatHrs } from '@/lib/format'

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
    `${chapter.anchorCount} ${chapter.anchorCount === 1 ? 'anchor' : 'anchors'}`,
  ]

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
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

          {/* Anchors link */}
          {chapter.anchorCount > 0 && (
            <section>
              <Link
                href="/anchors/journal"
                className="flex items-center justify-between gap-3 border-b border-th-border-soft py-3 transition-colors hover:bg-th-surface/50 active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-medium text-th-text">
                    {chapter.anchorCount} {chapter.anchorCount === 1 ? 'anchor' : 'anchors'} in this chapter
                  </p>
                  <p className="text-xs text-th-muted">Read them in the journal</p>
                </div>
                <span className="shrink-0 text-sm text-th-faint">→</span>
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
