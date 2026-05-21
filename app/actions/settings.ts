'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'

export async function completeOnboarding(
  swells: { name: string; color: string }[],
  motions: { name: string; swellIndices: number[] }[],
  prefs: {
    theme: string
    tracking_mode: 'points' | 'hours'
    haptic_enabled: boolean
    celebration_enabled: boolean
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (swells.length === 0) return { error: 'At least one swell is required' }

  const chapterId = await getActiveChapterId(supabase, user.id)

  const isHours = prefs.tracking_mode === 'hours'
  const swellRows = swells.map((s, i) => ({
    user_id: user.id,
    chapter_id: chapterId,
    name: s.name,
    color: s.color,
    sort_order: i,
    target_points: isHours ? null : 100,
    target_hours: isHours ? 5 : null,
  }))

  const { data: insertedSwells, error: swellErr } = await supabase
    .from('swells')
    .insert(swellRows)
    .select('id')

  if (swellErr) return { error: swellErr.message }
  if (!insertedSwells) return { error: 'Failed to create swells' }

  if (motions.length > 0) {
    const motionRows = motions.map((m, i) => ({
      user_id: user.id,
      chapter_id: chapterId,
      name: m.name,
      default_points: 1,
      default_hours: 1.0,
      sort_order: i,
    }))

    const { data: insertedMotions, error: motionErr } = await supabase
      .from('motions')
      .insert(motionRows)
      .select('id')

    if (motionErr) return { error: motionErr.message }
    if (!insertedMotions) return { error: 'Failed to create motions' }

    const links: { motion_id: string; swell_id: string; contribution_weight: number }[] = []
    motions.forEach((m, motionIdx) => {
      m.swellIndices.forEach(swellIdx => {
        const motionRow = insertedMotions[motionIdx]
        const swellRow = insertedSwells[swellIdx]
        if (motionRow && swellRow) {
          links.push({
            motion_id: motionRow.id,
            swell_id: swellRow.id,
            contribution_weight: 1.0,
          })
        }
      })
    })

    if (links.length > 0) {
      const { error: linkErr } = await supabase.from('motion_swells').insert(links)
      if (linkErr) return { error: linkErr.message }
    }
  }

  await supabase.from('user_settings').upsert({
    user_id: user.id,
    onboarding_complete: true,
    theme: prefs.theme,
    tracking_mode: prefs.tracking_mode,
    haptic_enabled: prefs.haptic_enabled,
    celebration_enabled: prefs.celebration_enabled,
    groups_enabled: false,
  })

  revalidatePath('/dashboard')
  revalidatePath('/swells')
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

export async function setDailyGoalHours(hours: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({ user_id: user.id, daily_goal_hours: hours })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function setTrackingMode(mode: 'points' | 'hours') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({ user_id: user.id, tracking_mode: mode })

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/anchors')
  revalidatePath('/settings')
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
  revalidatePath('/anchors')
  revalidatePath('/settings')
  return { success: true }
}
