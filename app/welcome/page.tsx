import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-full flex-col items-center px-4 py-16">
      <div className="w-full max-w-[22rem]">
        {user && (
          <Link
            href="/settings"
            className="mb-6 inline-block text-xs text-th-faint transition-all hover:text-th-muted active:scale-[0.97]"
          >
            ← Settings
          </Link>
        )}
        <h1 className="mb-1 text-2xl font-semibold tracking-[0.05em] text-th-text">Install Onduler</h1>
        <p className="mb-10 text-sm text-th-muted">
          Onduler works best as a home-screen app. Follow the steps for your device.
        </p>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-th-muted">iPhone / iPad</h2>
          <ol className="flex flex-col gap-3 text-sm text-th-text">
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">1.</span>
              <span>Open <strong>onduler.app</strong> in Safari</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">2.</span>
              <span>Tap the <strong>Share</strong> button (the square with an arrow pointing up)</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">3.</span>
              <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">4.</span>
              <span>Tap <strong>Add</strong> in the top right</span>
            </li>
          </ol>
          <p className="mt-3 text-xs text-th-faint">Must use Safari. Chrome and Firefox on iOS don't support home-screen apps.</p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-th-muted">Android</h2>
          <ol className="flex flex-col gap-3 text-sm text-th-text">
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">1.</span>
              <span>Open <strong>onduler.app</strong> in Chrome</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">2.</span>
              <span>Tap the <strong>three-dot menu</strong> in the top right</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">3.</span>
              <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 text-th-faint">4.</span>
              <span>Tap <strong>Install</strong></span>
            </li>
          </ol>
        </section>

        {user ? (
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors active:scale-[0.97]"
          >
            Go to motions
          </Link>
        ) : (
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors active:scale-[0.97]"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-th-border px-4 py-2 text-sm font-medium text-th-secondary transition-colors active:scale-[0.97]"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
