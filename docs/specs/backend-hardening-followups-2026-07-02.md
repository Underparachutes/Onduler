# Backend hardening — follow-ups

*Created 2026-07-02, from a backend review pass (data storage, auth/email, security, cleanliness).*

Two items from that review are **already done** (commit `c312ca0`) and are not in this list:
- ✅ `user_settings` privileged-column lock (trigger) — privilege-escalation / billing-bypass closed, applied to prod.
- ✅ Stripe webhook returns 500 on a failed DB write instead of swallowing it.

Everything below is the remaining work, grouped by priority. Effort tags: **S** ≈ <1hr, **M** ≈ half-day, **L** ≈ day+. Each item is independently shippable — no ordering dependency unless noted.

---

## Tier 1 — Correctness & hardening (do before wider tester push)

- [x] **Cron auth fails open when `CRON_SECRET` is unset.** `app/api/cron/cycle-close-email/route.ts:55-63` — `authorized()` returns `true` with no secret configured. If the env var is ever missing/misnamed in prod, anyone can trigger the whole email send (and read the JSON response, which leaks user IDs). **Direction:** only allow the no-secret bypass when `process.env.NODE_ENV !== 'production'`; fail closed otherwise. Also stop returning raw `user_id`s in the response body (line 207-215) — return counts only, or gate the verbose form behind `?dry=1`. **S**

- [x] **Unsubscribe mutates state on a GET.** `app/api/email/unsubscribe/route.ts:50` flips `email_cycle_close_enabled=false` on GET with a stable token link. Mail scanners / Apple Mail Privacy Protection / Outlook SafeLinks *prefetch* links and will silently unsubscribe testers. **Direction:** GET renders a "Confirm unsubscribe" page; only a POST (button click, or the RFC 8058 `List-Unsubscribe-Post: One-Click` path already in `lib/email.ts:51`) performs the mutation. Mirror the same for resubscribe. **S–M**

- [x] **Open redirect in the auth callback.** `app/auth/callback/route.ts:7,10` — `next` from the query is passed to `NextResponse.redirect(new URL(next, origin))` with no validation; `next=https://evil.com` resolves off-site (absolute URLs ignore the base). Requires a valid `code` so the vector is narrow, but it's a clean phishing primitive on an onduler.app link. **Direction:** reject any `next` that isn't a same-origin relative path — must start with a single `/` and not `//`. **S**

- [x] **`setMotionSwells` is a non-atomic delete-then-insert.** `app/actions/motions.ts:152-165` deletes all `motion_swells` for the motion, then inserts the new set. If the insert fails, the motion is left feeding **zero** swells — silent loss of contribution weights. **Direction:** move to a Postgres function (RPC) wrapping both in one transaction, or diff-and-upsert instead of delete-all. **M**

- [x] **`createMotion` / `duplicateMotion` insert-then-link is non-atomic.** `motions.ts:45-72` and `:455-478` — motion inserts, then `motion_swells` inserts separately; a link failure leaves an orphaned motion. **Direction:** same as above — one transaction/RPC for motion + links. **M** *(share the RPC with the item above.)*

---

## Tier 2 — Scaling (before real users accumulate years of logs)

The product is explicitly built for multi-year retention, so unbounded "pull all logs into Node" paths are the main scaling risk. None of these hurt at tester scale.

- [x] **`/anchors` re-reads the full chapter log table 5–6× per render.** `app/anchors/page.tsx:126-129` calls `getCeremonyState` 4× + `getUnlockState` 1×, each of which calls `fetchChapterAndLogDays` (`app/actions/reflections.ts:19-42`) — an **unbounded** full-chapter log fetch — and the page already resolved `chapterId` separately at line 120, then fetches all logs *again* at line 226 with a heavy join. **Direction:** resolve chapter + `logDays` **once** at the top of the page and thread the result into `getUnlockState`/`getCeremonyState`. The cycle-window-bounded pattern in `fetchAnyCeremonyPending` (reflections.ts:151) is the model to copy. **M** — highest-value scaling fix.

- [ ] **Unbounded lifetime aggregation done in Node.** `app/anchors/page.tsx:226`, `app/anchors/journal/page.tsx:97`, `app/actions/reflections.ts:542`, `app/swells/[id]/page.tsx:139` each pull all-time logs (some with nested motion/swell joins) and roll them up in JavaScript, even though only one period is displayed. **Direction:** the durable fix is a per-`(swell, day)` rollup table maintained on log insert/delete (or `SECURITY DEFINER` SQL RPCs for period/lifetime sums) so Node never holds full history. For the journal, bound to the visible chapter/week and lazy-load older chapters. **L** — design decision; can defer, but it's the ceiling everything else pushes against.

- [ ] **`/anchors` fetches all-time `milestone_hits` with no bound.** `app/anchors/page.tsx:249-258` reads every hit ever, then filters by period in JS (and mixes in archived-chapter milestones). **Direction:** add a `hit_at >= periodStart` bound, matching the dashboard/swells pattern. **S**

- [ ] **Cron is a per-user sequential N+1.** `cycle-close-email/route.ts:101-104` calls `auth.admin.getUserById` one user at a time, then the main loop does sequential per-user chapter → **unbounded** logs → reflections queries. At hundreds of users this is hundreds of serial round-trips per run (Vercel function timeout risk). **Direction:** batch the email lookup (`auth.admin.listUsers` paginated, or a single join), process users with bounded concurrency (`Promise.all` over chunks), and bound the per-user logs read to the cycle window. **M**

---

## Tier 3 — Robustness & test coverage

- [ ] **Two exported types both named `Cadence`.** `lib/cadence.ts` = `'weekly'|'monthly'` (waypoints); `lib/cycles.ts` = `'week'|'month'|'quarter'|'year'` (ceremonies). Typechecks today, but a wrong auto-import would silently compile against the wrong union and produce subtly wrong cycle math. **Direction:** rename to `WaypointCadence` / `CeremonyCadence`. **S**

- [ ] **No tests on the two most arithmetic-heavy pure libs.** `lib/contributions.ts` (contribution rebalance / normalize — sum-≤-1 invariant) and `lib/cycles.ts` (quarter/year boundaries, month lengths — drives ceremony unlocks + the cron). These are exactly the functions that drift silently. Lower-priority but also untested: `lib/periods.ts` (26 importers — timezone day-key math), `lib/cadence.ts`, `lib/unlocks.ts`. **Direction:** unit tests for `contributions` and `cycles` first. **M** *(Restore/import/crypto resolvers are already well-tested — leave them.)*

- [ ] **`markHintSeen` is fire-and-forget and non-atomic.** Called without `await` at `swells.ts:46,197`, `motions.ts:77,114`, `settings.ts:195`, `reflections.ts:142,251`; in a serverless action the response can return before the write lands, so a hint may re-show. `settings.ts:236-245` also does a read-modify-write on the `hints_seen` JSON blob with no atomicity (concurrent writes clobber). Cosmetic impact, but genuine data loss. **Direction:** `await` the calls; make the write a `jsonb` merge (`hints_seen || '{"k":true}'`) instead of read-modify-write. **S**

- [ ] **Cron idempotency write is unchecked.** `cycle-close-email/route.ts:193-196` — after a successful send, the `last_cycle_email_cycle_start` update isn't error-checked; if it fails, a retry within the week re-sends (duplicate email). **Direction:** check the update error and log/alert. **S**

- [ ] **`restore.ts:120` unchecked submotion parent-link update.** A failed parent link silently orphans a submotion during restore, while every other write in the file is checked. **Direction:** check the error, fail the restore row. **S**

---

## Tier 4 — Pre-public-launch (not needed for invite-only testers)

- [ ] **Anon `waitlist` / `contact_submissions` have no length cap or rate limit.** `supabase-migration.sql:274,286` — `FOR INSERT TO anon WITH CHECK (true)`, unbounded `text` columns. A script can flood multi-MB rows (DB bloat + spam in the admin view). Validation is thin (`contact.ts:16` non-empty only; `waitlist.ts:11` `includes('@')`). **Direction:** DB `CHECK (char_length(...) < N)` on each column, plus a Turnstile/captcha or per-IP rate limit on the two public forms. **M**

- [ ] **Confirm Sentry session-replay masking.** `instrumentation-client.ts:7-8` sets `replaysOnErrorSampleRate: 1.0` with `replayIntegration()`, which captures the rendered DOM — i.e. *decrypted* motion/anchor content as displayed. Safe only because `maskAllText` defaults true. **Direction:** verify masking is never disabled anywhere, and consider `maskAllInputs`. For an E2EE/privacy-first app this is load-bearing. **S** (audit).

- [ ] **Background upload trusts client content-type into a public bucket.** `app/actions/settings.ts:293-311` — `ext`/`contentType` from the client; a user could upload SVG/HTML served with that type (contained to the storage subdomain + owner folder, so blast radius is self). **Direction:** validate against an `image/*` allowlist, force the content-type. **S**

- [ ] **Password floor is 6 chars.** `auth.ts:110`, `reset-password/page.tsx:36`. Weak for a secret that also wraps the E2EE DEK (password key-slot, PBKDF2 600k); an operator or DB-breach attacker could offline-brute a weak slot. Passkey/recovery slots are strong — only the optional password fallback is the weak link. **Direction:** raise the floor (and/or enable Supabase leaked-password protection — noted as pending in `pre-launch-db-hardening.md`). **S**

- [ ] **No security headers / CSP.** `next.config.ts` sets none. **Direction:** add a `headers()` block with CSP, HSTS, X-Frame-Options, etc. **M** *(CSP needs testing against the app's inline styles/scripts.)*

- [ ] **Dead `/log` route in the middleware list.** `proxy.ts:4` — `protectedRoutes` still lists `/log` (renamed → `/reflections` → `/anchors`; no `app/log` dir). Harmless, guards a 404. **Direction:** drop `/log`. Also stale `/log` comment at `swells.ts:89`. **S**

---

## What was verified solid (don't touch)

- Stripe webhook signature verification (raw body + `constructEvent`) — forged events can't escalate anyone.
- Service-role usage: every `createAdminClient()` call is `requireAdmin()`-gated or webhook-signature-gated and re-scoped by `user_id`.
- Passkey / content-encryption: server only ever sees ciphertext; no key material logged; operator-blind discipline holds.
- No secrets in tracked files; no secret exposed via `NEXT_PUBLIC_*`; `server-only` guards on admin/email modules.
- Explicit column selects everywhere (no `select('*')`); bounded today/this-week reads ride the composite indexes correctly.
- `getActiveChapterId` race handling (unique partial index + retry) is correct.
- Error handling is near-uniform; `tsconfig` is `strict`; eslint has no rules globally disabled.
