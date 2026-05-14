'use server'

import { redirect } from 'next/navigation'
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
  redirect('/swells')
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
  redirect('/swells')
}

export async function deleteSwell(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('swells').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/swells')
  redirect('/swells')
}
