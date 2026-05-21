import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pacificDayKey } from '@/lib/periods'
import { cycleContaining } from '@/lib/cycles'
import { NewAnchorForm } from './NewAnchorForm'

export default async function NewAnchorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Default-anchor the entry to the current week (Mon → Sun). Per spec, the
  // user can edit this; for the placeholder phase the form just shows the
  // cycle as a quiet pill so they know what window they're anchoring against.
  const todayKey = pacificDayKey(new Date())
  const cycle = cycleContaining(todayKey, 'week')

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <NewAnchorForm cycleStart={cycle.cycleStart} cycleEnd={cycle.cycleEnd} />
      </div>
    </div>
  )
}
