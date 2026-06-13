'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'

export async function completeOnboarding(
  swells: { name: string; color: string }[],
  motions: { name: string; swellIndices: number[]; points?: number; hours?: number }[],
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

  // Motion-derived weekly targets: "a week of showing up" for this swell.
  // Points = 4 logs/wk of each feeding motion; hours = 3 logs/wk (gentler,
  // since hour-denominated motions cost more per log). Swells left without
  // motions fall back to humble placeholders (12 pts / 3 hrs).
  const ptsBySwell = new Array<number>(swells.length).fill(0)
  const hrsBySwell = new Array<number>(swells.length).fill(0)
  motions.forEach(m => {
    m.swellIndices.forEach(idx => {
      ptsBySwell[idx] += m.points ?? 1
      hrsBySwell[idx] += m.hours ?? 1.0
    })
  })

  const swellRows = swells.map((s, i) => ({
    user_id: user.id,
    chapter_id: chapterId,
    name: s.name,
    color: s.color,
    sort_order: i,
    target_points: ptsBySwell[i] > 0 ? Math.ceil(4 * ptsBySwell[i]) : 12,
    target_hours: hrsBySwell[i] > 0 ? Math.ceil(4 * 3 * hrsBySwell[i]) / 4 : 3,
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
      default_points: m.points ?? 1,
      default_hours: m.hours ?? 1.0,
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

  // If this upsert fails and we redirect anyway, onboarding_complete stays
  // false and the dashboard bounces the user straight back here in a loop.
  // Surface the error instead.
  const { error: settingsErr } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    onboarding_complete: true,
    theme: prefs.theme,
    tracking_mode: prefs.tracking_mode,
    haptic_enabled: prefs.haptic_enabled,
    celebration_enabled: prefs.celebration_enabled,
    groups_enabled: false,
  })
  if (settingsErr) return { error: settingsErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/swells')
  redirect('/dashboard')
}

export async function setDailyGoal(goal: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: goalErr } = await supabase.from('user_settings').upsert({ user_id: user.id, daily_goal: goal })
  if (goalErr) return { error: goalErr.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function setDailyGoalHours(hours: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: hoursErr } = await supabase.from('user_settings').upsert({ user_id: user.id, daily_goal_hours: hours })
  if (hoursErr) return { error: hoursErr.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function setTrackingMode(mode: 'points' | 'hours') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: modeErr } = await supabase.from('user_settings').upsert({ user_id: user.id, tracking_mode: mode })
  if (modeErr) return { error: modeErr.message }

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
          const { error: swellUpdateErr } = await supabase
            .from('swells')
            .update({ target_hours: derived })
            .eq('id', s.id)
          if (swellUpdateErr) return { error: swellUpdateErr.message }
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
  const { error: celebErr } = await supabase.from('user_settings').upsert({ user_id: user.id, celebration_enabled: enabled })
  if (celebErr) return { error: celebErr.message }
  return { success: true }
}

export async function setHapticEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error: hapticErr } = await supabase.from('user_settings').upsert({ user_id: user.id, haptic_enabled: enabled })
  if (hapticErr) return { error: hapticErr.message }
  return { success: true }
}

export async function setGroupsEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: groupsErr } = await supabase.from('user_settings').upsert({ user_id: user.id, groups_enabled: enabled })
  if (groupsErr) return { error: groupsErr.message }

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

  const { error: hintErr } = await supabase.from('user_settings').upsert({ user_id: user.id, hints_seen: hints })
  if (hintErr) return { error: hintErr.message }

  return { success: true }
}

export async function setSubmotionsEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: subErr } = await supabase.from('user_settings').upsert({ user_id: user.id, submotions_enabled: enabled })
  if (subErr) return { error: subErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true }
}

export async function setEmailCycleCloseEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: emailErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, email_cycle_close_enabled: enabled })
  if (emailErr) return { error: emailErr.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function setProgressBarColor(color: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: colorErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, progress_bar_color: color })
  if (colorErr) return { error: colorErr.message }

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
  const { error: bgErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, background_url: url })
  if (bgErr) return { error: bgErr.message }

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

  const { error: removeErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, background_url: null })
  if (removeErr) return { error: removeErr.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function setBackgroundPosition(position: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: posErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, background_position: position })
  if (posErr) return { error: posErr.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function setAnchorTarget(target: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const clamped = Math.max(0, Math.min(7, Math.round(target)))
  const { error: anchorErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, anchor_target_per_week: clamped })
  if (anchorErr) return { error: anchorErr.message }

  revalidatePath('/anchors')
  revalidatePath('/settings')
  return { success: true }
}
