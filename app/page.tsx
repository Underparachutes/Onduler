import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from './LandingPage'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { utm_source } = await searchParams
  return <LandingPage source={utm_source ?? null} />
}
