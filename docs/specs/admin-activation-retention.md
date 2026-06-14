# Spec: Activation & retention block on `/admin`

*For: Claude Code. Status: ready to build. No schema change.*

## Why

Pre-launch, the only "are people using this" signal on `/admin` is **Active 7d / 30d**, computed from `auth.users.last_sign_in_at`. Onduler is a PWA with a persistent session, so a daily user who never re-authenticates barely moves that field. It under-reports real usage and will read as "dead" when it isn't.

The real engagement signal is **logs**: who has logged at least once (activation), and who logged recently (retention). That data already exists in the `logs` table but is only visible per-user, one click at a time. This surfaces it on the main dashboard.

## Scope

1. Add an **Engagement** section to `app/admin/page.tsx` with three tiles:
   - **Activated** — count of distinct users who have ever logged a motion.
   - **Logged 7d** — count of distinct users with at least one log in the last 7 days.
   - **Logs 7d** — total log count in the last 7 days (volume, not distinct users).
2. Add a **last-log column** to the existing "Recent signups" list: each row shows when that user last logged (reuse `formatRelative`), or "never logged" if they haven't.

Leave the existing Users and System-totals sections untouched. This is additive and read-only. **Surgical edits only** — do not refactor the surrounding page.

## Data approach

At current scale (single-digit users, at most low-thousands of log rows) the simplest correct approach is to fetch the lightweight log columns and reduce in JS. This matches the existing page, which already pulls `listUsers` and filters in JS. Do **not** reach for `COUNT(DISTINCT ...)` via the client — Supabase's JS client doesn't express it cleanly, and we don't need it yet.

Fetch once, near the existing `Promise.all`:

```ts
const { data: logRows } = await admin
  .from('logs')
  .select('user_id, logged_at')
```

Then derive:

```ts
const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000

const activatedUserIds = new Set<string>()
const logged7dUserIds = new Set<string>()
let logs7d = 0
const lastLogByUser = new Map<string, string>() // userId -> ISO timestamp

for (const row of logRows ?? []) {
  if (!row.user_id) continue
  activatedUserIds.add(row.user_id)

  const t = row.logged_at ? new Date(row.logged_at).getTime() : 0
  if (t >= sevenDaysAgoMs) {
    logged7dUserIds.add(row.user_id)
    logs7d++
  }

  const prev = lastLogByUser.get(row.user_id)
  if (!prev || (row.logged_at && row.logged_at > prev)) {
    lastLogByUser.set(row.user_id, row.logged_at)
  }
}
```

Tiles read `activatedUserIds.size`, `logged7dUserIds.size`, `logs7d`. The recent-signups rows read `lastLogByUser.get(u.id)`.

Notes:
- No chapter scoping. We want *any* activity across all chapters, so no `.eq('chapter_id', ...)` filter here.
- `now` already exists on the page (`const now = Date.now()`). Reuse it; don't add a second clock read.
- `logged_at` is an ISO string, so the `row.logged_at > prev` string comparison is a valid recency check (ISO sorts lexically).

## UI

Engagement section — place it directly **above** "System totals", mirroring the existing `StatTile` grid:

```tsx
<section className="mb-10">
  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Engagement</p>
  <div className="grid grid-cols-3 gap-3">
    <StatTile label="Activated" value={String(activatedUserIds.size)} />
    <StatTile label="Logged 7d" value={String(logged7dUserIds.size)} />
    <StatTile label="Logs 7d" value={String(logs7d)} />
  </div>
</section>
```

Last-log line in each recent-signups row — append to the existing `<p>` that shows signup date, or add a sibling line:

```tsx
<p className="text-[11px] text-th-faint">
  Signed up {formatDate(u.created_at)} · last logged {
    lastLogByUser.has(u.id) ? formatRelative(lastLogByUser.get(u.id)!) : 'never'
  }
</p>
```

(Drop the existing "last in {last_sign_in_at}" readout or keep it — Josh's call. The log-based "last logged" is the more honest signal; keeping both is fine and costs nothing.)

## Acceptance criteria

- `/admin` shows the three Engagement tiles with correct counts.
- Every recent-signup row shows a real "last logged" relative time, or "never".
- Numbers reconcile by hand against a known test account (e.g. `jryanjacobs@gmail.com`).
- No schema migration. No new dependency. No change to the Users or System-totals sections beyond what's specified.
- Page is still a server component, still `force-dynamic`, still admin-gated via `requireAdmin()`.

## Out of scope (note for later, don't build now)

- Channel attribution at signup (postcard vs Instagram vs DM). The `waitlist`/`joinWaitlist` path is orphaned and the landing page uses open signup, so source is never recorded. Postcards are already printed and unattributable regardless. Revisit only if a future batch needs it.
- A "completed a weekly ceremony" per-user metric. Anchor count is a proxy for now.
- Switching the distinct-count reduction to a Postgres RPC. Only needed if `logs` grows past a few thousand rows and the full-table fetch gets heavy.
