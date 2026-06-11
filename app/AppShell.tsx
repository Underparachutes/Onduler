import { createClient } from '@/lib/supabase/server'
import { TimezoneSync } from './components/TimezoneSync'
import { BottomNav } from './components/BottomNav'
import { SideNav } from './components/SideNav'
import { ThemeApplier } from './components/ThemeApplier'
import { BackgroundApplier } from './components/BackgroundApplier'
import { BrandColorApplier } from './components/BrandColorApplier'
import { PinTopApplier } from './components/PinTopApplier'
import { fetchAnyCeremonyPending } from './actions/reflections'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let theme = 'biarritz'
  let pendingAnchor = false
  let backgroundUrl: string | null = null
  let backgroundPosition = 'center'
  let brandColor: string | null = null
  if (user) {
    const [{ data }, anyPending] = await Promise.all([
      supabase.from('user_settings').select('theme, background_url, background_position, progress_bar_color').eq('user_id', user.id).single(),
      fetchAnyCeremonyPending(supabase, user.id),
    ])
    if (data?.theme) theme = data.theme
    if (data?.background_url) backgroundUrl = data.background_url
    if (data?.background_position) backgroundPosition = data.background_position as string
    if (data?.progress_bar_color) brandColor = data.progress_bar_color as string
    pendingAnchor = anyPending
  }

  return (
    <>
      <ThemeApplier theme={theme} />
      <BrandColorApplier color={brandColor} />
      <BackgroundApplier url={backgroundUrl} position={backgroundPosition} />
      <PinTopApplier />
      <TimezoneSync />
      {user && <SideNav pendingAnchor={pendingAnchor} />}
      <div className="mx-auto flex w-full max-w-lg flex-col flex-1 md:mx-0 md:ml-12 md:mr-auto lg:max-w-4xl">
        {children}
      </div>
      {user && <BottomNav pendingAnchor={pendingAnchor} />}
    </>
  )
}
