import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAnchorJournal, type AnchorRow } from '@/app/actions/reflections'
import { formatWeekLabel, formatMonthLabel, formatQuarterLabel, formatYearLabel, type Cycle } from '@/lib/cycles'
import { pacificDayKey, type DayKey } from '@/lib/periods'
import { FrozenRadar } from '@/app/anchors/ceremony/week/FrozenRadar'

type SwellRow = { id: string; name: string; color: string; target_points: number | null; target_hours: number | null }
type MotionShape = {
  motion_swells?: { contribution_weight: number; swells: { id: string } | null }[]
} | null
type LogRow = {
  points: number
  hours: number
  logged_at: string
  motions: MotionShape
}

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

// Per-swell actuals across a closed cycle, re-aggregated from current logs +
// motion_swells weights. Targets and swell membership reflect *today's* shape
// — the journal is a re-read, not a snapshot. Hidden swells are excluded so
// the visual matches the live ceremony radar.
function actualsForCycle(
  logs: LogRow[],
  cycleStart: DayKey,
  cycleEnd: DayKey,
  swells: SwellRow[],
  isHours: boolean,
): Map<string, number> {
  const acc = new Map<string, number>()
  swells.forEach(s => acc.set(s.id, 0))
  for (const log of logs) {
    const key = pacificDayKey(log.logged_at)
    if (key < cycleStart || key > cycleEnd) continue
    const motion: MotionShape = (Array.isArray(log.motions) ? log.motions[0] : log.motions) as MotionShape
    motion?.motion_swells?.forEach(ms => {
      if (!ms.swells) return
      if (!acc.has(ms.swells.id)) return
      const weight = Number(ms.contribution_weight) || 1
      const inc = isHours ? Number(log.hours) * weight : Math.floor(log.points * weight)
      acc.set(ms.swells.id, (acc.get(ms.swells.id) ?? 0) + inc)
    })
  }
  return acc
}

export default async function AnchorJournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [chapters, { data: swellRows }, { data: logRows }, { data: settings }] = await Promise.all([
    getAnchorJournal(),
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('sort_order'),
    supabase
      .from('logs')
      .select('points, hours, logged_at, motions(motion_swells(contribution_weight, swells(id)))')
      .eq('user_id', user.id),
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'
  const swells: SwellRow[] = swellRows ?? []
  const logs: LogRow[] = (logRows ?? []) as unknown as LogRow[]

  const radarSwells = swells.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    target: (isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0)),
  }))

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
                  chapter.anchors.map(a => {
                    const isCeremony = a.cycle_type !== 'free'
                    const canRenderRadar =
                      isCeremony && a.cycle_start && a.cycle_end && radarSwells.length >= 3
                    const actualsArr = canRenderRadar
                      ? (() => {
                          const map = actualsForCycle(logs, a.cycle_start!, a.cycle_end!, swells, isHours)
                          return swells.map(s => map.get(s.id) ?? 0)
                        })()
                      : null

                    return (
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
                          <CeremonyCard
                            anchor={a}
                            radarSwells={radarSwells}
                            actuals={actualsArr}
                            trackingMode={trackingMode}
                          />
                        )}
                      </article>
                    )
                  })
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CeremonyCard({
  anchor,
  radarSwells,
  actuals,
  trackingMode,
}: {
  anchor: AnchorRow
  radarSwells: { id: string; name: string; color: string; target: number }[]
  actuals: number[] | null
  trackingMode: 'points' | 'hours'
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-th-border-soft bg-th-surface/40 px-3 py-3">
      {actuals ? (
        <div className="flex justify-center">
          <FrozenRadar swells={radarSwells} actuals={actuals} trackingMode={trackingMode} />
        </div>
      ) : (
        <p className="text-center text-[10px] uppercase tracking-widest text-th-faint">
          Radar unavailable
        </p>
      )}
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
