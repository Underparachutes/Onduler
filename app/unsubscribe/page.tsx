import Link from 'next/link'

// Confirm-unsubscribe page. The email's unsubscribe link is a GET, and
// mail scanners / privacy proxies prefetch links — so the GET on the API
// route lands here instead of mutating. The flip only happens when the
// visitor submits this form (a POST). No auth required: the per-user
// token in the URL is the auth.
type SearchParams = Promise<{ token?: string }>

export default async function UnsubscribeConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { token } = await searchParams

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-16">
      <div className="w-full max-w-[22rem]">
        <p className="brand-text mb-2 text-xs uppercase tracking-widest text-th-muted">Onduler</p>

        {token ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-th-text">Unsubscribe from cycle-close emails?</h1>
            <p className="mb-10 text-sm leading-relaxed text-th-muted">
              You&apos;ll stop getting the weekly cycle-close email. The surface is still there when you want it.
            </p>

            <form method="post" action={`/api/email/unsubscribe?token=${encodeURIComponent(token)}`}>
              <button
                type="submit"
                className="mb-6 inline-block rounded-lg border border-th-border bg-th-surface px-4 py-2 text-sm text-th-text transition-all active:scale-[0.97]"
              >
                Unsubscribe
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-th-text">We couldn&apos;t find that link.</h1>
            <p className="mb-10 text-sm leading-relaxed text-th-muted">
              The unsubscribe link may have expired or been mistyped. You can manage cycle-close emails from Settings inside Onduler.
            </p>
          </>
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
