'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'

export async function recordWaveCheckin(
  energy: number,
  alignment: number,
  durationSeconds: number | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapterId = await getActiveChapterId(supabase, user.id)

  const { error: checkinErr } = await supabase.from('wave_checkins').insert({
    user_id: user.id,
    chapter_id: chapterId,
    energy,
    alignment,
    duration_seconds: durationSeconds,
  })
  if (checkinErr) return { error: checkinErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  return { success: true }
}
