'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setupAndCompleteOnboarding(
  motions: { name: string; default_points: number }[],
  theme: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (motions.length > 0) {
    await supabase.from('motions').insert(
      motions.map(m => ({
        user_id: user.id,
        name: m.name,
        default_points: m.default_points,
        default_hours: 1.0,
      }))
    )
  }

  await supabase.from('user_settings').upsert({
    user_id: user.id,
    onboarding_complete: true,
    theme,
  })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function setDailyGoal(goal: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({ user_id: user.id, daily_goal: goal })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function setCelebrationEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  await supabase.from('user_settings').upsert({ user_id: user.id, celebration_enabled: enabled })
  return { success: true }
}

export async function setHapticEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  await supabase.from('user_settings').upsert({ user_id: user.id, haptic_enabled: enabled })
  return { success: true }
}

export async function setGroupsEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({ user_id: user.id, groups_enabled: enabled })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/manage')
  revalidatePath('/log')
  return { success: true }
}
