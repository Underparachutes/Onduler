import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Resolve a user's stored IANA timezone (per-user-timezone effort). Falls back
// to Pacific — the app's historical default — when unset. `cache` dedupes the
// lookup within a single request, so multiple call sites for the same user
// don't each hit the DB. Pages that already load `user_settings` should read
// `settings.timezone` directly instead of calling this. See
// docs/specs/per-user-timezone-2026-07-03.md.
export const getUserTimezone = cache(async (userId: string): Promise<string> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.timezone as string | undefined) || 'America/Los_Angeles'
})
