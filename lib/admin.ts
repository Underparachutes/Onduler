import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Server-side admin gate. Call at the top of every /admin server page.
// Non-admins (including signed-out users) get a 404 so the admin path
// stays invisible. Returns the authenticated admin user when allowed.
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!settings?.is_admin) notFound()

  return user
}
