# Onduler cycle-close cron trigger (Cloudflare Worker)

This Worker POSTs to `/api/cron/cycle-close-email` **once an hour**. The route
decides, per user, whether it's their local Sunday 8am and sends the weekly
cycle-close email — so 8am-Sunday rolls across timezones over ~24h. Vercel Hobby
can't do sub-daily native cron, which is why this lives outside Vercel.

Free tier is plenty (one request/hour = 24/day).

## One-time setup

You need a (free) Cloudflare account and the `wrangler` CLI.

1. **Install wrangler** (if you don't have it):
   ```
   npm install -g wrangler
   ```

2. **Log in** (opens a browser):
   ```
   wrangler login
   ```

3. **From this folder**, set the shared secret. It must be the **exact same
   value** as `CRON_SECRET` in the Vercel project env (Vercel → onduler →
   Settings → Environment Variables). Wrangler will prompt you to paste it:
   ```
   cd infra/cron-worker
   wrangler secret put CRON_SECRET
   ```

4. **Deploy:**
   ```
   wrangler deploy
   ```

That's it. The cron trigger (`0 * * * *`) is registered on deploy.

## Verify it works

- **Manual test of the route itself** (dry run — sends nothing, reports who
  *would* be sent). Replace `<SECRET>` with your `CRON_SECRET`:
  ```
  curl -X POST 'https://onduler.app/api/cron/cycle-close-email?dry=1' \
    -H 'Authorization: Bearer <SECRET>'
  ```
  A dry run returns per-user statuses. Outside anyone's Sunday-8am window you'll
  see everyone as `skip_not_send_window` — that's correct.

- **Watch the Worker's live logs** to confirm the hourly fire:
  ```
  wrangler tail
  ```
  Each run logs `cycle-close ok 200: {...}` (or `FAILED …`).

## If the trigger ever dies

The route's idempotency key means a missed hour just delays a send to the next
hour — no duplicates, no permanent loss for that cycle as long as the Worker
comes back within the user's Sunday. A *permanently* dead Worker means no emails,
so if you stop seeing sends, check `wrangler tail` first.

## Changing the schedule or URL

- Schedule / URL live in `wrangler.toml`. Edit, then `wrangler deploy` again.
- The secret persists across deploys; you only re-run `wrangler secret put` to
  rotate it (and update Vercel to match).
