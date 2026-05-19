import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getBuildPreset, type BuildKey } from '@/lib/builds'
import { defaultMvsAnchors, resolveMvsAnchors } from '@/lib/welcomeback'
import { WelcomeBackChoices } from './WelcomeBackChoices'

export default async function WelcomeBackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('primary_build, mvs_anchors')
    .eq('user_id', user.id)
    .single()

  const primary = (settings?.primary_build as BuildKey | null) ?? null
  const preset = getBuildPreset(primary)
  const anchorsOverride = (settings?.mvs_anchors as Record<string, string[]> | null) ?? null

  // Auto-pick MVS anchors: top-2 most-logged motions feeding the primary
  // shape's seeded swells. Falls back to top-2 overall if the user has no
  // shape set (better than empty).
  let anchorMotions: { id: string; name: string }[] = []
  if (preset) {
    const { data: feedingMotions } = await supabase
      .from('motions')
      .select('id, name, motion_swells(swells(name))')
      .eq('user_id', user.id)
      .eq('hidden', false)

    type FeedRow = {
      id: string
      name: string
      motion_swells?: { swells: { name: string } | null }[]
    }
    const candidates = (feedingMotions ?? []) as unknown as FeedRow[]
    const seedSet = new Set(preset.seededSwells)
    const feedingPrimary = candidates.filter(m =>
      (m.motion_swells ?? []).some(ms => ms.swells && seedSet.has(ms.swells.name)),
    )

    const candidateIds = feedingPrimary.map(m => m.id)
    const logCounts: Record<string, number> = {}
    if (candidateIds.length > 0) {
      const { data: logs } = await supabase
        .from('logs')
        .select('motion_id')
        .eq('user_id', user.id)
        .in('motion_id', candidateIds)
      for (const l of logs ?? []) {
        if (!l.motion_id) continue
        logCounts[l.motion_id] = (logCounts[l.motion_id] ?? 0) + 1
      }
    }
    const defaults = defaultMvsAnchors(
      feedingPrimary.map(m => ({ id: m.id, logCount: logCounts[m.id] ?? 0 })),
      2,
    )
    const resolvedIds = resolveMvsAnchors(primary!, anchorsOverride, defaults)
    const nameById = new Map(feedingPrimary.map(m => [m.id, m.name]))
    anchorMotions = resolvedIds
      .map(id => nameById.get(id) ? { id, name: nameById.get(id)! } : null)
      .filter((m): m is { id: string; name: string } => m !== null)
  }

  const shapeName = preset?.label.replace(/^The /, '') ?? null

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Welcome back.
        </h1>
        <p className="mb-1 text-sm text-th-muted">
          The shore is gentle. You can ease in, or pick up where you were.
        </p>

        {anchorMotions.length > 0 && (
          <p className="mb-6 text-xs text-th-faint">
            Still showing up:{' '}
            {anchorMotions.map(m => m.name).join(' · ')}
          </p>
        )}
        {anchorMotions.length === 0 && <div className="mb-6" />}

        <WelcomeBackChoices shapeName={shapeName} />

        <div className="mt-4 text-center">
          <Link
            href="/settings/shape"
            className="text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
          >
            Try a different shape →
          </Link>
        </div>
      </div>
    </div>
  )
}
