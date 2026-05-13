import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const [goals, domains, activities, logs, waveCheckins] = await Promise.all([
    supabase
      .from('goals')
      .select('id, name, color, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('domains')
      .select('id, name, weight, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('activities')
      .select('id, name, default_points, domain_id, goal_id, created_at')
      .eq('user_id', user.id)
      .order('created_at'),

    supabase
      .from('logs')
      .select('id, activity_id, domain_id, difficulty, points, logged_at, activities(name), domains(name)')
      .eq('user_id', user.id)
      .order('logged_at'),

    supabase
      .from('wave_checkins')
      .select('id, energy, alignment, duration_seconds, created_at')
      .eq('user_id', user.id)
      .order('created_at'),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    goals: goals.data ?? [],
    domains: domains.data ?? [],
    activities: activities.data ?? [],
    logs: (logs.data ?? []).map((log) => ({
      id: log.id,
      logged_at: log.logged_at,
      activity_id: log.activity_id,
      activity_name: (log.activities as unknown as { name: string } | null)?.name ?? null,
      domain_id: log.domain_id,
      domain_name: (log.domains as unknown as { name: string } | null)?.name ?? null,
      difficulty: log.difficulty,
      points: log.points,
    })),
    wave_checkins: waveCheckins.data ?? [],
  }

  const filename = `onduler-export-${new Date().toISOString().slice(0, 10)}.json`

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
