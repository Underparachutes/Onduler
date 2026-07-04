import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getJournalData, type JournalChapter, type JournalWeek, type AnchorRow } from '@/app/actions/reflections'
import { dayKey, type DayKey } from '@/lib/periods'
import { getUserTimezone } from '@/lib/user-timezone'
import { FrozenRadar } from '@/app/anchors/ceremony/FrozenRadar'
import { JournalClient } from './JournalClient'

type SwellRow = { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; chapter_id: string; created_at: string }
// One row per (local-day, swell) from the swell_actuals_by_day RPC — weighted
// actuals pre-summed in Postgres. `day` is a local-tz 'YYYY-MM-DD' string.
type ActualRow = { day: string; swell_id: string; points_sum: number; hours_sum: number }

function chapterLabel(startedAt: string, endedAt: string | null): string {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const start = fmt.format(new Date(startedAt))
  const end = endedAt ? fmt.format(new Date(endedAt)) : 'present'
  return `${start} – ${end}`
}

function entryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
}

// Per-swell actuals for a [cycleStart, cycleEnd] window (weekly or a ceremony's
// month/quarter/year), summing the pre-aggregated per-day values. `actualsBySwell`
// maps swell_id → its active days with the mode-selected value; a swell_id only
// receives contributions from logs in its own chapter, so no chapter filter is
// needed. Reproduces the old per-log reducer exactly (floor already applied in SQL).
function actualsForWindow(
  actualsBySwell: Map<string, { day: string; val: number }[]>,
  cycleStart: DayKey,
  cycleEnd: DayKey,
  swells: SwellRow[],
): number[] {
  return swells.map(s => {
    const rows = actualsBySwell.get(s.id)
    if (!rows) return 0
    let total = 0
    for (const r of rows) {
      if (r.day >= cycleStart && r.day <= cycleEnd) total += r.val
    }
    return total
  })
}

export type AnchorWithRadar = AnchorRow & {
  radarSwells?: { id: string; name: string; color: string; target: number }[]
  radarActuals?: number[]
}

export type WeekRenderData = {
  cycleStart: DayKey
  cycleEnd: DayKey
  label: string
  kind: 'anchors' | 'logs-only' | 'wave'
  anchors: AnchorWithRadar[]
  radarSwells?: { id: string; name: string; color: string; target: number }[]
  radarActuals?: number[]
}

export type ChapterRenderData = {
  chapterId: string
  label: string
  active: boolean
  weeks: WeekRenderData[]
}

export default async function AnchorJournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tz = await getUserTimezone(user.id)
  const [chapters, { data: swellRows }, { data: actualRows }, { data: settings }] = await Promise.all([
    getJournalData(),
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours, chapter_id, created_at')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('sort_order'),
    // Per-(day, swell) weighted actuals, aggregated in Postgres, instead of
    // pulling every log row + the motion_swells join into Node.
    supabase.rpc('swell_actuals_by_day', { p_tz: tz }),
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'
  const allSwells: SwellRow[] = (swellRows ?? []) as SwellRow[]

  const swellsByChapter = new Map<string, SwellRow[]>()
  for (const s of allSwells) {
    const list = swellsByChapter.get(s.chapter_id) ?? []
    list.push(s)
    swellsByChapter.set(s.chapter_id, list)
  }

  // Index the aggregate by swell, pre-selecting the mode's value (pts or hrs).
  const actualsBySwell = new Map<string, { day: string; val: number }[]>()
  for (const r of (actualRows ?? []) as ActualRow[]) {
    const list = actualsBySwell.get(r.swell_id) ?? []
    list.push({ day: r.day, val: isHours ? Number(r.hours_sum) : Number(r.points_sum) })
    actualsBySwell.set(r.swell_id, list)
  }

  const renderChapters: ChapterRenderData[] = chapters.map(ch => {
    const chapterSwells = swellsByChapter.get(ch.chapterId) ?? []

    const weeks: WeekRenderData[] = ch.weeks.map(w => {
      let kind: 'anchors' | 'logs-only' | 'wave'
      if (w.hasAnchors) {
        kind = 'anchors'
      } else if (w.hasLogs) {
        kind = 'logs-only'
      } else {
        kind = 'wave'
      }

      const weekSwells = chapterSwells.filter(s => dayKey(s.created_at, tz) <= w.cycleEnd)
      const radarSwells = weekSwells.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        target: isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0),
      }))

      const anchorsWithRadar: AnchorWithRadar[] = w.anchors.map(a => {
        if (a.cycle_type === 'free' || !a.cycle_start || !a.cycle_end) {
          return a
        }
        const ceremonySwells = chapterSwells.filter(s => dayKey(s.created_at, tz) <= a.cycle_end!)
        if (ceremonySwells.length < 3) return a
        const ceremonyRadarSwells = ceremonySwells.map(s => ({
          id: s.id,
          name: s.name,
          color: s.color,
          target: isHours ? Number(s.target_hours ?? 0) : (s.target_points ?? 0),
        }))
        return {
          ...a,
          radarSwells: ceremonyRadarSwells,
          radarActuals: actualsForWindow(actualsBySwell, a.cycle_start, a.cycle_end, ceremonySwells),
        }
      })

      const weekData: WeekRenderData = {
        cycleStart: w.cycleStart,
        cycleEnd: w.cycleEnd,
        label: w.label,
        kind,
        anchors: anchorsWithRadar,
      }

      if (radarSwells.length >= 3) {
        weekData.radarSwells = radarSwells
        if (kind === 'logs-only') {
          weekData.radarActuals = actualsForWindow(actualsBySwell, w.cycleStart, w.cycleEnd, weekSwells)
        }
      }

      return weekData
    })

    return {
      chapterId: ch.chapterId,
      label: chapterLabel(ch.startedAt, ch.endedAt),
      active: ch.endedAt === null,
      weeks,
    }
  })

  const totalWeeks = renderChapters.reduce((sum, ch) => sum + ch.weeks.length, 0)

  return (
    <div className="flex min-h-full flex-col items-center px-5 pb-12">
      <div className="w-full max-w-[22rem]">
        <div className="sticky top-0 z-10 bg-th-bg pb-3">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-th-text">Your anchors</h1>
            <Link
              href="/anchors/new"
              aria-label="Drop an anchor"
              className="brand-text flex items-center justify-center text-3xl font-light leading-none text-th-muted transition-colors hover:text-th-text"
            >
              +
            </Link>
          </div>
          <p className="text-xs text-th-muted">
            Every week of your life in Onduler, oldest chapters at the bottom.
          </p>
        </div>
        <div className="h-4" />

        {totalWeeks === 0 ? (
          <p className="text-sm text-th-muted">
            No anchors yet. Drop one from the Anchors page or complete a cycle-close ceremony.
          </p>
        ) : (
          <JournalClient
            chapters={renderChapters}
            trackingMode={trackingMode}
          />
        )}
      </div>
    </div>
  )
}
