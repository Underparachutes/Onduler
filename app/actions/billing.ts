'use server'

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function ensureStripeCustomer(): Promise<
  { customerId: string } | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (settings?.stripe_customer_id) {
    return { customerId: settings.stripe_customer_id }
  }

  const customer = await getStripe().customers.create({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  })

  await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, stripe_customer_id: customer.id })

  return { customerId: customer.id }
}

function getPriceId(priceType: 'monthly' | 'annual' | 'lifetime' | 'custom'): string {
  const envKey = {
    monthly: 'STRIPE_PRICE_MONTHLY',
    annual: 'STRIPE_PRICE_ANNUAL',
    lifetime: 'STRIPE_PRICE_LIFETIME',
    custom: 'STRIPE_PRICE_CUSTOM',
  }[priceType]

  const priceId = process.env[envKey]
  if (!priceId) throw new Error(`Missing ${envKey} in env`)
  return priceId
}

export async function createCheckoutSession(
  priceType: 'monthly' | 'annual' | 'lifetime' | 'custom',
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = await ensureStripeCustomer()
  if ('error' in result) return result

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('Missing NEXT_PUBLIC_APP_URL in env')

  const session = await getStripe().checkout.sessions.create({
    customer: result.customerId,
    mode: priceType === 'lifetime' || priceType === 'custom' ? 'payment' : 'subscription',
    line_items: [{ price: getPriceId(priceType), quantity: 1 }],
    metadata: { user_id: user.id },
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=canceled`,
    allow_promotion_codes: true,
  })

  if (!session.url) return { error: 'Failed to create checkout session' }
  return { url: session.url }
}

export async function createCustomerPortalSession(): Promise<
  { url: string } | { error: string }
> {
  const result = await ensureStripeCustomer()
  if ('error' in result) return result

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('Missing NEXT_PUBLIC_APP_URL in env')

  const session = await getStripe().billingPortal.sessions.create({
    customer: result.customerId,
    return_url: `${appUrl}/settings`,
  })

  return { url: session.url }
}
