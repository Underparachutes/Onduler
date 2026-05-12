'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setTheme(theme: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, theme })

  revalidatePath('/', 'layout')
  return { success: true }
}
