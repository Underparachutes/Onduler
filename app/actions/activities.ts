'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createActivity(domainId: string, prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const defaultPoints = parseInt(formData.get('default_points') as string) || 1

  if (!name) return { error: 'Name is required' }

  const { error } = await supabase
    .from('activities')
    .insert({ user_id: user.id, domain_id: domainId, name, default_points: defaultPoints })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/domains/${domainId}`)
  return { success: true }
}

export async function deleteActivity(id: string, domainId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath(`/dashboard/domains/${domainId}`)
}
