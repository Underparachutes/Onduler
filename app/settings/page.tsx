import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveChapterId } from '@/lib/chapters'
import { signOut } from '@/app/actions/auth'
import { SettingsPanel } from './SettingsPanel'
import { HintCard } from '@/app/components/HintCard'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    chapterId,
    { data: settings },
  ] = await Promise.all([
    getActiveChapterId(supabase, user.id),
    supabase
      .from('user_settings')
      .select('theme, groups_enabled, submotions_enabled, daily_goal, daily_goal_hours, tracking_mode, celebration_enabled, haptic_enabled, primary_build, is_admin, subscription_status, hints_seen, email_cycle_close_enabled')
      .eq('user_id', user.id)
      .single(),
  ])

  const [
    { data: groups },
    { data: hiddenMotions },
    { data: assignableMotions },
    { data: assignableSwells },
    { count: archivedChapterCount },
  ] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, color')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('sort_order'),
    supabase
      .from('motions')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', true)
      .order('name', { ascending: true }),
    supabase
      .from('motions')
      .select('id, name, group_id')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('hidden', false)
      .is('parent_id', null)
      .order('name', { ascending: true }),
    supabase
      .from('swells')
      .select('id, name, color, group_id')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('name', { ascending: true }),
    supabase
      .from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('ended_at', 'is', null),
  ])

  return (
    <div className="flex min-h-full flex-col items-center px-4 lg:items-start">
      <div className="sticky top-0 z-10 w-full max-w-[22rem] bg-th-bg pb-3 lg:max-w-none" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <div className="mb-2 flex items-center justify-between lg:max-w-[22rem]">
          <p className="text-xs uppercase tracking-widest text-th-muted">Onduler</p>
        </div>
        <h1 className="text-2xl font-semibold text-th-text lg:max-w-[22rem]">Settings</h1>
      </div>

      <div className="w-full max-w-[22rem] pb-12 lg:max-w-none">
        <HintCard hintKey="settings" seen={!!((settings?.hints_seen as Record<string, boolean>)?.settings)}>
          <p>Everything's tunable here. Themes, tracking mode, your starter set. Nothing locked in.</p>
        </HintCard>
        <SettingsPanel
          theme={settings?.theme ?? 'biarritz'}
          groupsEnabled={settings?.groups_enabled ?? false}
          submotionsEnabled={settings?.submotions_enabled ?? false}
          dailyGoal={settings?.daily_goal ?? 20}
          dailyGoalHours={Number(settings?.daily_goal_hours ?? 4)}
          trackingMode={(settings?.tracking_mode as 'points' | 'hours') ?? 'points'}
          celebrationEnabled={settings?.celebration_enabled ?? true}
          hapticEnabled={settings?.haptic_enabled ?? true}
          primaryBuild={settings?.primary_build ?? null}
          email={user.email ?? ''}
          groups={groups ?? []}
          hiddenMotions={hiddenMotions ?? []}
          assignableMotions={assignableMotions ?? []}
          assignableSwells={assignableSwells ?? []}
          archivedChapterCount={archivedChapterCount ?? 0}
          isAdmin={settings?.is_admin ?? false}
          subscriptionStatus={settings?.subscription_status ?? 'none'}
          emailCycleCloseEnabled={settings?.email_cycle_close_enabled ?? true}
        />
      </div>

      <div className="h-24" />

      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 md:left-60 z-10 bg-th-bg">
        <div className="mx-auto max-w-lg px-4 md:mx-0 md:ml-12 md:mr-auto lg:max-w-4xl">
          <div className="border-t border-th-border pt-3 pb-3 flex flex-col gap-2 max-w-[22rem] lg:max-w-none">
          <a
            href="mailto:ondulertest@gmail.com?subject=Onduler feedback"
            className="text-sm font-medium text-th-secondary transition-colors hover:text-th-text active:scale-[0.97]"
          >
            Send feedback
          </a>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-th-faint transition-colors hover:text-red-500 active:scale-[0.97]"
            >
              Sign out
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}
