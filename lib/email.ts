import 'server-only'
import { Resend } from 'resend'

// Centralized Resend client + send wrapper. The Resend SDK is server-only
// (it carries the secret API key); the 'server-only' import above causes
// Next to throw a build error if this module accidentally lands in a
// client bundle. Same pattern as lib/supabase/admin.ts and lib/stripe.ts.
//
// Defaults assume the canonical sender hello@onduler.app once the domain
// is verified in Resend. Reply-to routes to ondulertest@gmail.com so the
// no-inbox-on-onduler.app constraint doesn't trap real replies.

let cachedClient: Resend | null = null

function getResend(): Resend {
  if (cachedClient) return cachedClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set. Add it to .env.local and Vercel env vars.')
  }
  cachedClient = new Resend(apiKey)
  return cachedClient
}

export const DEFAULT_FROM = 'Onduler <hello@onduler.app>'
export const DEFAULT_REPLY_TO = 'ondulertest@gmail.com'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
  // Per-user unsubscribe URL. Surfaces both as a clickable link in the
  // body and as a List-Unsubscribe header so Gmail/Apple Mail can offer
  // their native one-click unsubscribe action.
  unsubscribeUrl?: string
  // Override the defaults when needed (transactional vs. operational
  // sends might prefer different from/reply-to addresses someday).
  from?: string
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput) {
  const { to, subject, html, text, unsubscribeUrl } = input
  const headers: Record<string, string> = {}
  if (unsubscribeUrl) {
    // RFC 8058: List-Unsubscribe-Post indicates the client may POST to
    // the URL to unsubscribe without a confirmation page. Our route
    // accepts both GET and POST and treats them identically.
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }

  return getResend().emails.send({
    from: input.from ?? DEFAULT_FROM,
    to,
    subject,
    html,
    text,
    replyTo: input.replyTo ?? DEFAULT_REPLY_TO,
    headers: Object.keys(headers).length ? headers : undefined,
  })
}
