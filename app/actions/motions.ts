'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createMotion(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const defaultPoints = parseInt(formData.get('default_points') as string) || 1
  const defaultHours = parseFloat(formData.get('default_hours') as string) || 1.0
  const groupIdRaw = (formData.get('group_id') as string) || ''
  const group_id = groupIdRaw ? groupIdRaw : null

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('motions')
    .insert({ user_id: user.id, name, default_points: defaultPoints, default_hours: defaultHours, group_id })

  if (error) return { error: error.message }

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
    await supabase.from('motion_swells').insert(
      entries.map(({ swellId, weight }) => ({
        motion_id: motionId,
        swell_id: swellId,
        contribution_weight: Math.max(0, Math.min(weight, 1)),
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

export async function createSubmotion(parentId: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const { error } = await supabase.from('motions').insert({
    user_id: user.id,
    name: trimmed,
    default_points: 1,
    default_hours: 1,
    parent_id: parentId,
  })

  if (error) return { error: error.message }

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
    .select('default_points, default_hours')
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

  const count = subs.length
  const basePts = Math.floor(parent.default_points / count)
  const remainderPts = parent.default_points % count
  const baseHrs = parseFloat((Number(parent.default_hours) / count).toFixed(2))

  await Promise.all(
    subs.map((sub, i) =>
      supabase
        .from('motions')
        .update({
          default_points: basePts + (i < remainderPts ? 1 : 0),
          default_hours: baseHrs,
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
