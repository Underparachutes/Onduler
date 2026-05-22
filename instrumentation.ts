import * as Sentry from '@sentry/nextjs'

export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  })
}

export const onRequestError = Sentry.captureRequestError
