import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getJournalData, type JournalChapter, type JournalWeek, type AnchorRow } from '@/app/actions/reflections'
import { pacificDayKey, type DayKey } from '@/lib/periods'
import { FrozenRadar } from '@/app/anchors/ceremony/FrozenRadar'
import { JournalClient } from './JournalClient'

type SwellRow = { id: string; name: string; color: string; target_points: number | null; target_hours: number | null; chapter_id: string; created_at: string }
type MotionShape = {
  motion_swells?: { contribution_weight: number; swells: { id: string } | null }[]
} | null
type LogRow = {
  points: number
  hours: number
  logged_at: string
  chapter_id: string
  motions: MotionShape
}

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

function actualsForWeek(
  logs: LogRow[],
  cycleStart: DayKey,
  cycleEnd: DayKey,
  swells: SwellRow[],
  isHours: boolean,
): number[] {
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
  return swells.map(s => acc.get(s.id) ?? 0)
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

  const [chapters, { data: swellRows }, { data: logRows }, { data: settings }] = await Promise.all([
    getJournalData(),
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours, chapter_id, created_at')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('sort_order'),
    supabase
      .from('logs')
      .select('points, hours, logged_at, chapter_id, motions(motion_swells(contribution_weight, swells(id)))')
      .eq('user_id', user.id),
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
  ])

  const trackingMode: 'points' | 'hours' = (settings?.tracking_mode as 'points' | 'hours') ?? 'points'
  const isHours = trackingMode === 'hours'
  const allSwells: SwellRow[] = (swellRows ?? []) as SwellRow[]
  const allLogs: LogRow[] = (logRows ?? []) as unknown as LogRow[]

  const swellsByChapter = new Map<string, SwellRow[]>()
  for (const s of allSwells) {
    const list = swellsByChapter.get(s.chapter_id) ?? []
    list.push(s)
    swellsByChapter.set(s.chapter_id, list)
  }
  const logsByChapter = new Map<string, LogRow[]>()
  for (const l of allLogs) {
    const list = logsByChapter.get(l.chapter_id) ?? []
    list.push(l)
    logsByChapter.set(l.chapter_id, list)
  }

  const renderChapters: ChapterRenderData[] = chapters.map(ch => {
    const chapterSwells = swellsByChapter.get(ch.chapterId) ?? []
    const chapterLogs = logsByChapter.get(ch.chapterId) ?? []

    const weeks: WeekRenderData[] = ch.weeks.map(w => {
      let kind: 'anchors' | 'logs-only' | 'wave'
      if (w.hasAnchors) {
        kind = 'anchors'
      } else if (w.hasLogs) {
        kind = 'logs-only'
      } else {
        kind = 'wave'
      }

      const weekSwells = chapterSwells.filter(s => pacificDayKey(s.created_at) <= w.cycleEnd)
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
        const ceremonySwells = chapterSwells.filter(s => pacificDayKey(s.created_at) <= a.cycle_end!)
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
          radarActuals: actualsForWeek(chapterLogs, a.cycle_start, a.cycle_end, ceremonySwells, isHours),
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
          weekData.radarActuals = actualsForWeek(chapterLogs, w.cycleStart, w.cycleEnd, weekSwells, isHours)
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
