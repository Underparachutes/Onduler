'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'

export async function createGroup(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#6366f1'

  if (!name) return { error: 'Name is required' }

  const chapterId = await getActiveChapterId(supabase, user.id)

  const { count } = await supabase
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId)

  const { error } = await supabase
    .from('groups')
    .insert({ user_id: user.id, chapter_id: chapterId, name, color, sort_order: count ?? 0 })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true }
}

export async function reorderGroups(ids: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await Promise.all(
    ids.map((id, i) =>
      supabase.from('groups').update({ sort_order: i }).eq('id', id).eq('user_id', user.id)
    )
  )

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateGroup(id: string, prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#6366f1'

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('groups')
    .update({ name, color })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { error: undefined, success: true }
}

export async function deleteGroup(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('groups').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard')
  revalidatePath('/settings')
}
