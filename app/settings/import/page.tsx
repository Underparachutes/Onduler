import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ImportFlow } from './ImportFlow'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('tracking_mode')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-6">Import from your AI</h1>
        <ImportFlow trackingMode={(settings?.tracking_mode as 'points' | 'hours') ?? 'points'} />
      </div>
    </div>
  )
}
