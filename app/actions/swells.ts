'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSwell(prevState: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) ?? '#6b7280'
  const targetPointsRaw = (formData.get('target_points') as string) || ''
  const targetHoursRaw = (formData.get('target_hours') as string) || ''

  if (!name) return { error: 'Name required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('swells')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = (existing?.[0]?.sort_order ?? -1) + 1
  const target_points = targetPointsRaw ? parseInt(targetPointsRaw) || null : null
  const target_hours = targetHoursRaw ? parseFloat(targetHoursRaw) || null : null

  const { error } = await supabase
    .from('swells')
    .insert({ user_id: user.id, name, color, sort_order, target_points, target_hours })

  if (error) return { error: error.message }
  revalidatePath('/swells')
  return { success: true }
}

export async function updateSwell(id: string, prevState: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const color = formData.get('color') as string
  const targetPointsRaw = (formData.get('target_points') as string) || ''
  const targetHoursRaw = (formData.get('target_hours') as string) || ''

  if (!name) return { error: 'Name required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const target_points = targetPointsRaw ? parseInt(targetPointsRaw) || null : null
  const target_hours = targetHoursRaw ? parseFloat(targetHoursRaw) || null : null

  await supabase
    .from('swells')
    .update({ name, color, target_points, target_hours })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/swells')
  return { success: true }
}

export async function deleteSwell(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('swells').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/swells')
}

// Hide / restore a swell. Hidden swells stay in the database with all their
// logs, motions, and contributions intact — they just disappear from
// user-visible aggregation surfaces (dashboard, /log radar, /swells main
// list). Restored from the "Hidden swells" expander on the swells page.
export async function setSwellHidden(id: string, hidden: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('swells')
    .update({ hidden })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/swells')
  revalidatePath('/dashboard')
  revalidatePath('/log')
  revalidatePath(`/swells/${id}`)
  return { success: true }
}

export async function setSwellGroup(swellId: string, groupId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('swells')
    .update({ group_id: groupId })
    .eq('id', swellId)
    .eq('user_id', user.id)

  revalidatePath('/swells')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function reorderSwells(orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('swells').update({ sort_order: index }).eq('id', id).eq('user_id', user.id)
    )
  )

  revalidatePath('/swells')
}

// Single-target edit used by the Logs radar drag. Caller passes the
// currency it's in so we don't blow away the other currency's target.
export async function updateSwellTarget(
  id: string,
  currency: 'points' | 'hours',
  value: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!isFinite(value) || value < 0) return { error: 'Invalid target' }

  const patch = currency === 'hours'
    ? { target_hours: value === 0 ? null : value }
    : { target_points: value === 0 ? null : Math.round(value) }

  const { error } = await supabase
    .from('swells')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/log')
  revalidatePath('/swells')
  return { success: true }
}

export async function updateSwellDirect(
  id: string,
  name: string,
  color: string,
  targetPoints: number | null,
  targetHours: number | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required' }

  const { error } = await supabase
    .from('swells')
    .update({ name: trimmed, color, target_points: targetPoints, target_hours: targetHours })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/swells')
  return { success: true }
}

