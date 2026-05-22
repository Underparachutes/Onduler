import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getBuildPreset, type BuildKey } from '@/lib/builds'
import { defaultMvsMotions, resolveMvsMotions } from '@/lib/welcomeback'
import { ShapePicker } from './ShapePicker'

export default async function ShapePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapterId = await getActiveChapterId(supabase, user.id)

  const [{ data: settings }, { data: swells }, { data: motions }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('primary_build, mvs_motions')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('swells')
      .select('name')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId),
    supabase
      .from('motions')
      .select('id, name, motion_swells(swells(name))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false),
  ])

  const existingSwellNames = (swells ?? []).map(s => s.name)
  const primary = (settings?.primary_build as BuildKey | null) ?? null
  const mvsOverride = (settings?.mvs_motions as Record<string, string[]> | null) ?? null

  // Build the pool of motions eligible for the primary shape's "still showing
  // up" set — those feeding any of the shape's seeded swells. Caller can
  // drop/swap/add from this pool in the MVS editor.
  type FeedRow = { id: string; name: string; motion_swells?: { swells: { name: string } | null }[] }
  const motionsList = (motions ?? []) as unknown as FeedRow[]
  const preset = getBuildPreset(primary)
  let mvsPool: { id: string; name: string; logCount: number }[] = []
  let resolvedMvsIds: string[] = []
  if (preset) {
    const seedSet = new Set(preset.seededSwells)
    const feeding = motionsList.filter(m =>
      (m.motion_swells ?? []).some(ms => ms.swells && seedSet.has(ms.swells.name)),
    )
    const ids = feeding.map(m => m.id)
    const logCounts: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: logs } = await supabase
        .from('logs')
        .select('motion_id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .in('motion_id', ids)
      for (const l of logs ?? []) {
        if (!l.motion_id) continue
        logCounts[l.motion_id] = (logCounts[l.motion_id] ?? 0) + 1
      }
    }
    mvsPool = feeding
      .map(m => ({ id: m.id, name: m.name, logCount: logCounts[m.id] ?? 0 }))
      .sort((a, b) => {
        if (b.logCount !== a.logCount) return b.logCount - a.logCount
        return a.name.localeCompare(b.name)
      })
    const defaults = defaultMvsMotions(mvsPool, 2)
    resolvedMvsIds = resolveMvsMotions(primary!, mvsOverride, defaults)
  }

  return (
    <ShapePicker
      primary={settings?.primary_build ?? null}
      existingSwellNames={existingSwellNames}
      mvsPool={mvsPool}
      resolvedMvsIds={resolvedMvsIds}
      hasOverride={!!mvsOverride?.[primary ?? '']}
    />
  )
}
