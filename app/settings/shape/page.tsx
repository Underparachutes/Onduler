import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBuildPreset, type BuildKey } from '@/lib/builds'
import { defaultMvsAnchors, resolveMvsAnchors } from '@/lib/welcomeback'
import { ShapePicker } from './ShapePicker'

export default async function ShapePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: settings }, { data: swells }, { data: motions }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('primary_build, secondary_build, mvs_anchors')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('swells')
      .select('name')
      .eq('user_id', user.id),
    supabase
      .from('motions')
      .select('id, name, motion_swells(swells(name))')
      .eq('user_id', user.id)
      .eq('hidden', false),
  ])

  const existingSwellNames = (swells ?? []).map(s => s.name)
  const primary = (settings?.primary_build as BuildKey | null) ?? null
  const anchorsOverride = (settings?.mvs_anchors as Record<string, string[]> | null) ?? null

  // Build the pool of motions eligible to be anchors for the primary shape —
  // those feeding any of the shape's seeded swells. Caller can drop/swap/add
  // from this pool in the MVS editor.
  type FeedRow = { id: string; name: string; motion_swells?: { swells: { name: string } | null }[] }
  const motionsList = (motions ?? []) as unknown as FeedRow[]
  const preset = getBuildPreset(primary)
  let anchorPool: { id: string; name: string; logCount: number }[] = []
  let resolvedAnchorIds: string[] = []
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
        .in('motion_id', ids)
      for (const l of logs ?? []) {
        if (!l.motion_id) continue
        logCounts[l.motion_id] = (logCounts[l.motion_id] ?? 0) + 1
      }
    }
    anchorPool = feeding
      .map(m => ({ id: m.id, name: m.name, logCount: logCounts[m.id] ?? 0 }))
      .sort((a, b) => {
        if (b.logCount !== a.logCount) return b.logCount - a.logCount
        return a.name.localeCompare(b.name)
      })
    const defaults = defaultMvsAnchors(anchorPool, 2)
    resolvedAnchorIds = resolveMvsAnchors(primary!, anchorsOverride, defaults)
  }

  return (
    <ShapePicker
      primary={settings?.primary_build ?? null}
      secondary={settings?.secondary_build ?? null}
      existingSwellNames={existingSwellNames}
      anchorPool={anchorPool}
      resolvedAnchorIds={resolvedAnchorIds}
      hasOverride={!!anchorsOverride?.[primary ?? '']}
    />
  )
}
