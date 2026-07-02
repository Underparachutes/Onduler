import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Per-user unsubscribe handler. Accepts the per-user token issued at
// signup (and rotated on demand later if we ever need to invalidate
// outstanding emails).
//
// GET does NOT mutate: mail scanners, Apple Mail Privacy Protection, and
// Outlook SafeLinks *prefetch* links, and a stateful GET would silently
// unsubscribe testers. So GET only renders a "Confirm unsubscribe" page;
// the actual flip happens on POST (the confirm button, or the RFC 8058
// List-Unsubscribe-Post One-Click action that Gmail/Apple Mail send).
//
// Validation is by token equality; the token is a UUID with ~122 bits
// of entropy. Tokens are scoped to the unsubscribe action only, so a
// leak doesn't elevate to anything else.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET is safe/idempotent: send the visitor to a confirmation page whose
// button POSTs back here. No state change.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://onduler.app'
  if (!token) {
    return NextResponse.redirect(`${appUrl}/unsubscribed?status=invalid`, 303)
  }
  return NextResponse.redirect(
    `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`,
    303,
  )
}

// POST performs the unsubscribe (confirm-page button or One-Click header).
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
    .update({ email_cycle_close_enabled: false })
    .eq('user_id', row.user_id)

  if (updateErr) {
    return NextResponse.redirect(`${appUrl}/unsubscribed?status=error`, 303)
  }

  return NextResponse.redirect(`${appUrl}/unsubscribed?status=ok&token=${token}`, 303)
}
