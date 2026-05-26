'use client'

import { useActionState } from 'react'
import { changePassword } from '@/app/actions/auth'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(changePassword, undefined)

  if (state?.success) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-[22rem] text-center">
          <h1 className="mb-2 text-2xl font-semibold text-th-text">
            Password updated
          </h1>
          <p className="mb-8 text-sm text-th-muted">
            You&apos;re all set.{' '}
            <a href="/dashboard" className="font-medium text-th-text underline underline-offset-4">
              Go to your dashboard
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24">
      <div className="w-full max-w-[22rem]">
        <h1 className="mb-2 text-2xl font-semibold text-th-text">
          Set a new password
        </h1>
        <p className="mb-8 text-sm text-th-muted">
          Choose something you&apos;ll remember this time.
        </p>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new_password" className="text-sm font-medium text-th-secondary">
              New password
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              required
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm_password" className="text-sm font-medium text-th-secondary">
              Confirm password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
          >
            {pending ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
