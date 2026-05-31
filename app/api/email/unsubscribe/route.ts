import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One-click unsubscribe handler. Accepts the per-user token issued at
// signup (and rotated on demand later if we ever need to invalidate
// outstanding emails). Flips email_cycle_close_enabled to false and
// redirects to a confirmation page. Accepts GET (link click) and POST
// (the RFC 8058 List-Unsubscribe one-click action that Gmail and
// Apple Mail use natively when the header is present).
//
// Validation is by token equality; the token is a UUID with ~122 bits
// of entropy. Tokens are scoped to the unsubscribe action only, so a
// leak doesn't elevate to anything else.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(request: NextRequest) {
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

export async function GET(request: NextRequest) { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }
