'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const DIFFICULTY_MULTIPLIER = { soft: 1, medium: 2, hard: 3 } as const
type Difficulty = keyof typeof DIFFICULTY_MULTIPLIER

export async function logActivity(activityId: string, domainId: string, difficulty: Difficulty) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: domain } = await supabase
    .from('domains')
    .select('weight')
    .eq('id', domainId)
    .eq('user_id', user.id)
    .single()

  if (!domain) return { error: 'Domain not found' }

  const points = DIFFICULTY_MULTIPLIER[difficulty] * domain.weight

  const { error } = await supabase
    .from('logs')
    .insert({ user_id: user.id, activity_id: activityId, domain_id: domainId, difficulty, points })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/domains/${domainId}`)
  revalidatePath('/dashboard')
  return { success: true }
}
