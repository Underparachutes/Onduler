import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso).getTime()
  const ms = Date.now() - d
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export default async function AdminHomePage() {
  await requireAdmin()
  const admin = createAdminClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Auth users via service role — admin schema is on the dashboard, but
  // listUsers gives us what we need.
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = usersPage?.users ?? []
  const totalUsers = users.length
  const active7d = users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= sevenDaysAgo).length
  const active30d = users.filter(u => u.last_sign_in_at && u.last_sign_in_at >= thirtyDaysAgo).length

  // Recent signups — sort users by created_at desc, take 20
  const recent = [...users]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 20)

  // System totals
  const [
    { count: motionCount },
    { count: swellCount },
    { count: logCount },
    { count: anchorCount },
  ] = await Promise.all([
    admin.from('motions').select('id', { count: 'exact', head: true }),
    admin.from('swells').select('id', { count: 'exact', head: true }),
    admin.from('logs').select('id', { count: 'exact', head: true }),
    admin.from('reflections').select('id', { count: 'exact', head: true }),
  ])

  return (
    <div className="flex min-h-full flex-col px-4 py-8">
      <div className="w-full max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold text-th-text">Admin</h1>
        <p className="mb-8 text-xs text-th-muted">Read-only diagnostics. Service-role bypassed.</p>

        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Users</p>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Total" value={String(totalUsers)} />
            <StatTile label="Active 7d" value={String(active7d)} />
            <StatTile label="Active 30d" value={String(active30d)} />
          </div>
        </section>

        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">System totals</p>
          <div className="grid grid-cols-4 gap-3">
            <StatTile label="Motions" value={String(motionCount ?? 0)} />
            <StatTile label="Swells" value={String(swellCount ?? 0)} />
            <StatTile label="Logs" value={String(logCount ?? 0)} />
            <StatTile label="Anchors" value={String(anchorCount ?? 0)} />
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">
            Recent signups ({recent.length} of {totalUsers})
          </p>
          <ul className="flex flex-col divide-y divide-th-border rounded-lg border border-th-border">
            {recent.map(u => (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-th-surface"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-th-text">
                      {u.email ?? '(no email)'}
                    </p>
                    <p className="text-[11px] text-th-faint">
                      Signed up {formatDate(u.created_at)} · last in {formatRelative(u.last_sign_in_at ?? null)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-th-faint">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-th-border bg-th-surface px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-widest text-th-faint">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-th-text tabular-nums">{value}</p>
    </div>
  )
}
