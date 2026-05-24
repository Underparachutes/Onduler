import 'server-only'
import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (stripe) return stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('getStripe: missing STRIPE_SECRET_KEY in env')
  }

  stripe = new Stripe(key, {
    appInfo: { name: 'Onduler', url: 'https://onduler.app' },
  })

  return stripe
}
