import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { ImportFlow } from './ImportFlow'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapterId = await getActiveChapterId(supabase, user.id)

  const [{ data: settings }, { count: swellCount }, { count: motionCount }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('tracking_mode')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('swells')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId),
    supabase
      .from('motions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId),
  ])

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-6">Import from your AI</h1>
        <ImportFlow
          trackingMode={(settings?.tracking_mode as 'points' | 'hours') ?? 'points'}
          hasExistingData={(swellCount ?? 0) > 0 || (motionCount ?? 0) > 0}
        />
      </div>
    </div>
  )
}
