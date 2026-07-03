import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { dayKey } from '@/lib/periods'
import { getUserTimezone } from '@/lib/user-timezone'
import { cycleContaining } from '@/lib/cycles'
import { EditAnchorForm } from './EditAnchorForm'

export default async function EditAnchorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: anchor } = await supabase
    .from('reflections')
    .select('id, cycle_type, cycle_start, cycle_end, body_text, prompt_text')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!anchor?.id || anchor.cycle_type !== 'free') notFound()

  const tz = await getUserTimezone(user.id)
  const todayKey = dayKey(new Date(), tz)
  const thisWeek = cycleContaining(todayKey, 'week')
  // "Last week" = the week before the current one (Sun→Sat).
  const lastMonKey = (() => {
    const [y, m, d] = thisWeek.cycleStart.split('-').map(Number)
    const ms = Date.UTC(y, m - 1, d) - 7 * 86_400_000
    const dt = new Date(ms)
    const yy = dt.getUTCFullYear()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(dt.getUTCDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  })()
  const lastWeek = cycleContaining(lastMonKey, 'week')

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <EditAnchorForm
          id={anchor.id}
          bodyText={anchor.body_text ?? ''}
          promptText={anchor.prompt_text}
          cycleStart={anchor.cycle_start}
          cycleEnd={anchor.cycle_end}
          thisWeek={thisWeek}
          lastWeek={lastWeek}
        />
      </div>
    </div>
  )
}
