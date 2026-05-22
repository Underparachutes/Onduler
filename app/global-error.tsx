'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-[100dvh] items-center justify-center bg-th-bg text-th-text">
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
          <button
            onClick={() => unstable_retry()}
            className="rounded-lg bg-th-btn px-4 py-2 text-sm text-th-btn-text"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
