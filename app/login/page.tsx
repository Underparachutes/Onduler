'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'
import { getKeyEnvelope } from '@/app/actions/keys'
import { authenticatePasskey } from '@/lib/auth/passkey'
import { unwrapWithPrf, passkeySupported } from '@/lib/crypto/keys'
import { useDek } from '@/app/components/DekProvider'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined)
  const [email, setEmail] = useState('')
  const { setDek } = useDek()
  const [pkSupported, setPkSupported] = useState(false)
  const [pkBusy, setPkBusy] = useState(false)
  const [pkError, setPkError] = useState<string | null>(null)

  // Detect support post-mount (no navigator during SSR; avoids a hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM feature read
    setPkSupported(passkeySupported())
  }, [])

  async function passkeyLogin() {
    setPkError(null)
    setPkBusy(true)
    try {
      // One ceremony: Supabase issues the session, and we read the PRF secret
      // that unwraps the content key.
      const { credentialId, prfOutput } = await authenticatePasskey()
      const env = await getKeyEnvelope() // session now exists → RLS-scoped read
      const slot = env.passkeys.find(p => p.credentialId === credentialId)
      if (slot) await setDek(await unwrapWithPrf(slot.encDekPasskey, prfOutput))
      // Hard navigation so the server/middleware pick up the new session cookie;
      // DekProvider re-hydrates the cached DEK on the next mount.
      window.location.assign('/dashboard')
    } catch {
      setPkError('Passkey sign-in didn’t complete. Try again, or use your email and password below.')
      setPkBusy(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">Welcome back</h1>
        <p className="mb-8 text-sm text-th-muted">Sign in to Onduler</p>

        {pkSupported && (
          <>
            <button
              type="button"
              onClick={passkeyLogin}
              disabled={pkBusy}
              className="w-full rounded-lg bg-th-btn px-4 py-2.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
            >
              {pkBusy ? 'Signing in…' : 'Sign in with Face ID / passkey'}
            </button>
            {pkError && <p className="mt-2 text-sm text-red-500">{pkError}</p>}
            <div className="my-6 flex items-center gap-3 text-xs text-th-faint">
              <span className="h-px flex-1 bg-th-border" />
              or use email
              <span className="h-px flex-1 bg-th-border" />
            </div>
          </>
        )}

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-th-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-th-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">
              That email and password didn&apos;t match. Try again, or{' '}
              <Link href="/signup" className="underline underline-offset-4">Sign up</Link>?
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg border border-th-border px-4 py-2 text-sm font-medium text-th-text transition-colors hover:bg-th-surface disabled:opacity-50"
          >
            {pending ? 'Signing in…' : 'Sign in with email'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-th-muted">
          No account?{' '}
          <Link href="/signup" className="font-medium text-th-text underline underline-offset-4">
            Sign up
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-th-muted">
          <Link href="/forgot-password" className="text-th-muted underline underline-offset-4 hover:text-th-text">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  )
}
