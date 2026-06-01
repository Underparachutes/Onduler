import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatHrs } from '@/lib/format'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const admin = createAdminClient()

  const { data: userResult } = await admin.auth.admin.getUserById(id)
  const targetUser = userResult?.user
  if (!targetUser) notFound()

  const [
    { data: settings },
    { count: motionCount },
    { count: swellCount },
    { count: logCount },
    { count: chapterCount },
    { count: anchorCount },
    { count: waypointCount },
    { data: lastLog },
    { data: recentLogs },
  ] = await Promise.all([
    admin
      .from('user_settings')
      .select('onboarding_complete, tracking_mode, theme, primary_build, secondary_build, is_admin')
      .eq('user_id', id)
      .maybeSingle(),
    admin.from('motions').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('swells').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('logs').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('chapters').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('reflections').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('milestones').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin
      .from('logs')
      .select('logged_at')
      .eq('user_id', id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('logs')
      .select('id, points, hours, logged_at, motions(name)')
      .eq('user_id', id)
      .order('logged_at', { ascending: false })
      .limit(5),
  ])

  type RecentLog = {
    id: string
    points: number
    hours: number
    logged_at: string
    motions: { name: string } | { name: string }[] | null
  }
  const logs = (recentLogs ?? []) as RecentLog[]

  return (
    <div className="flex min-h-full flex-col px-4 py-8">
      <div className="w-full max-w-3xl">
        <Link
          href="/admin"
          className="mb-4 inline-block text-xs text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
        >
          ← Admin
        </Link>

        <h1 className="mb-1 text-2xl font-semibold text-th-text">
          {targetUser.email ?? '(no email)'}
        </h1>
        <p className="mb-8 text-xs text-th-muted">
          Signed up {formatDate(targetUser.created_at)} · last in {formatDateTime(targetUser.last_sign_in_at)}
        </p>

        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Profile</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Onboarding" value={settings?.onboarding_complete ? 'complete' : 'not complete'} />
            <Field label="Tracking" value={settings?.tracking_mode ?? '—'} />
            <Field label="Theme" value={settings?.theme ?? '—'} />
            <Field label="Admin" value={settings?.is_admin ? 'yes' : 'no'} />
            <Field label="Primary shape" value={settings?.primary_build ?? '—'} />
            <Field label="Secondary shape" value={settings?.secondary_build ?? '—'} />
          </dl>
        </section>

        <section className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">Counts</p>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Motions" value={String(motionCount ?? 0)} />
            <StatTile label="Swells" value={String(swellCount ?? 0)} />
            <StatTile label="Logs" value={String(logCount ?? 0)} />
            <StatTile label="Chapters" value={String(chapterCount ?? 0)} />
            <StatTile label="Anchors" value={String(anchorCount ?? 0)} />
            <StatTile label="Waypoints" value={String(waypointCount ?? 0)} />
          </div>
        </section>

        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-th-muted">
            Activity. Last log {lastLog?.logged_at ? formatDateTime(lastLog.logged_at) : 'never'}
          </p>
          {logs.length === 0 ? (
            <p className="rounded-lg border border-th-border px-4 py-3 text-xs text-th-faint">
              No logs yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-th-border rounded-lg border border-th-border">
              {logs.map(l => {
                const motionRef = Array.isArray(l.motions) ? l.motions[0] : l.motions
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-th-text">
                        {motionRef?.name ?? '(deleted motion)'}
                      </p>
                      <p className="text-[11px] text-th-faint">{formatDateTime(l.logged_at)}</p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-th-muted">
                      {l.points} pts · {formatHrs(Number(l.hours))}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-widest text-th-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-th-text">{value}</dd>
    </div>
  )
}
