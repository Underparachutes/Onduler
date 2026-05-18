import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShapePicker } from './ShapePicker'

export default async function ShapePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: settings }, { data: swells }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('primary_build, secondary_build')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('swells')
      .select('name')
      .eq('user_id', user.id),
  ])

  const existingSwellNames = (swells ?? []).map(s => s.name)

  return (
    <ShapePicker
      primary={settings?.primary_build ?? null}
      secondary={settings?.secondary_build ?? null}
      existingSwellNames={existingSwellNames}
    />
  )
}
