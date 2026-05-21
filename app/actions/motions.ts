'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { normalizeEntries } from '@/lib/contributions'

export async function createMotion(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const defaultPoints = parseInt(formData.get('default_points') as string) || 1
  const defaultHours = parseFloat(formData.get('default_hours') as string) || 1.0
  const groupIdRaw = (formData.get('group_id') as string) || ''
  const group_id = groupIdRaw ? groupIdRaw : null
  const swellIdRaw = (formData.get('swell_id') as string) || ''
  const swell_id = swellIdRaw ? swellIdRaw : null

  if (!name) return { error: 'Name is required' }

  const chapterId = await getActiveChapterId(supabase, user.id)

  const { data: inserted, error } = await supabase
    .from('motions')
    .insert({ user_id: user.id, chapter_id: chapterId, name, default_points: defaultPoints, default_hours: defaultHours, group_id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (swell_id && inserted) {
    await supabase.from('motion_swells').insert({
      motion_id: inserted.id,
      swell_id,
      contribution_weight: 1,
    })
    revalidatePath(`/swells/${swell_id}`)
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true }
}

export async function updateMotion(id: string, prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const defaultPoints = parseInt(formData.get('default_points') as string) || 1
  const defaultHours = parseFloat(formData.get('default_hours') as string) || 1.0

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
    await rebalanceSubmotionBudget(supabase, id, user.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
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

  await supabase.from('motions').delete().eq('id', id).eq('user_id', user.id)

  if (motion?.parent_id) {
    await rebalanceSubmotionBudget(supabase, motion.parent_id, user.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
}

export async function setMotionSwells(
  motionId: string,
  entries: { swellId: string; weight: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('motion_swells').delete().eq('motion_id', motionId)

  if (entries.length > 0) {
    const normalized = normalizeEntries(entries)
    await supabase.from('motion_swells').insert(
      normalized.map(({ swellId, weight }) => ({
        motion_id: motionId,
        swell_id: swellId,
        contribution_weight: weight,
      }))
    )
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
    await rebalanceSubmotionBudget(supabase, id, user.id)
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
      await supabase
        .from('motions')
        .update({ submotion_mode: mode })
        .eq('id', parentId)
        .eq('user_id', user.id)
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

  await rebalanceSubmotionBudget(supabase, parentId, user.id)

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true, id: data.id }
}

export async function setSubmotionMode(parentId: string, mode: 'distribute' | 'rollup') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('motions')
    .update({ submotion_mode: mode })
    .eq('id', parentId)
    .eq('user_id', user.id)

  await rebalanceSubmotionBudget(supabase, parentId, user.id)

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true }
}

export async function hideMotion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('motions').update({ hidden: true }).eq('id', id).eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
}

export async function reorderMotions(orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('motions').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    )
  )

  revalidatePath('/dashboard')
}

export async function unhideMotion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('motions').update({ hidden: false }).eq('id', id).eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
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

  await supabase
    .from('motions')
    .update({ group_id: toGroupId })
    .eq('id', motionId)
    .eq('user_id', user.id)

  await Promise.all([
    ...sourceOrderedIds.map((id, index) =>
      supabase.from('motions').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    ),
    ...destOrderedIds.map((id, index) =>
      supabase.from('motions').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    ),
  ])

  revalidatePath('/dashboard')
  return { success: true }
}

async function rebalanceSubmotionBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  userId: string
) {
  const { data: parent } = await supabase
    .from('motions')
    .select('default_points, default_hours, submotion_mode')
    .eq('id', parentId)
    .eq('user_id', userId)
    .single()

  if (!parent) return

  const { data: subs } = await supabase
    .from('motions')
    .select('id')
    .eq('parent_id', parentId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!subs || subs.length === 0) return

  // Rollup: every child carries the parent's full pts/hrs.
  // Distribute (or NULL = default): divide pts/hrs evenly across children.
  const rollup = parent.submotion_mode === 'rollup'
  const count = subs.length
  const basePts = rollup ? parent.default_points : Math.floor(parent.default_points / count)
  const remainderPts = rollup ? 0 : parent.default_points % count
  const childHrs = rollup
    ? parseFloat(Number(parent.default_hours).toFixed(2))
    : parseFloat((Number(parent.default_hours) / count).toFixed(2))

  await Promise.all(
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
}

export async function setMotionGroup(motionId: string, groupId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('motions')
    .update({ group_id: groupId })
    .eq('id', motionId)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  return { success: true }
}
