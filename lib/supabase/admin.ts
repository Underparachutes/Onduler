import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client for admin diagnostics. BYPASSES RLS — must
// only ever run server-side. The 'server-only' import above makes Next
// throw a build error if this module accidentally lands in a client bundle.
//
// Use this client only after requireAdmin() has verified the caller is an
// admin via lib/admin.ts.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'createAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env',
    )
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
