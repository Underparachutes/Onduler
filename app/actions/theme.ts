'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { markHintSeen } from '@/app/actions/settings'

export async function setTheme(theme: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: themeErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, theme })
  if (themeErr) return { error: themeErr.message }

  revalidatePath('/', 'layout')
  await markHintSeen('settings')
  return { success: true }
}
