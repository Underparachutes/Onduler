import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WaveGrid } from './WaveGrid'

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

export default async function WaveReturnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lastLogData } = await supabase
    .from('logs')
    .select('logged_at')
    .order('logged_at', { ascending: false })
    .limit(1)

  const lastLog = lastLogData?.[0] ?? null

  const durationSeconds = lastLog
    ? Math.floor((Date.now() - new Date(lastLog.logged_at).getTime()) / 1000)
    : null

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Welcome back.
        </h1>
        <p className="mb-8 text-sm text-th-muted">
          {durationSeconds !== null
            ? `You've been away for ${formatDuration(durationSeconds)}. `
            : ''}
          How'd the wave treat you?
        </p>
        <WaveGrid durationSeconds={durationSeconds} />
      </div>
    </div>
  )
}
