# Cycle-close email — operator setup

The cycle-close email feature is wired in code (Resend SDK, cron route, opt-in column, unsubscribe flow, Settings toggle). To send real email, the steps below need to happen once. Order matters: Resend domain verification before the first send.

## 1. Run the database migration

Open the Supabase SQL editor for the Onduler project and paste in:

```
scripts/migrate-cycle-email.sql
```

It adds three columns to `user_settings`:

- `email_cycle_close_enabled` (default `true`)
- `email_unsubscribe_token` (per-row UUID, unique)
- `last_cycle_email_cycle_start` (idempotency anchor)

Idempotent. Re-running is safe.

## 2. Sign up for Resend

1. Go to [resend.com](https://resend.com) and create an account using `ondulertest@gmail.com`.
2. Free tier is 3,000 emails/month, 100/day. Plenty for now.
3. After signup, click **API Keys** in the sidebar and create one named `onduler-prod` with full sending permission. Copy the key (starts with `re_...`). You only see it once.

## 3. Verify `onduler.app` for sending

1. In Resend, click **Domains** → **Add Domain** → enter `onduler.app`.
2. Resend shows 3 DNS records to add: one SPF, two for DKIM (and one optional DMARC; add it). Each record has a **Type** (TXT or CNAME), a **Name** (something like `send` or `resend._domainkey`), and a **Value**.
3. Open another tab, sign into Namecheap, and go to **Domain List** → click **Manage** next to `onduler.app` → **Advanced DNS**.
4. For each record Resend shows:
   - Click **Add New Record**.
   - Set **Type** to match (TXT Record or CNAME Record).
   - Set **Host** to the **Name** Resend gave you. Important: Namecheap auto-strips your domain suffix, so if Resend says `send.onduler.app`, enter `send` (not the full name). If it's just `onduler.app`, enter `@`.
   - Set **Value** to exactly what Resend gave you. For long DKIM values, paste the whole thing in one go; Namecheap accepts it.
   - **TTL**: Automatic.
   - Save the record.
5. After adding all 3-4 records, go back to Resend and click **Verify**. Propagation usually takes a few minutes. If it's still pending after 15 minutes, double-check that the **Host** column in Namecheap doesn't include `.onduler.app` — that's the common gotcha.

## 4. Set environment variables

Two places: `.env.local` (for local dev) and Vercel project settings (for prod).

**Local** — already has placeholders in `.env.local`, just fill them in:

```
RESEND_API_KEY=re_...
CRON_SECRET=  # any long random string, e.g. `openssl rand -hex 32`
```

`NEXT_PUBLIC_APP_URL` should already be set; if running locally, keep it as `http://localhost:3000`.

**Vercel** — Project → Settings → Environment Variables. Add for both Production and Preview:

- `RESEND_API_KEY` — same key as local
- `CRON_SECRET` — same random string as local (Vercel signs cron calls with this; the route rejects anything else)
- `NEXT_PUBLIC_APP_URL` — should already be `https://onduler.app`; if not, set it

After saving env vars, redeploy with `vercel --prod --force` so the new env vars land in fresh lambdas (Vercel sometimes serves cached builds against stale env).

## 5. Smoke-test before Sunday

The cron route accepts a `?dry=1` flag that runs all the eligibility checks but doesn't actually send. Hit it manually:

```bash
# Local (no auth needed since CRON_SECRET isn't enforced when unset)
curl http://localhost:3000/api/cron/cycle-close-email?dry=1

# Production (Authorization header required)
curl -H "Authorization: Bearer $CRON_SECRET" \
     "https://onduler.app/api/cron/cycle-close-email?dry=1"
```

You'll see a JSON summary listing every user and what would happen (`sent` / `skip_below_floor` / `skip_already_sent` etc.). When you're happy with the output, drop the `?dry=1` to actually send.

## 6. Optional first-send test to yourself

Quickest way to see a real send: temporarily flip the dry flag off and run the curl against your own account. If you don't have enough logs in the closed week to clear the floor, log a few motions across 3 days and try again.

## What's next on the email front

This v1 ships weekly only. Monthly / quarterly / yearly cadence emails are deferred — the cron route's `CADENCE` constant can be promoted to a loop when we want them. Per-user wake silhouette in the hero is also deferred (a v1.5 candidate) — would need a server-rendered PNG endpoint since SVG-with-data doesn't ship cleanly through every email client.
