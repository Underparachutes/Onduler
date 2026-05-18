import { createClient } from '@/lib/supabase/server'

// Translates schema names to user-facing vocabulary at the export boundary
// (see ADR 0006). Top-level keys read as the words the user sees in the
// app: waypoints (not milestones), waves (not wave_checkins). Foreign-key
// field names (swell_id, motion_id) stay because they're the join handles.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const [swells, groups, motions, motionSwells, logs, milestones, waveCheckins] = await Promise.all([
    supabase
      .from('swells')
      .select('id, name, color, target_points, target_hours, group_id, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('groups')
      .select('id, name, color, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('motions')
      .select('id, name, default_points, default_hours, group_id, hidden, parent_id, sort_order, created_at')
      .eq('user_id', user.id)
      .order('created_at'),

    supabase
      .from('motion_swells')
      .select('motion_id, swell_id, contribution_weight')
      .eq('user_id', user.id),

    supabase
      .from('logs')
      .select('id, motion_id, points, hours, logged_at, motions(name)')
      .eq('user_id', user.id)
      .order('logged_at'),

    supabase
      .from('milestones')
      .select('id, swell_id, name, kind, cadence, target_count, completed_at, bonus_points, sort_order, created_at')
      .eq('user_id', user.id)
      .order('sort_order'),

    supabase
      .from('wave_checkins')
      .select('id, energy, alignment, duration_seconds, checked_in_at')
      .eq('user_id', user.id)
      .order('checked_in_at'),
  ])

  // Nest motion→swell contributions inside each motion so the export reads
  // as "this motion feeds these swells with these weights" — the user model,
  // not the junction-table model.
  const swellsByMotion = new Map<string, { swell_id: string; weight: number }[]>()
  for (const link of motionSwells.data ?? []) {
    const list = swellsByMotion.get(link.motion_id) ?? []
    list.push({ swell_id: link.swell_id, weight: Number(link.contribution_weight) })
    swellsByMotion.set(link.motion_id, list)
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    swells: swells.data ?? [],
    groups: groups.data ?? [],
    motions: (motions.data ?? []).map(m => ({
      ...m,
      swells: swellsByMotion.get(m.id) ?? [],
    })),
    logs: (logs.data ?? []).map(log => ({
      id: log.id,
      logged_at: log.logged_at,
      motion_id: log.motion_id,
      motion_name: (log.motions as unknown as { name: string } | null)?.name ?? null,
      points: log.points,
      hours: log.hours,
    })),
    waypoints: milestones.data ?? [],
    waves: waveCheckins.data ?? [],
  }

  const filename = `onduler-export-${new Date().toISOString().slice(0, 10)}.json`

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
