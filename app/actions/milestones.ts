'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type MilestoneKind = 'recurring' | 'one_shot'
type Cadence = 'weekly' | 'monthly'

export async function createMilestone(
  swellId: string,
  kind: MilestoneKind,
  name: string,
  cadence: Cadence | null,
  options?: {
    targetCount?: number | null
    bonusPoints?: number | null
    motionId?: string | null
  },
) {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name required' }
  if (kind !== 'recurring' && kind !== 'one_shot') return { error: 'Invalid kind' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const targetCount =
    kind === 'recurring' && options?.targetCount && options.targetCount > 0
      ? Math.floor(options.targetCount)
      : null
  const bonusPoints =
    options?.bonusPoints && options.bonusPoints > 0 ? Math.floor(options.bonusPoints) : 0
  // motion_id only meaningful for recurring — one-shots track via completed_at.
  const motionId = kind === 'recurring' ? options?.motionId ?? null : null

  const { error } = await supabase.from('milestones').insert({
    user_id: user.id,
    swell_id: swellId,
    name: trimmed,
    kind,
    cadence: kind === 'recurring' ? cadence ?? 'weekly' : null,
    target_count: targetCount,
    bonus_points: bonusPoints,
    motion_id: motionId,
  })

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateMilestone(
  milestoneId: string,
  swellId: string,
  patch: {
    name?: string
    kind?: MilestoneKind
    cadence?: Cadence
    targetCount?: number | null
    bonusPoints?: number | null
    motionId?: string | null
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed) return { error: 'Name required' }
    update.name = trimmed
  }
  if (patch.kind !== undefined) {
    if (patch.kind !== 'recurring' && patch.kind !== 'one_shot') return { error: 'Invalid kind' }
    update.kind = patch.kind
    // Flipping kind clears the other kind's fields so stale state doesn't
    // confuse aggregation paths (cadence/target_count are recurring-only;
    // completed_at is one-shot-only). bonus_points + motion_id survive.
    if (patch.kind === 'one_shot') {
      update.cadence = null
      update.target_count = null
    } else {
      update.completed_at = null
      if (patch.cadence === undefined) update.cadence = 'weekly'
    }
  }
  if (patch.cadence !== undefined) update.cadence = patch.cadence
  if (patch.targetCount !== undefined) {
    update.target_count =
      patch.targetCount && patch.targetCount > 0 ? Math.floor(patch.targetCount) : null
  }
  if (patch.bonusPoints !== undefined) {
    update.bonus_points =
      patch.bonusPoints && patch.bonusPoints > 0 ? Math.floor(patch.bonusPoints) : 0
  }
  if (patch.motionId !== undefined) update.motion_id = patch.motionId

  if (Object.keys(update).length === 0) return { success: true }

  const { error } = await supabase
    .from('milestones')
    .update(update)
    .eq('id', milestoneId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function renameMilestone(milestoneId: string, name: string, swellId: string) {
  return updateMilestone(milestoneId, swellId, { name })
}

export async function deleteMilestone(milestoneId: string, swellId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function setOneShotComplete(milestoneId: string, completed: boolean, swellId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('milestones')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', milestoneId)
    .eq('user_id', user.id)
    .eq('kind', 'one_shot')

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

// Loads the motion-linked recurring waypoint for a motion, if any. Used by
// the motion detail sheet's Cadence section to populate the current state.
// Returns at most one waypoint — the UI assumes a single cadence per motion.
export async function getMotionCadence(motionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data, error } = await supabase
    .from('milestones')
    .select('id, swell_id, name, cadence, target_count, bonus_points')
    .eq('user_id', user.id)
    .eq('motion_id', motionId)
    .eq('kind', 'recurring')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  return { waypoint: data ?? null }
}

// Manual "this cycle is hit" tap for recurring waypoints that aren't linked
// to a motion — the auto-progress hook (in actions/logs.ts) handles linked
// recurring; this is the explicit-tap counterpart per ADR 0004 §7.
export async function markRecurringHit(milestoneId: string, swellId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Confirm the waypoint exists and is recurring before inserting a hit row.
  const { data: milestone, error: readErr } = await supabase
    .from('milestones')
    .select('id, kind')
    .eq('id', milestoneId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (readErr) return { error: readErr.message }
  if (!milestone) return { error: 'Waypoint not found' }
  if (milestone.kind !== 'recurring') return { error: 'Only recurring waypoints can be marked hit' }

  const { error } = await supabase.from('milestone_hits').insert({
    user_id: user.id,
    milestone_id: milestoneId,
  })
  if (error) return { error: error.message }

  revalidatePath(`/swells/${swellId}`)
  revalidatePath('/dashboard')
  return { success: true }
}
