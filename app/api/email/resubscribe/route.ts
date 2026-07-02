import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Mirror of /api/email/unsubscribe — same token check, flips the flag
// back on. Used by the "Resubscribe" button on /unsubscribed. Mutates on
// POST only (the button is a form POST); a GET must not flip state, since
// link prefetchers would silently resubscribe someone who just left.
// A stray GET just bounces back to the confirmation page.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://onduler.app'
  const suffix = token ? `&token=${encodeURIComponent(token)}` : ''
  return NextResponse.redirect(`${appUrl}/unsubscribed?status=ok${suffix}`, 303)
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://onduler.app'

  if (!token) {
    return NextResponse.redirect(`${appUrl}/unsubscribed?status=invalid`, 303)
  }

  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('email_unsubscribe_token', token)
    .maybeSingle()

  if (error || !row?.user_id) {
    return NextResponse.redirect(`${appUrl}/unsubscribed?status=invalid`, 303)
  }

  const { error: updateErr } = await supabase
    .from('user_settings')
    .update({ email_cycle_close_enabled: true })
    .eq('user_id', row.user_id)

  if (updateErr) {
    return NextResponse.redirect(`${appUrl}/unsubscribed?status=error`, 303)
  }

  return NextResponse.redirect(`${appUrl}/unsubscribed?status=resubscribed`, 303)
}
