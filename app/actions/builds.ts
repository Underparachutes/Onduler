'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { BUILD_PRESETS, type BuildKey } from '@/lib/builds'
import { getShuffledThemePalette, type ThemeMode } from '@/lib/theme-colors'

type BuildSlot = 'primary' | 'secondary'

const VALID_KEYS = new Set(BUILD_PRESETS.map(p => p.key))

function isValidBuildKey(key: unknown): key is BuildKey {
  return typeof key === 'string' && VALID_KEYS.has(key as BuildKey)
}

export async function setBuildSlot(slot: BuildSlot, key: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (key !== null && !isValidBuildKey(key)) return { error: 'Invalid build key' }

  const column = slot === 'primary' ? 'primary_build' : 'secondary_build'
  const { error: slotErr } = await supabase.from('user_settings').upsert({ user_id: user.id, [column]: key })
  if (slotErr) return { error: slotErr.message }

  revalidatePath('/settings')
  revalidatePath('/settings/shape')
  return { success: true }
}

export async function adoptBuild(
  slot: BuildSlot,
  key: string,
  swellNamesToCreate: string[],
  mode: ThemeMode = 'light'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!isValidBuildKey(key)) return { error: 'Invalid build key' }

  const preset = BUILD_PRESETS.find(p => p.key === key)
  if (!preset) return { error: 'Preset not found' }

  const requestedSet = new Set(swellNamesToCreate)
  const allowedNames = preset.seededSwells.filter(n => requestedSet.has(n))

  if (allowedNames.length > 0) {
    const chapterId = await getActiveChapterId(supabase, user.id)
    const [{ data: settings }, { data: existing }, { data: lastSwell }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('theme, tracking_mode')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('swells')
        .select('name')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId),
      supabase
        .from('swells')
        .select('sort_order')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .order('sort_order', { ascending: false })
        .limit(1),
    ])

    const existingLowered = new Set((existing ?? []).map(s => s.name.trim().toLowerCase()))
    const toInsertNames = allowedNames.filter(n => !existingLowered.has(n.trim().toLowerCase()))

    if (toInsertNames.length > 0) {
      const palette = getShuffledThemePalette(settings?.theme ?? 'biarritz', mode)
      const isHours = (settings?.tracking_mode ?? 'points') === 'hours'
      const baseSortOrder = (lastSwell?.[0]?.sort_order ?? -1) + 1

      const rows = toInsertNames.map((name, i) => ({
        user_id: user.id,
        chapter_id: chapterId,
        name,
        color: palette[i % palette.length],
        sort_order: baseSortOrder + i,
        target_points: isHours ? null : 4,
        target_hours: isHours ? 3 : null,
      }))

      const { error: insertErr } = await supabase.from('swells').insert(rows)
      if (insertErr) return { error: insertErr.message }
    }
  }

  const column = slot === 'primary' ? 'primary_build' : 'secondary_build'
  const { error: upsertErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, [column]: key })
  if (upsertErr) return { error: upsertErr.message }

  revalidatePath('/settings')
  revalidatePath('/settings/shape')
  revalidatePath('/swells')
  revalidatePath('/dashboard')
  return { success: true }
}
