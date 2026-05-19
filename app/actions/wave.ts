'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function recordWaveCheckin(
  energy: number,
  alignment: number,
  durationSeconds: number | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('wave_checkins').insert({
    user_id: user.id,
    energy,
    alignment,
    duration_seconds: durationSeconds,
  })

  revalidatePath('/dashboard')
  revalidatePath('/reflections')
}
