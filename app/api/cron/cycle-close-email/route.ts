import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import {
  cycleCloseHtml,
  cycleCloseSubject,
  cycleCloseText,
} from '@/lib/email-templates'
import {
  closedWeekFor,
  cycleContaining,
  type Cadence,
} from '@/lib/cycles'
import { pacificDayKey, type DayKey } from '@/lib/periods'
import {
  CEREMONY_FLOOR,
  UNLOCK_FLOOR,
  unlockedForCadence,
} from '@/lib/unlocks'

// Vercel Cron POSTs to this route every Sunday morning Pacific time. The
// route iterates users, decides who should receive a weekly cycle-close
// email, and sends. Idempotent via user_settings.last_cycle_email_cycle_start:
// if a retry happens within the same week, already-sent users are skipped.
//
// Auth: Vercel signs cron calls with the value of CRON_SECRET in an
// Authorization: Bearer <token> header (when configured). We require it
// so an unauthenticated POST from the public internet can't trigger the
// send. CRON_SECRET is set in Vercel project env.
//
// Eligibility rules per user:
//   - User has a row in user_settings (so we know their preference)
//   - email_cycle_close_enabled is true (or, charitably, null/default)
//   - They have an active chapter
//   - The closed cycle has >= UNLOCK_FLOOR (first time) or
//     >= CEREMONY_FLOOR (subsequent cycles) distinct log days. Wave-cycle
//     users (zero logs) explicitly do not get an email — ADR 0007's
//     "no ceremony, no indicator" rule applies to the email too.
//   - No reflection row already exists for the cycle (they didn't already
//     complete it on Saturday night)
//   - last_cycle_email_cycle_start != cycle.cycleStart (idempotency)

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CADENCE: Cadence = 'week'  // v1 ships weekly only

type CandidateRow = {
  user_id: string
  email: string | null
  email_unsubscribe_token: string
  last_cycle_email_cycle_start: string | null
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // No secret configured. Only allow the open bypass outside production
    // (local dev, so we can curl it). If the env var is ever missing or
    // misnamed in prod, fail closed — otherwise anyone on the public
    // internet could trigger the send.
    return process.env.NODE_ENV !== 'production'
  }
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  return handleCron(request)
}
export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const dryRun = request.nextUrl.searchParams.get('dry') === '1'

  const supabase = createAdminClient()
  const todayKey = pacificDayKey(new Date())
  const cycle = closedWeekFor(todayKey)

  // Pull every user_settings row + the user's email (joined from auth.users
  // via a separate call — Supabase JS doesn't let us join across the auth
  // schema in a single .select). Two round-trips, fine at our user count.
  const { data: settings, error: settingsErr } = await supabase
    .from('user_settings')
    .select('user_id, email_unsubscribe_token, last_cycle_email_cycle_start')
    .eq('email_cycle_close_enabled', true)

  if (settingsErr) {
    return Response.json(
      { error: 'settings_query_failed', detail: settingsErr.message },
      { status: 500 },
    )
  }
  const candidateRows = (settings ?? []) as CandidateRow[]

  // Fetch emails for these users. Service-role client can read auth.users.
  const userIds = candidateRows.map(r => r.user_id)
  const emailMap = new Map<string, string>()
  for (const id of userIds) {
    const { data: u } = await supabase.auth.admin.getUserById(id)
    if (u?.user?.email) emailMap.set(id, u.user.email)
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://onduler.app'
  const anchorsUrl = `${appUrl}/anchors`
  const sendResults: { user_id: string; status: string; detail?: string }[] = []

  for (const row of candidateRows) {
    const email = emailMap.get(row.user_id)
    if (!email) {
      sendResults.push({ user_id: row.user_id, status: 'skip_no_email' })
      continue
    }

    // Idempotency: if we already sent for this cycle, skip.
    if (row.last_cycle_email_cycle_start === cycle.cycleStart) {
      sendResults.push({ user_id: row.user_id, status: 'skip_already_sent' })
      continue
    }

    // Active chapter for this user.
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('user_id', row.user_id)
      .is('ended_at', null)
      .maybeSingle()
    if (!chapter?.id) {
      sendResults.push({ user_id: row.user_id, status: 'skip_no_chapter' })
      continue
    }

    // Logs within the chapter, used to compute floors + unlock state.
    const { data: logs } = await supabase
      .from('logs')
      .select('logged_at')
      .eq('user_id', row.user_id)
      .eq('chapter_id', chapter.id)
    const logDays = new Set<DayKey>()
    for (const l of logs ?? []) logDays.add(pacificDayKey(l.logged_at))

    // Did the user log inside the just-closed week at all? Floor check.
    const closedCycleDays = Array.from(logDays).filter(
      d => d >= cycle.cycleStart && d <= cycle.cycleEnd,
    ).length

    const isUnlocked = unlockedForCadence(logDays, CADENCE, todayKey, cycleContaining)
    const floor = isUnlocked ? CEREMONY_FLOOR[CADENCE] : UNLOCK_FLOOR[CADENCE]
    if (closedCycleDays < floor) {
      sendResults.push({ user_id: row.user_id, status: 'skip_below_floor' })
      continue
    }

    // Did they already complete the ceremony before we got here?
    const { data: existing } = await supabase
      .from('reflections')
      .select('id')
      .eq('user_id', row.user_id)
      .eq('chapter_id', chapter.id)
      .eq('cycle_type', CADENCE)
      .eq('cycle_start', cycle.cycleStart)
      .maybeSingle()
    if (existing?.id) {
      sendResults.push({ user_id: row.user_id, status: 'skip_already_completed' })
      continue
    }

    const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?token=${row.email_unsubscribe_token}`
    const args = { cadence: CADENCE, cycle, anchorsUrl, unsubscribeUrl }
    const subject = cycleCloseSubject(args)
    const html = cycleCloseHtml(args)
    const text = cycleCloseText(args)

    if (dryRun) {
      sendResults.push({ user_id: row.user_id, status: 'dry_run' })
      continue
    }

    try {
      const result = await sendEmail({ to: email, subject, html, text, unsubscribeUrl })
      if (result.error) {
        sendResults.push({
          user_id: row.user_id,
          status: 'send_error',
          detail: result.error.message,
        })
        continue
      }
      // Mark idempotency anchor after successful send.
      await supabase
        .from('user_settings')
        .update({ last_cycle_email_cycle_start: cycle.cycleStart })
        .eq('user_id', row.user_id)
      sendResults.push({ user_id: row.user_id, status: 'sent' })
    } catch (err) {
      sendResults.push({
        user_id: row.user_id,
        status: 'send_throw',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Aggregate by status so the default response never carries user_ids.
  const statusCounts: Record<string, number> = {}
  for (const r of sendResults) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  }

  return Response.json({
    today: todayKey,
    cycle,
    cadence: CADENCE,
    dryRun,
    total_candidates: candidateRows.length,
    sent: statusCounts['sent'] ?? 0,
    status_counts: statusCounts,
    // Per-user detail includes user_ids, so only expose it in dry-run mode
    // (used for local/manual inspection). A real send response leaks nothing.
    ...(dryRun ? { results: sendResults } : {}),
  })
}
