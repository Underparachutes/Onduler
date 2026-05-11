'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createDomain(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const weight = parseInt(formData.get('weight') as string) || 3
  const color = (formData.get('color') as string) || '#6366f1'

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('domains')
    .insert({ user_id: user.id, name, weight, color })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateDomain(id: string, prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const weight = parseInt(formData.get('weight') as string) || 3
  const color = (formData.get('color') as string) || '#6366f1'

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('domains')
    .update({ name, weight, color })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/domains/${id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteDomain(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('domains')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}
