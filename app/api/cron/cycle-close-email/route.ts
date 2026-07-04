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
import { dayKey, sundayKey, addDays, type DayKey } from '@/lib/periods'
import { startOfDayUtc, hourInTz } from '@/lib/timezone'
import {
  CEREMONY_FLOOR,
  UNLOCK_FLOOR,
  unlockedForCadence,
} from '@/lib/unlocks'

// An external scheduler POSTs to this route HOURLY (Vercel Hobby can't do
// sub-daily native cron — see docs/specs/per-user-timezone-2026-07-03.md).
// Each run sends the weekly cycle-close email to every user who has just
// entered their local send window, so 8am-Sunday sweeps westward across
// timezones over ~24h — "ceremonies rolling across the globe." Idempotent via
// user_settings.last_cycle_email_cycle_start: a user is sent at most once per
// local week no matter how many hourly triggers hit their window.
//
// Auth: the scheduler sends the CRON_SECRET in an Authorization: Bearer
// <token> header. We require it so an unauthenticated POST from the public
// internet can't trigger the send. CRON_SECRET is set in Vercel project env.
//
// Eligibility rules per user (evaluated against one shared `now` per run):
//   - email_cycle_close_enabled is true
//   - Their LOCAL day is Sunday and their LOCAL hour is >= 8 (the send
//     window). Using >= 8 (not == 8) plus the idempotency key means the
//     first hourly trigger after 8am local Sunday catches them and later
//     triggers skip — a late/dropped trigger can't miss or double-send.
//   - last_cycle_email_cycle_start != cycle.cycleStart (idempotency)
//   - They have an active chapter
//   - The just-closed LOCAL Sun–Sat week has >= UNLOCK_FLOOR (first time) or
//     >= CEREMONY_FLOOR (subsequent cycles) distinct log days. Wave-cycle
//     users (zero logs) explicitly do not get an email — ADR 0007's
//     "no ceremony, no indicator" rule applies to the email too.
//   - No reflection row already exists for the cycle (they didn't already
//     complete it on Saturday night)

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CADENCE: Cadence = 'week'  // v1 ships weekly only

type CandidateRow = {
  user_id: string
  email: string | null
  email_unsubscribe_token: string
  last_cycle_email_cycle_start: string | null
  timezone: string | null
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
  // One shared instant for the whole run, so every user is evaluated against
  // the same "now" — their local day/hour is derived from it per-timezone.
  const now = new Date()

  // Pull every user_settings row + the user's email (joined from auth.users
  // via a separate call — Supabase JS doesn't let us join across the auth
  // schema in a single .select). Two round-trips, fine at our user count.
  const { data: settings, error: settingsErr } = await supabase
    .from('user_settings')
    .select('user_id, email_unsubscribe_token, last_cycle_email_cycle_start, timezone')
    .eq('email_cycle_close_enabled', true)

  if (settingsErr) {
    return Response.json(
      { error: 'settings_query_failed', detail: settingsErr.message },
      { status: 500 },
    )
  }
  const candidateRows = (settings ?? []) as CandidateRow[]

  // Batch-fetch emails from auth.users via paginated listUsers, instead of one
  // getUserById per candidate (an admin-API N+1 that dominated the run at scale).
  const emailMap = new Map<string, string>()
  {
    const perPage = 1000
    const maxPages = 50 // safety guard (~50k users) against an unbounded loop
    for (let page = 1; page <= maxPages; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error) {
        return Response.json(
          { error: 'user_lookup_failed', detail: error.message },
          { status: 500 },
        )
      }
      const users = data?.users ?? []
      // Break on the first empty page rather than `< perPage` — GoTrue may cap
      // perPage server-side, and a short page would otherwise stop us early.
      if (users.length === 0) break
      for (const u of users) if (u.email) emailMap.set(u.id, u.email)
    }
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://onduler.app'
  const anchorsUrl = `${appUrl}/anchors`

  type SendResult = { user_id: string; status: string; detail?: string }

  async function processUser(row: CandidateRow): Promise<SendResult> {
    const email = emailMap.get(row.user_id)
    if (!email) return { user_id: row.user_id, status: 'skip_no_email' }

    // Local-window gate — pure computation, no DB. Runs first so the ~23/24
    // of users outside their Sunday-8am window are skipped before any per-user
    // query, keeping the hourly cadence cheap. Falls back to Pacific.
    const tz = row.timezone || 'America/Los_Angeles'
    const localToday = dayKey(now, tz)
    // sundayKey(today) === today exactly when today IS a local Sunday.
    if (sundayKey(now, tz) !== localToday) {
      return { user_id: row.user_id, status: 'skip_not_send_window' }
    }
    if (hourInTz(now, tz) < 8) {
      return { user_id: row.user_id, status: 'skip_not_send_window' }
    }

    // The just-closed local Sun–Sat week.
    const cycle = closedWeekFor(localToday)

    // Idempotency: if we already sent for this cycle, skip.
    if (row.last_cycle_email_cycle_start === cycle.cycleStart) {
      return { user_id: row.user_id, status: 'skip_already_sent' }
    }

    // Active chapter for this user.
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('user_id', row.user_id)
      .is('ended_at', null)
      .maybeSingle()
    if (!chapter?.id) return { user_id: row.user_id, status: 'skip_no_chapter' }

    // Distinct log days inside the just-closed week only (bounded read).
    // Exact per-tz window: [00:00 local of cycleStart, 00:00 local of the day
    // after cycleEnd).
    const winLower = startOfDayUtc(cycle.cycleStart, tz).toISOString()
    const winUpper = startOfDayUtc(addDays(cycle.cycleEnd, 1), tz).toISOString()
    const { data: weekLogs } = await supabase
      .from('logs')
      .select('logged_at')
      .eq('user_id', row.user_id)
      .eq('chapter_id', chapter.id)
      .gte('logged_at', winLower)
      .lt('logged_at', winUpper)
    const closedDays = new Set<DayKey>()
    for (const l of weekLogs ?? []) {
      const k = dayKey(l.logged_at, tz)
      if (k >= cycle.cycleStart && k <= cycle.cycleEnd) closedDays.add(k)
    }
    const closedCycleDays = closedDays.size

    // Wave-cycle (zero logs): no ceremony, no email.
    if (closedCycleDays < CEREMONY_FLOOR[CADENCE]) {
      return { user_id: row.user_id, status: 'skip_below_floor' }
    }
    // If the closed week itself clears the unlock floor, they qualify whether
    // or not the cadence was already unlocked. Only when it's under the unlock
    // floor do we need full history to confirm a prior closed week unlocked
    // them — so the unbounded read happens only for that narrow 1–2 day band.
    if (closedCycleDays < UNLOCK_FLOOR[CADENCE]) {
      const { data: allLogs } = await supabase
        .from('logs')
        .select('logged_at')
        .eq('user_id', row.user_id)
        .eq('chapter_id', chapter.id)
      const logDays = new Set<DayKey>()
      for (const l of allLogs ?? []) logDays.add(dayKey(l.logged_at, tz))
      const isUnlocked = unlockedForCadence(logDays, CADENCE, localToday, cycleContaining)
      if (!isUnlocked) return { user_id: row.user_id, status: 'skip_below_floor' }
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
    if (existing?.id) return { user_id: row.user_id, status: 'skip_already_completed' }

    const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?token=${row.email_unsubscribe_token}`
    const emailArgs = { cadence: CADENCE, cycle, anchorsUrl, unsubscribeUrl }
    const subject = cycleCloseSubject(emailArgs)
    const html = cycleCloseHtml(emailArgs)
    const text = cycleCloseText(emailArgs)

    if (dryRun) return { user_id: row.user_id, status: 'dry_run' }

    try {
      const result = await sendEmail({ to: email, subject, html, text, unsubscribeUrl })
      if (result.error) {
        return { user_id: row.user_id, status: 'send_error', detail: result.error.message }
      }
      // Mark idempotency anchor after successful send.
      await supabase
        .from('user_settings')
        .update({ last_cycle_email_cycle_start: cycle.cycleStart })
        .eq('user_id', row.user_id)
      return { user_id: row.user_id, status: 'sent' }
    } catch (err) {
      return {
        user_id: row.user_id,
        status: 'send_throw',
        detail: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // Process users in bounded-concurrency chunks rather than fully sequentially.
  // The cap also keeps concurrent sends within Resend's rate limit.
  const CONCURRENCY = 5
  const sendResults: SendResult[] = []
  for (let i = 0; i < candidateRows.length; i += CONCURRENCY) {
    const chunk = candidateRows.slice(i, i + CONCURRENCY)
    const chunkResults = await Promise.all(chunk.map(processUser))
    sendResults.push(...chunkResults)
  }

  // Aggregate by status so the default response never carries user_ids.
  const statusCounts: Record<string, number> = {}
  for (const r of sendResults) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
  }

  return Response.json({
    now: now.toISOString(),
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
