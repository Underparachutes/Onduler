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
    target_points: 100,
    target_hours: 5,
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

  // When switching to hours mode, auto-populate target_hours for swells that
  // only have target_points set, using the daily goal ratio (hrs/pts).
  if (mode === 'hours') {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('daily_goal, daily_goal_hours')
      .eq('user_id', user.id)
      .single()
    const dailyPts = settings?.daily_goal ?? 20
    const dailyHrs = Number(settings?.daily_goal_hours ?? 4)
    const ratio = dailyHrs / dailyPts

    const chapterId = await getActiveChapterId(supabase, user.id)
    const { data: swells } = await supabase
      .from('swells')
      .select('id, target_points, target_hours')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .is('target_hours', null)
      .not('target_points', 'is', null)

    if (swells && swells.length > 0) {
      for (const s of swells) {
        const derived = Math.round(s.target_points! * ratio * 4) / 4
        if (derived > 0) {
          await supabase
            .from('swells')
            .update({ target_hours: derived })
            .eq('id', s.id)
        }
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  revalidatePath('/anchors')
  revalidatePath('/settings')
  markHintSeen('settings')
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

export async function markHintSeen(key: 'motions' | 'swells' | 'anchors_locked' | 'anchors_unlocked' | 'settings') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: current } = await supabase
    .from('user_settings')
    .select('hints_seen')
    .eq('user_id', user.id)
    .single()

  const hints = (current?.hints_seen as Record<string, boolean>) ?? {}
  hints[key] = true

  await supabase.from('user_settings').upsert({ user_id: user.id, hints_seen: hints })

  return { success: true }
}

export async function setSubmotionsEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.from('user_settings').upsert({ user_id: user.id, submotions_enabled: enabled })

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true }
}

export async function setEmailCycleCloseEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, email_cycle_close_enabled: enabled })

  revalidatePath('/settings')
  return { success: true }
}

export async function setProgressBarColor(color: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, progress_bar_color: color })

  revalidatePath('/dashboard')
  revalidatePath('/anchors')
  return { success: true }
}

export async function uploadBackground(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/background.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('backgrounds')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from('backgrounds').getPublicUrl(path)

  const url = `${urlData.publicUrl}?v=${Date.now()}`
  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, background_url: url })

  revalidatePath('/', 'layout')
  return { success: true, url }
}

export async function removeBackground() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: files } = await supabase.storage.from('backgrounds').list(user.id)
  if (files && files.length > 0) {
    await supabase.storage.from('backgrounds').remove(files.map(f => `${user.id}/${f.name}`))
  }

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, background_url: null })

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function setBackgroundPosition(position: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, background_position: position })

  revalidatePath('/', 'layout')
}

export async function setAnchorTarget(target: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const clamped = Math.max(0, Math.min(7, Math.round(target)))
  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, anchor_target_per_week: clamped })

  revalidatePath('/anchors')
  revalidatePath('/settings')
  return { success: true }
}
