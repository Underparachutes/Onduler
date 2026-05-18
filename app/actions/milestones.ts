'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type MilestoneKind = 'recurring' | 'one_shot'
type Cadence = 'weekly' | 'monthly'

export async function createMilestone(
  swellId: string,
  kind: MilestoneKind,
  name: string,
  cadence: Cadence | null,
) {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name required' }
  if (kind !== 'recurring' && kind !== 'one_shot') return { error: 'Invalid kind' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('milestones').insert({
    user_id: user.id,
    swell_id: swellId,
    name: trimmed,
    kind,
    cadence: kind === 'recurring' ? cadence ?? 'weekly' : null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  return { success: true }
}

export async function renameMilestone(milestoneId: string, name: string, swellId: string) {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('milestones')
    .update({ name: trimmed })
    .eq('id', milestoneId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  return { success: true }
}

export async function deleteMilestone(milestoneId: string, swellId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  return { success: true }
}

export async function setOneShotComplete(milestoneId: string, completed: boolean, swellId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('milestones')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', milestoneId)
    .eq('user_id', user.id)
    .eq('kind', 'one_shot')

  if (error) return { error: error.message }
  revalidatePath(`/swells/${swellId}`)
  return { success: true }
}
