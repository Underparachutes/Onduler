# Cycle-close email — operator setup

The cycle-close email feature is wired in code (Resend SDK, cron route, opt-in column, unsubscribe flow, Settings toggle). To send real email, the steps below need to happen once. Order matters: Resend domain verification before the first send.

## 1. Run the database migration

Open `scripts/migrate-cycle-email.sql` in your editor, copy its full contents, and paste them into the Supabase SQL editor for the Onduler project. Hit Run.

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
2. Resend shows 4 records to add: one TXT for DKIM (`resend._domainkey`), one MX for sending (`send`), one TXT for SPF (`send`), and one TXT for DMARC (`_dmarc`).
3. Open another tab, sign into Namecheap, and go to **Domain List** → click **Manage** next to `onduler.app` → **Advanced DNS**.
4. **For the three TXT records:**
   - Under **Host Records**, click **Add New Record**.
   - Set **Type** to **TXT Record**.
   - Set **Host** to the **Name** Resend gave you. Namecheap auto-strips your domain suffix, so if Resend says `send.onduler.app`, enter `send` (not the full name). For `_dmarc.onduler.app`, enter `_dmarc`. If it's just `onduler.app`, enter `@`.
   - Set **Value** to exactly what Resend gave you. For the long DKIM value, paste the whole thing in one go; Namecheap accepts it.
   - **TTL**: Automatic. Save.
5. **For the MX record (Namecheap quirk):** the **Host Records** dropdown does not include MX as a type. MX records live under **Mail Settings**, which by default is set to **Email Forwarding**.
   - Scroll down to the **Mail Settings** section.
   - Change the dropdown from **Email Forwarding** to **Custom MX**. This removes Namecheap's auto-generated SPF TXT on `@` (the `v=spf1 include:spf.efwd.registrar-servers.com ~all` one) — fine unless you were forwarding `@onduler.app` email somewhere, which we aren't.
   - An **Add Host Record** modal opens automatically with Type pre-set to **MX Record**. Fill **Host** = `send`, **Priority** = `10`, **Mail Server** = `feedback-smtp.us-east-1.amazonses.com`, **TTL** = Automatic. Save.
6. After all 4 records are saved, go back to Resend and click **Verify**. Propagation usually takes a few minutes (sometimes faster). If it's still pending after 15 minutes, double-check that the **Host** column in Namecheap doesn't include `.onduler.app` — that's the common gotcha.

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
