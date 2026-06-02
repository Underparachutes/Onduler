import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listArchivedChapters } from '@/app/actions/chapters'

function chapterRange(startedAt: string, endedAt: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${fmt.format(new Date(startedAt))} – ${fmt.format(new Date(endedAt))}`
}

function chapterDays(startedAt: string, endedAt: string): number {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

export default async function PastChaptersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const chapters = await listArchivedChapters()

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Past chapters</h1>
        <p className="mb-8 text-xs text-th-muted">
          The chapters you&apos;ve closed. Tap one to see who you were.
        </p>

        {chapters.length === 0 ? (
          <p className="text-sm text-th-muted">
            No closed chapters yet. When you start a new chapter from a cycle-close ceremony, the one you closed will appear here.
          </p>
        ) : (
          <div className="flex flex-col">
            {chapters.map(c => (
              <Link
                key={c.id}
                href={`/settings/chapters/${c.id}`}
                className="flex items-center justify-between gap-3 border-b border-th-border-soft py-4 transition-colors hover:bg-th-surface/50 active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-th-text">
                    {chapterRange(c.startedAt, c.endedAt)}
                  </p>
                  <p className="text-xs text-th-muted">
                    {chapterDays(c.startedAt, c.endedAt)} days
                    {c.logCount > 0 && ` · ${c.logCount} ${c.logCount === 1 ? 'log' : 'logs'}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-th-faint">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
