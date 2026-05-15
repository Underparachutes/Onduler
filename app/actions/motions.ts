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

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteMotion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('motions').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/settings')
}

export async function setMotionSwells(motionId: string, swellIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('motion_swells').delete().eq('motion_id', motionId)

  if (swellIds.length > 0) {
    await supabase.from('motion_swells').insert(
      swellIds.map(swell_id => ({ motion_id: motionId, swell_id }))
    )
  }

  revalidatePath('/swells')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function createSubmotion(parentId: string, name: string, defaultPoints: number, defaultHours: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const { error } = await supabase.from('motions').insert({
    user_id: user.id,
    name: trimmed,
    default_points: defaultPoints,
    default_hours: defaultHours,
    parent_id: parentId,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
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
