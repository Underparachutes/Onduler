'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createGoal(prevState: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) ?? '#6b7280'
  if (!name) return { error: 'Name required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('goals')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sort_order = (existing?.[0]?.sort_order ?? -1) + 1

  const { error } = await supabase
    .from('goals')
    .insert({ user_id: user.id, name, color, sort_order })

  if (error) return { error: error.message }
  revalidatePath('/goals')
  redirect('/goals')
}

export async function deleteGoal(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/goals')
  redirect('/goals')
}

export async function assignActivityToGoal(activityId: string, goalId: string | null): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('activities')
    .update({ goal_id: goalId })
    .eq('id', activityId)
    .eq('user_id', user.id)

  revalidatePath('/goals')
  redirect('/goals')
}
