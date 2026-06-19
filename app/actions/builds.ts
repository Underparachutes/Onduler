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

// E2EE: swell names are encrypted client-side, so the operator can't read them
// — which means dedup-against-existing and the preset-name check can no longer
// happen here (both require reading names). The client (ShapePicker) decrypts
// its existing names, dedups the preset's swells against them, and passes the
// survivors ALREADY ENCRYPTED. This action inserts them blindly. Color, sort,
// and targets are non-sensitive and stay server-side. Inert until migration:
// pre-encryption the client passes plaintext, which inserts fine.
export async function adoptBuild(
  slot: BuildSlot,
  key: string,
  encryptedSwellNames: string[],
  mode: ThemeMode = 'light'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!isValidBuildKey(key)) return { error: 'Invalid build key' }

  if (encryptedSwellNames.length > 0) {
    const chapterId = await getActiveChapterId(supabase, user.id)
    const [{ data: settings }, { data: lastSwell }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('theme, tracking_mode')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('swells')
        .select('sort_order')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .order('sort_order', { ascending: false })
        .limit(1),
    ])

    const palette = getShuffledThemePalette(settings?.theme ?? 'biarritz', mode)
    const isHours = (settings?.tracking_mode ?? 'points') === 'hours'
    const baseSortOrder = (lastSwell?.[0]?.sort_order ?? -1) + 1

    const rows = encryptedSwellNames.map((name, i) => ({
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
