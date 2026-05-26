'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined)
  const [email, setEmail] = useState('')

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Welcome back
        </h1>
        <p className="mb-8 text-sm text-th-muted">Sign in to Onduler</p>

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
            className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Signing in…' : 'Sign in'}
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
