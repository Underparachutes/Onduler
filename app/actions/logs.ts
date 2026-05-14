'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTodayStart } from '@/lib/timezone'

export async function quickLogMotion(motionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: motion } = await supabase
    .from('motions')
    .select('default_points, default_hours')
    .eq('id', motionId)
    .eq('user_id', user.id)
    .single()

  if (!motion) return { error: 'Motion not found' }

  const { error } = await supabase
    .from('logs')
    .insert({
      user_id: user.id,
      motion_id: motionId,
      points: motion.default_points,
      hours: motion.default_hours,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/log')
  return { success: true }
}

export async function unlogMotion(motionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const todayStart = await getTodayStart()

  const { data: logs } = await supabase
    .from('logs')
    .select('id')
    .eq('motion_id', motionId)
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())
    .order('logged_at', { ascending: false })
    .limit(1)

  const log = logs?.[0]
  if (!log) return { error: 'No log found' }

  await supabase.from('logs').delete().eq('id', log.id)

  revalidatePath('/dashboard')
  revalidatePath('/log')
  return { success: true }
}
