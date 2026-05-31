import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Mirror of /api/email/unsubscribe — same token check, flips the flag
// back on. Used by the "Resubscribe" button on /unsubscribed for the
// case where someone clicked the link by accident. Accepts GET so the
// confirmation page can link straight to it.

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
    .update({ email_cycle_close_enabled: true })
    .eq('user_id', row.user_id)

  if (updateErr) {
    return NextResponse.redirect(`${appUrl}/unsubscribed?status=error`, 303)
  }

  return NextResponse.redirect(`${appUrl}/unsubscribed?status=resubscribed`, 303)
}

export async function GET(request: NextRequest) { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }
