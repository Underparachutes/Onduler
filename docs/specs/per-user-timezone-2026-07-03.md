# Per-user timezone — scoping

*Created 2026-07-03. The app currently hardcodes `America/Los_Angeles` for every
user — day keys, Sun–Sat week boundaries, ceremony windows, and the cron all run
on Pacific time regardless of where the user is. Intent (Josh): a user's day and
week should be **relative to their own timezone**, so ceremonies roll across the
globe as each local Sunday arrives. This scopes that change.*

## Current state (grounded in code)

- **No timezone is stored anywhere.** `user_settings` has no tz column.
- **13 hardcoded `America/Los_Angeles` literals across 25 files**, but they all
  funnel through a small surface:
  - `lib/periods.ts` `pacificDayKey(ts)` — timestamp → Pacific calendar day
    (**51 call sites**). This is the big one.
  - `lib/timezone.ts` `getTodayStart()` / `getWeekStart()` / `getLastWeekStart()`
    — "now" → Pacific today / Sunday-of-week (**21 call sites**).
  - `pacificSundayKey` — duplicated inline in `app/swells/[id]/page.tsx`.
  - The cron computes `pacificDayKey(new Date())` + `closedWeekFor(...)`.
- **Everything else in `lib/periods.ts` is pure `DayKey` arithmetic** (month /
  quarter / year math on `'YYYY-MM-DD'` strings) and is **timezone-agnostic** — it
  operates on whatever day keys it's handed. So the tz-dependent code is really
  just the ~4 funnel helpers above; the 72 call sites mostly just *call* them.
- **Cron:** `vercel.json` → `"0 15 * * 0"` = 15:00 UTC every Sunday (~7–8am
  Pacific). One weekly fire for the whole user base.

## The key reassurance: no data rewrite

Logs (and all events) are stored as **`timestamptz`** — absolute instants. The
day/week a log "belongs to" is computed at **read time** from the instant + a
timezone. So switching a user to their own tz **reinterprets** their existing
history's buckets; it never rewrites stored rows. That's what makes this
tractable: it's a read-time computation change, not a migration of the
`logs` table.

One write path bakes in a tz assumption and must be fixed: `logMotionOnDay`
(`app/actions/logs.ts:152-156`) constructs a `logged_at` instant at ~noon
*Pacific* from a day key. Under per-user tz it must construct noon in the
**user's** tz so the backfilled log lands on the intended local day.

## Design

### Storage & capture
- Add `timezone text NOT NULL DEFAULT 'America/Los_Angeles'` to `user_settings`.
  The default means **existing users keep exactly today's behavior** (Pacific)
  with zero disruption; only new/updated users get their real zone.
- Capture at signup from the browser: `Intl.DateTimeFormat().resolvedOptions().timeZone`
  (e.g. `"America/New_York"`), passed to the signup action (`app/actions/auth.ts`)
  and written to the row.
- **Auto-follow the device (decided).** On each app load the client reads the
  browser tz and, if it differs from what's stored, persists the new one — so a
  user who opens the app in another zone immediately gets that zone's day-reset
  *and* 8am-local ceremony. Mechanism: a client component on the app shell reads
  `Intl...timeZone` and calls a server action to update the row when it changes
  (first render after landing may be one paint stale, then corrects). Add a manual
  override in settings for the rare "pin my zone" case. `Intl` reflects the OS
  zone, not IP/VPN, so it's reliable.
- Validation: IANA names can't be `CHECK`-constrained cheaply in Postgres;
  validate app-side against `Intl.supportedValuesOf('timeZone')` and fall back to
  the Pacific default on anything unrecognized.

### The funnel (the bulk of the mechanical work)
Make the ~4 helpers tz-aware, then thread the user's tz to call sites:
- `pacificDayKey(ts)` → `dayKey(ts, tz)`.
- `getTodayStart()` / `getWeekStart()` / `getLastWeekStart()` → take `tz`.
- Give them a **default of `'America/Los_Angeles'`** during the migration so the
  refactor can land incrementally — untouched call sites keep old behavior while
  each page/action is converted to pass the real tz.
- Read pages already fetch `user_settings` widely; add `timezone` to those selects
  and thread it. A handful of server actions (`logs.ts`, `reflections.ts`) resolve
  the user first and can read tz alongside.

### Cron redesign — "ceremonies rolling across the globe"
This is the highest-complexity piece. Today: one fire, Pacific weeks for all.
Target: email each user when **their** local week closes, early **their** Sunday
(**send hour = 08:00 local**, decided).

- Trigger the route **hourly**. Vercel Hobby caps crons at once-per-day (we're on
  Hobby), so the trigger comes from **outside Vercel** — the route is already a
  plain authenticated endpoint (`CRON_SECRET` bearer, fail-closed since commit
  `c312ca0`/Tier 1). Options, best-first:
  - **Cloudflare Worker Cron Trigger** — free, reliable; a ~10-line worker that
    `fetch`es the route hourly with the bearer. Recommended.
  - **cron-job.org** — free, hits a URL on a schedule; simplest UI.
  - **GitHub Actions scheduled workflow** — free, already in-repo, but runs can be
    delayed and auto-disable after 60 days of repo inactivity. Weakest option.
- **Jitter-robust eligibility (decided):** send when the user's **local day is
  Sunday**, their **local hour ≥ 8**, the just-closed local Sun–Sat week clears the
  floor, and `last_cycle_email_cycle_start` ≠ this week. Using **≥ 8, not == 8**,
  plus the idempotency key, means the *first* trigger after 8am local Sunday
  catches each user and no one is double-sent — so a late or skipped external
  trigger can't miss or duplicate anyone. This also handles fractional-offset
  zones (India +5:30, Nepal +5:45) with no special-casing.
- As 8am-Sunday sweeps westward across zones over ~24h, each hourly run catches
  the users entering their window — the rolling effect, for free.
- The N+1/concurrency + bounded-read work already done on this route (commit
  `bc7baa8`) carries over unchanged; eligibility now keys off local weeks.

### Aggregation RPCs (intersection with the deferred L item)
This is why we stopped before writing Pacific-hardcoded RPCs. If we pursue the
[lifetime-aggregation](./lifetime-aggregation-2026-07-03.md) RPCs, they should
take the user's `tz` and bucket with `GROUP BY (logged_at AT TIME ZONE $tz)::date`
(Postgres accepts an IANA name in `AT TIME ZONE`). That supersedes the earlier
"decision 2" (no TZ in SQL): the narrowed rule is **Node supplies filter bounds;
SQL buckets by Pacific/local day via the user's tz**. Build those RPCs *after*
this lands, or tz-parameterized from the start.

## Phasing

- **Phase A — plumbing (safe, no behavior change). ✅ SHIPPED 2026-07-03.** Added
  `user_settings.timezone` (default Pacific; all existing rows backfilled by the
  default). Repurposed the dead `TimezoneSync` component (it wrote an unused
  `tz_offset` cookie) to read the browser's IANA zone and persist it via a new
  `syncTimezone` action — auto-follow-the-device, writing only when the zone
  changes. AppShell passes the stored value so unchanged loads don't write.
  Nothing reads the column yet. *Deferred to a later step:* a settings manual
  override (needs an auto/manual flag so it isn't clobbered by auto-follow).
- **Phase B — reads go local. M.** Make the funnel tz-aware; thread the user's tz
  through read pages + the day-affecting actions (incl. the `logMotionOnDay`
  instant fix and `quickLogMotion`'s "already logged today" dedupe). Weeks/days now
  roll at the user's local midnight. Verify streaks, daily goals, celebration
  triggers, "logged today" all still behave.
- **Phase C — cron goes local. M.** Hourly schedule + per-user local-Sunday send.
  Confirm Vercel plan supports hourly first.

Each phase is independently shippable. A + B with the Pacific default is a no-op
for current (US) testers; the change only becomes visible to a user whose stored
tz differs from Pacific.

## Risks / watch-items

- **"Day" shifting for a user touches a lot of behavior** — streaks, daily goals,
  celebration triggers, `quickLogMotion` today-dedupe, wave detection. Mostly the
  desired effect, but each needs a look during Phase B.
- **Tz changes mid-history** (travel, or a corrected zone): past logs re-bucket
  under the new tz, so a streak/ceremony boundary can shift by a few hours.
  **Decided: let them float** — it's presentation, not data loss, the instants are
  the truth, and floating is what "my week is Tokyo's week now" should mean.
- **External trigger is now a moving part** we own (Cloudflare Worker / cron
  service) instead of Vercel-native cron. Monitor it; the ≥-8 idempotent check
  makes it fault-tolerant, but a *permanently* dead trigger means no emails.
- **Two sources of tz truth** (JS funnel + any SQL bucketing) must agree — cover
  with a day/week-key diff test across a DST boundary for a couple of zones.

## Out of scope

- Changing how instants are stored (they stay `timestamptz` — that's what makes
  this safe).
- The Tier-2 aggregation refactor itself — that resumes after this, tz-aware.

## Decisions (Josh, 2026-07-03)

1. **Send hour = 08:00 local.**
2. **Auto-follow the device** — tz updates whenever the app is opened in a new
   zone; both day-reset and ceremony follow. Historical buckets float.
3. **Cron trigger:** we're on Vercel Hobby (no sub-daily native cron), so trigger
   the route hourly from an **external scheduler** (Cloudflare Worker Cron
   recommended) with the `CRON_SECRET` bearer; eligibility uses the jitter-robust
   "local Sunday, hour ≥ 8, not already sent" check.
4. **Sequencing:** land timezone Phase A+B first, then resume the deferred
   aggregation RPCs tz-aware (avoids building Pacific twice).

## Still to confirm before building

- Which external scheduler (Cloudflare Worker vs cron-job.org) — affects where the
  trigger lives and who owns it.
- Whether Phase C (cron) ships with A+B or lags — A+B are a no-op for US testers,
  so the local-email behavior can follow once the trigger is set up.
