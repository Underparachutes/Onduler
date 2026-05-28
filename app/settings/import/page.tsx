import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
          <Link
            href="/settings"
            className="text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Settings
          </Link>
        </div>
        <h1 className="mb-6">Import from your AI</h1>
        <ImportFlow trackingMode={(settings?.tracking_mode as 'points' | 'hours') ?? 'points'} />
      </div>
    </div>
  )
}
