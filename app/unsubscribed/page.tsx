import Link from 'next/link'

// Public-facing confirmation page reached after the email unsubscribe
// route flips the user's opt-in. No auth required (the unsubscribe link
// from the email is the auth). Token is preserved in the URL so the
// resubscribe button can call the matching route without re-auth.
type SearchParams = Promise<{ status?: string; token?: string }>

const COPY: Record<
  string,
  { title: string; body: string; tone: 'ok' | 'warn' }
> = {
  ok: {
    title: 'Unsubscribed.',
    body: "You won't hear from cycle-close emails again. The surface is still there when you want it.",
    tone: 'ok',
  },
  resubscribed: {
    title: "You're back on the list.",
    body: 'Cycle-close emails will resume next Sunday.',
    tone: 'ok',
  },
  invalid: {
    title: "We couldn't find that link.",
    body: "The unsubscribe link may have expired or been mistyped. You can manage cycle-close emails from Settings inside Onduler.",
    tone: 'warn',
  },
  error: {
    title: 'Something went wrong on our side.',
    body: 'Try again in a moment, or manage cycle-close emails from Settings inside Onduler.',
    tone: 'warn',
  },
}

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const status = params.status ?? 'ok'
  const token = params.token
  const entry = COPY[status] ?? COPY.ok

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-16">
      <div className="w-full max-w-[22rem]">
        <p className="mb-2 text-xs uppercase tracking-widest text-th-muted">Onduler</p>
        <h1 className="mb-3 text-2xl font-semibold text-th-text">{entry.title}</h1>
        <p className="mb-10 text-sm leading-relaxed text-th-muted">{entry.body}</p>

        {status === 'ok' && token && (
          <a
            href={`/api/email/resubscribe?token=${token}`}
            className="mb-6 inline-block rounded-lg border border-th-border bg-th-surface px-4 py-2 text-sm text-th-text transition-all active:scale-[0.97]"
          >
            Resubscribe
          </a>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-th-secondary transition-colors hover:text-th-text active:scale-[0.97]"
          >
            Open Onduler
          </Link>
          <Link
            href="/settings"
            className="text-th-faint transition-colors hover:text-th-muted active:scale-[0.97]"
          >
            Manage email settings
          </Link>
        </div>
      </div>
    </div>
  )
}
