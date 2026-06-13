'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, undefined)

  if (state && 'emailSent' in state && state.emailSent) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-[22rem]">
          <h1 className="mb-2 text-2xl font-semibold text-th-text">Check your email</h1>
          <p className="mb-8 text-sm text-th-muted">
            We sent a confirmation link to <span className="text-th-text">{state.email}</span>. Open it to finish setting up your account, then sign in.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-th-btn px-4 py-2 text-center text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
          >
            Back to sign in
          </Link>
          <p className="mt-6 text-center text-xs text-th-faint">
            Didn&apos;t get it? Check your spam folder, or{' '}
            <a href="/signup" className="underline underline-offset-4 hover:text-th-muted">try a different email</a>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Create your account
        </h1>
        <p className="mb-8 text-sm text-th-muted">Start riding your tides</p>

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
              autoComplete="new-password"
              required
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-th-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-th-text underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
