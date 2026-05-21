import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAnchorJournal, type AnchorRow } from '@/app/actions/reflections'
import { formatWeekLabel, formatMonthLabel, formatQuarterLabel, formatYearLabel, type Cycle } from '@/lib/cycles'

function chapterLabel(startedAt: string, endedAt: string | null): string {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const start = fmt.format(new Date(startedAt))
  const end = endedAt ? fmt.format(new Date(endedAt)) : 'present'
  return `${start} – ${end}`
}

function cycleLabel(a: AnchorRow): string | null {
  if (!a.cycle_start || !a.cycle_end) return null
  const cycle: Cycle = { cycleStart: a.cycle_start, cycleEnd: a.cycle_end }
  if (a.cycle_type === 'week') return formatWeekLabel(cycle)
  if (a.cycle_type === 'month') return formatMonthLabel(cycle)
  if (a.cycle_type === 'quarter') return formatQuarterLabel(cycle)
  if (a.cycle_type === 'year') return formatYearLabel(cycle)
  // free: only show a cycle pill if the user anchored against one
  return formatWeekLabel(cycle)
}

function entryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}

export default async function AnchorJournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapters = await getAnchorJournal()
  const totalAnchors = chapters.reduce((sum, c) => sum + c.anchors.length, 0)

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link
            href="/anchors"
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Anchors
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-th-text">Your anchors</h1>
        <p className="mb-8 text-xs text-th-muted">
          Every anchor you&apos;ve dropped, oldest chapters at the bottom.
        </p>

        {totalAnchors === 0 ? (
          <p className="text-sm text-th-muted">
            No anchors yet. Drop one from the Anchors page or complete a cycle-close ceremony.
          </p>
        ) : (
          <div className="flex flex-col gap-10 pb-12">
            {chapters.map(chapter => (
              <section key={chapter.chapterId} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between border-b border-th-border-soft pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-th-muted">
                    Chapter
                  </p>
                  <p className="text-[10px] text-th-faint">
                    {chapterLabel(chapter.startedAt, chapter.endedAt)}
                  </p>
                </div>

                {chapter.anchors.length === 0 ? (
                  <p className="text-xs text-th-faint">No anchors in this chapter.</p>
                ) : (
                  chapter.anchors.map(a => (
                    <article key={a.id} className="flex flex-col gap-2 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-widest text-th-muted">
                          {a.cycle_type === 'free' ? 'Anchor' : `${a.cycle_type} ceremony`}
                        </p>
                        <p className="text-[10px] text-th-faint">{entryDate(a.created_at)}</p>
                      </div>

                      {cycleLabel(a) && (
                        <p className="text-xs text-th-secondary">{cycleLabel(a)}</p>
                      )}

                      {a.cycle_type === 'free' ? (
                        <>
                          {a.prompt_text && (
                            <p className="text-xs italic text-th-faint">{a.prompt_text}</p>
                          )}
                          {a.body_text && (
                            <p className="whitespace-pre-wrap text-sm text-th-text">{a.body_text}</p>
                          )}
                        </>
                      ) : (
                        <CeremonyCard anchor={a} />
                      )}
                    </article>
                  ))
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CeremonyCard({ anchor }: { anchor: AnchorRow }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-3">
      {/* Placeholder for the closed-radar visual — wire the real FrozenRadar in
          a follow-up once we've decided whether to snapshot actuals or re-aggregate
          from logs at render time. */}
      <div className="flex h-16 items-center justify-center rounded border border-dashed border-th-border text-[10px] uppercase tracking-widest text-th-faint">
        Closed radar (placeholder)
      </div>
      {anchor.expectation_text && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-th-muted">Expected</p>
          <p className="whitespace-pre-wrap text-sm text-th-text">{anchor.expectation_text}</p>
        </div>
      )}
      {anchor.observation_text && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-th-muted">Observed</p>
          <p className="whitespace-pre-wrap text-sm text-th-text">{anchor.observation_text}</p>
        </div>
      )}
      {anchor.did_tune && (
        <p className="text-[10px] uppercase tracking-widest text-th-secondary">Tuned</p>
      )}
    </div>
  )
}
