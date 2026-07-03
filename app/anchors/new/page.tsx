import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dayKey, sundayOf, addDays } from '@/lib/periods'
import { getUserTimezone } from '@/lib/user-timezone'
import { cycleContaining } from '@/lib/cycles'
import { NewAnchorForm } from './NewAnchorForm'

export default async function NewAnchorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tz = await getUserTimezone(user.id)
  const todayKey = dayKey(new Date(), tz)
  const thisWeek = cycleContaining(todayKey, 'week')
  const lastWeekSunday = addDays(thisWeek.cycleStart, -7)
  const lastWeek = cycleContaining(lastWeekSunday, 'week')

  const { data: chapter } = await supabase
    .from('chapters')
    .select('started_at')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()

  const chapterStartKey = chapter?.started_at ? dayKey(chapter.started_at, tz) : todayKey
  const showLastWeek = sundayOf(chapterStartKey) < thisWeek.cycleStart

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <NewAnchorForm
          thisWeek={thisWeek}
          lastWeek={lastWeek}
          showLastWeek={showLastWeek}
        />

        <Link
          href="/anchors/journal"
          className="mt-6 block text-center text-xs text-th-secondary transition-colors hover:text-th-text"
        >
          Your past anchors
        </Link>
      </div>
    </div>
  )
}
