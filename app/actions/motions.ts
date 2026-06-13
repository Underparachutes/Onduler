'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { normalizeEntries } from '@/lib/contributions'
import { markHintSeen } from '@/app/actions/settings'
import { parseHoursInput } from '@/lib/periods'

export async function createMotion(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const defaultPoints = parseInt(formData.get('default_points') as string) || 1
  const defaultHours = parseHoursInput(formData.get('default_hours') as string) ?? 1.0
  const groupIdRaw = (formData.get('group_id') as string) || ''
  const group_id = groupIdRaw ? groupIdRaw : null
  const swellIdRaw = (formData.get('swell_id') as string) || ''
  const swell_id = swellIdRaw ? swellIdRaw : null

  // Multi-select swell entries from the dashboard add form. JSON array of
  // { swellId, weight }. Takes precedence over the single swell_id field
  // (which the swell-context flow still uses).
  const swellEntriesRaw = (formData.get('swell_entries') as string) || ''
  let swellEntries: { swellId: string; weight: number }[] = []
  if (swellEntriesRaw) {
    try {
      const parsed = JSON.parse(swellEntriesRaw)
      if (Array.isArray(parsed)) {
        swellEntries = parsed
          .filter(e => e && typeof e.swellId === 'string')
          .map(e => ({ swellId: e.swellId, weight: typeof e.weight === 'number' ? e.weight : 1 }))
      }
    } catch {
      // ignore malformed payload; fall back to single swell_id path
    }
  }

  if (!name) return { error: 'Name is required' }

  const chapterId = await getActiveChapterId(supabase, user.id)

  const { data: inserted, error } = await supabase
    .from('motions')
    .insert({ user_id: user.id, chapter_id: chapterId, name, default_points: defaultPoints, default_hours: defaultHours, group_id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (inserted) {
    if (swellEntries.length > 0) {
      const { error: linkErr } = await supabase.from('motion_swells').insert(
        swellEntries.map(e => ({
          motion_id: inserted.id,
          swell_id: e.swellId,
          contribution_weight: e.weight,
        })),
      )
      if (linkErr) return { error: `Motion created, but linking swells failed: ${linkErr.message}` }
      for (const e of swellEntries) revalidatePath(`/swells/${e.swellId}`)
    } else if (swell_id) {
      const { error: linkErr } = await supabase.from('motion_swells').insert({
        motion_id: inserted.id,
        swell_id,
        contribution_weight: 1,
      })
      if (linkErr) return { error: `Motion created, but linking the swell failed: ${linkErr.message}` }
      revalidatePath(`/swells/${swell_id}`)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  markHintSeen('motions')
  return { success: true }
}

export async function updateMotion(id: string, prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const defaultPoints = parseInt(formData.get('default_points') as string) || 1
  const defaultHours = parseHoursInput(formData.get('default_hours') as string) ?? 1.0

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('motions')
    .update({ name, default_points: defaultPoints, default_hours: defaultHours })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const { count } = await supabase
    .from('motions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
    .eq('user_id', user.id)

  if (count && count > 0) {
    const rebalanceErr = await rebalanceSubmotionBudget(supabase, id, user.id)
    if (rebalanceErr) return { error: rebalanceErr }
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
  markHintSeen('motions')
  return { success: true }
}

export async function deleteMotion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: motion } = await supabase
    .from('motions')
    .select('parent_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error: delErr } = await supabase.from('motions').delete().eq('id', id).eq('user_id', user.id)
  if (delErr) return { error: delErr.message }

  if (motion?.parent_id) {
    const rebalanceErr = await rebalanceSubmotionBudget(supabase, motion.parent_id, user.id)
    if (rebalanceErr) return { error: rebalanceErr }
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
  return { success: true }
}

export async function setMotionSwells(
  motionId: string,
  entries: { swellId: string; weight: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: clearErr } = await supabase.from('motion_swells').delete().eq('motion_id', motionId)
  if (clearErr) return { error: clearErr.message }

  if (entries.length > 0) {
    const normalized = normalizeEntries(entries)
    const { error: insErr } = await supabase.from('motion_swells').insert(
      normalized.map(({ swellId, weight }) => ({
        motion_id: motionId,
        swell_id: swellId,
        contribution_weight: weight,
      }))
    )
    if (insErr) return { error: insErr.message }
  }

  revalidatePath('/swells')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateMotionDirect(
  id: string,
  name: string,
  points: number,
  hours: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }
  if (points < 1) return { error: 'Points must be at least 1' }
  if (hours < 0.25) return { error: 'Hours must be at least 0.25' }

  const { error } = await supabase
    .from('motions')
    .update({ name: trimmed, default_points: points, default_hours: hours })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const { count } = await supabase
    .from('motions')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
    .eq('user_id', user.id)

  if (count && count > 0) {
    const rebalanceErr = await rebalanceSubmotionBudget(supabase, id, user.id)
    if (rebalanceErr) return { error: rebalanceErr }
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateSubmotionDirect(id: string, name: string, points: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const { error } = await supabase
    .from('motions')
    .update({ name: trimmed, default_points: Math.max(1, points) })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true }
}

export async function createSubmotion(
  parentId: string,
  name: string,
  mode?: 'distribute' | 'rollup'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const chapterId = await getActiveChapterId(supabase, user.id)

  // Stamp the parent's mode on first child, if a mode was passed and not yet set.
  if (mode) {
    const { data: parent } = await supabase
      .from('motions')
      .select('submotion_mode')
      .eq('id', parentId)
      .eq('user_id', user.id)
      .single()
    if (parent && parent.submotion_mode == null) {
      const { error: modeErr } = await supabase
        .from('motions')
        .update({ submotion_mode: mode })
        .eq('id', parentId)
        .eq('user_id', user.id)
      if (modeErr) return { error: modeErr.message }
    }
  }

  const { data, error } = await supabase.from('motions').insert({
    user_id: user.id,
    chapter_id: chapterId,
    name: trimmed,
    default_points: 1,
    default_hours: 1,
    parent_id: parentId,
  }).select('id').single()

  if (error) return { error: error.message }

  const rebalanceErr = await rebalanceSubmotionBudget(supabase, parentId, user.id)
  if (rebalanceErr) return { error: rebalanceErr }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true, id: data.id }
}

export async function setSubmotionMode(parentId: string, mode: 'distribute' | 'rollup') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: modeErr } = await supabase
    .from('motions')
    .update({ submotion_mode: mode })
    .eq('id', parentId)
    .eq('user_id', user.id)
  if (modeErr) return { error: modeErr.message }

  const rebalanceErr = await rebalanceSubmotionBudget(supabase, parentId, user.id)
  if (rebalanceErr) return { error: rebalanceErr }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true }
}

export async function hideMotion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error: hideErr } = await supabase.from('motions').update({ hidden: true }).eq('id', id).eq('user_id', user.id)
  if (hideErr) return { error: hideErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
  return { success: true }
}

export async function reorderMotions(orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('motions').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    )
  )
  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function unhideMotion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error: unhideErr } = await supabase.from('motions').update({ hidden: false }).eq('id', id).eq('user_id', user.id)
  if (unhideErr) return { error: unhideErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
  return { success: true }
}

export async function reassignMotionToGroup(
  motionId: string,
  toGroupId: string | null,
  sourceOrderedIds: string[],
  destOrderedIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: moveErr } = await supabase
    .from('motions')
    .update({ group_id: toGroupId })
    .eq('id', motionId)
    .eq('user_id', user.id)
  if (moveErr) return { error: moveErr.message }

  const results = await Promise.all([
    ...sourceOrderedIds.map((id, index) =>
      supabase.from('motions').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    ),
    ...destOrderedIds.map((id, index) =>
      supabase.from('motions').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    ),
  ])
  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

async function rebalanceSubmotionBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  userId: string
): Promise<string | null> {
  const { data: parent } = await supabase
    .from('motions')
    .select('default_points, default_hours, submotion_mode')
    .eq('id', parentId)
    .eq('user_id', userId)
    .single()

  if (!parent) return null

  const { data: subs } = await supabase
    .from('motions')
    .select('id')
    .eq('parent_id', parentId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!subs || subs.length === 0) return null

  // Rollup: every child carries the parent's full pts/hrs.
  // Distribute (or NULL = default): divide pts/hrs evenly across children.
  const rollup = parent.submotion_mode === 'rollup'
  const count = subs.length
  const basePts = rollup ? parent.default_points : Math.floor(parent.default_points / count)
  const remainderPts = rollup ? 0 : parent.default_points % count
  const childHrs = rollup
    ? parseFloat(Number(parent.default_hours).toFixed(2))
    : parseFloat((Number(parent.default_hours) / count).toFixed(2))

  const results = await Promise.all(
    subs.map((sub, i) =>
      supabase
        .from('motions')
        .update({
          default_points: basePts + (i < remainderPts ? 1 : 0),
          default_hours: childHrs,
        })
        .eq('id', sub.id)
    )
  )
  const failed = results.find(r => r.error)
  if (failed?.error) return failed.error.message
  return null
}

export async function duplicateMotion(
  motionId: string,
  opts?: { swellId?: string; weight?: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: source } = await supabase
    .from('motions')
    .select('name, default_points, default_hours, group_id, submotion_mode, sort_order')
    .eq('id', motionId)
    .eq('user_id', user.id)
    .single()

  if (!source) return { error: 'Motion not found' }

  const chapterId = await getActiveChapterId(supabase, user.id)

  const { data: inserted, error } = await supabase
    .from('motions')
    .insert({
      user_id: user.id,
      chapter_id: chapterId,
      name: `${source.name} (copy)`,
      default_points: source.default_points,
      default_hours: source.default_hours,
      group_id: source.group_id,
      sort_order: (source.sort_order ?? 0) + 1,
    })
    .select('id, name')
    .single()

  if (error) return { error: error.message }

  if (opts?.swellId && inserted) {
    const { error: linkErr } = await supabase.from('motion_swells').insert({
      motion_id: inserted.id,
      swell_id: opts.swellId,
      contribution_weight: opts.weight ?? 1,
    })
    if (linkErr) return { error: linkErr.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true, id: inserted!.id, name: inserted!.name }
}

export async function setMotionGroup(motionId: string, groupId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: grpErr } = await supabase
    .from('motions')
    .update({ group_id: groupId })
    .eq('id', motionId)
    .eq('user_id', user.id)
  if (grpErr) return { error: grpErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true }
}
