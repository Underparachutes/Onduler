import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const [swells, groups, motions, logs, waveCheckins] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('groups')
      .select('id, name, color, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, hidden, parent_id, created_at')
      .eq('user_id', user.id)
      .order('created_at'),

    supabase
      .from('logs')
      .select('id, motion_id, points, hours, logged_at, motions(name)')
      .eq('user_id', user.id)
      .order('logged_at'),

    supabase
      .from('wave_checkins')
      .select('id, energy, alignment, duration_seconds, checked_in_at')
      .eq('user_id', user.id)
      .order('checked_in_at'),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    swells: swells.data ?? [],
    groups: groups.data ?? [],
    motions: motions.data ?? [],
    logs: (logs.data ?? []).map(log => ({
      id: log.id,
      logged_at: log.logged_at,
      motion_id: log.motion_id,
      motion_name: (log.motions as unknown as { name: string } | null)?.name ?? null,
      points: log.points,
      hours: log.hours,
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
