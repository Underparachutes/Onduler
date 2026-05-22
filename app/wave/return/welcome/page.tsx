import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { getBuildPreset, type BuildKey } from '@/lib/builds'
import { defaultMvsMotions, resolveMvsMotions } from '@/lib/welcomeback'
import { WelcomeBackChoices } from './WelcomeBackChoices'

export default async function WelcomeBackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapterId = await getActiveChapterId(supabase, user.id)

  const { data: settings } = await supabase
    .from('user_settings')
    .select('primary_build, mvs_motions')
    .eq('user_id', user.id)
    .single()

  const primary = (settings?.primary_build as BuildKey | null) ?? null
  const preset = getBuildPreset(primary)
  const mvsOverride = (settings?.mvs_motions as Record<string, string[]> | null) ?? null

  // Auto-pick MVS motions: top-2 most-logged motions feeding the primary
  // shape's seeded swells. Falls back to top-2 overall if the user has no
  // shape set (better than empty).
  let stillShowingUp: { id: string; name: string }[] = []
  if (preset) {
    const { data: feedingMotions } = await supabase
      .from('motions')
      .select('id, name, motion_swells(swells(name))')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
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
        .eq('chapter_id', chapterId)
        .in('motion_id', candidateIds)
      for (const l of logs ?? []) {
        if (!l.motion_id) continue
        logCounts[l.motion_id] = (logCounts[l.motion_id] ?? 0) + 1
      }
    }
    const defaults = defaultMvsMotions(
      feedingPrimary.map(m => ({ id: m.id, logCount: logCounts[m.id] ?? 0 })),
      2,
    )
    const resolvedIds = resolveMvsMotions(primary!, mvsOverride, defaults)
    const nameById = new Map(feedingPrimary.map(m => [m.id, m.name]))
    stillShowingUp = resolvedIds
      .map(id => nameById.get(id) ? { id, name: nameById.get(id)! } : null)
      .filter((m): m is { id: string; name: string } => m !== null)
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Welcome back.
        </h1>
        <p className="mb-1 text-sm text-th-muted">
          The shore is gentle. You can ease in, or pick up where you were.
        </p>

        {stillShowingUp.length > 0 && (
          <p className="mb-6 text-xs text-th-faint">
            Still showing up:{' '}
            {stillShowingUp.map(m => m.name).join(' · ')}
          </p>
        )}
        {stillShowingUp.length === 0 && <div className="mb-6" />}

        <WelcomeBackChoices />

        <div className="mt-4 text-center">
          <Link
            href="/settings/shape"
            className="text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
          >
            Try a different starter set →
          </Link>
        </div>
      </div>
    </div>
  )
}
