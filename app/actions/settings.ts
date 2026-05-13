'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setDomainsEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, domains_enabled: enabled })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/manage')
  revalidatePath('/log')
  return { success: true }
}
