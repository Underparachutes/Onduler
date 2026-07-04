// Onduler cycle-close cron trigger.
//
// Vercel Hobby can't run sub-daily native cron, and the /api/cron/cycle-close-email
// route now sends per-user at each user's LOCAL Sunday 8am — so it must be hit
// HOURLY for 8am-Sunday to sweep across every timezone. This tiny Cloudflare
// Worker owns that hourly trigger. See docs/specs/per-user-timezone-2026-07-03.md.
//
// The route is idempotent (user_settings.last_cycle_email_cycle_start), so an
// extra or slightly-late fire never double-sends or misses anyone.
//
// Setup: see infra/cron-worker/README.md.

export default {
  async scheduled(event, env, ctx) {
    const url =
      env.CYCLE_CLOSE_URL ?? 'https://onduler.app/api/cron/cycle-close-email'
    const run = async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      })
      const body = await res.text()
      if (res.ok) {
        console.log(`cycle-close ok ${res.status}: ${body}`)
      } else {
        // Logged to the Worker's tail/logs; the next hourly run recovers.
        console.error(`cycle-close FAILED ${res.status}: ${body}`)
      }
    }
    ctx.waitUntil(run())
  },
}
