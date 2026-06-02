'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitContact } from '@/app/actions/contact'

export default function ContactPage() {
  const [state, action, pending] = useActionState(submitContact, undefined)

  return (
    <div className="flex min-h-full flex-col items-center px-5 py-12 pb-24">
      <div className="w-full max-w-[22rem]">
        <Link
          href="/"
          className="mb-8 inline-block text-xs text-th-muted hover:text-th-text transition-colors"
        >
          &larr; Back
        </Link>

        <h1 className="mb-2 text-2xl font-semibold text-th-text">Contact</h1>
        <p className="mb-8 text-sm text-th-muted">
          Questions, feedback, or data requests. We&apos;d like to hear from you.
        </p>

        {state?.ok ? (
          <div className="rounded-xl border border-th-border bg-th-surface/60 px-5 py-5 text-center">
            <p className="text-sm font-medium text-th-text">Message sent.</p>
            <p className="mt-1.5 text-xs text-th-muted">We&apos;ll get back to you as soon as we can.</p>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium text-th-secondary">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-th-secondary">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="subject" className="text-sm font-medium text-th-secondary">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="message" className="text-sm font-medium text-th-secondary">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="rounded-lg border border-th-border bg-th-surface px-3 py-2 text-sm text-th-text outline-none focus:border-th-focus resize-none"
              />
            </div>

            {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-lg bg-th-btn px-4 py-2 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover disabled:opacity-50"
            >
              {pending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}

        <div className="mt-10 rounded-xl border border-th-border-soft bg-th-surface/40 px-5 py-4 text-sm text-th-muted">
          <p className="mb-1 font-medium text-th-secondary">You can also reach us directly</p>
          <p>
            <a href="mailto:ondulertest@gmail.com" className="text-th-accent underline underline-offset-2">
              ondulertest@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
