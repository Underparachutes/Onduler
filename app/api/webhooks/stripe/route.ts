import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        supabase,
      )
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
        supabase,
      )
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
        supabase,
      )
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(
        event.data.object as Stripe.Invoice,
        supabase,
      )
      break
  }

  return new Response('ok', { status: 200 })
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient,
) {
  const userId = session.metadata?.user_id
  if (!userId) return

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id

  if (session.mode === 'payment') {
    await supabase
      .from('user_settings')
      .update({
        stripe_customer_id: customerId,
        subscription_status: 'lifetime',
        subscription_id: null,
        current_period_end: null,
      })
      .eq('user_id', userId)
    return
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id
  if (!subscriptionId) return

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

  const periodEnd = subscription.items.data[0]?.current_period_end

  await supabase
    .from('user_settings')
    .update({
      stripe_customer_id: customerId,
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq('user_id', userId)
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient,
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const periodEnd = subscription.items.data[0]?.current_period_end

  await supabase
    .from('user_settings')
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq('stripe_customer_id', customerId)
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient,
) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  await supabase
    .from('user_settings')
    .update({
      subscription_status: 'canceled',
      subscription_id: null,
      current_period_end: null,
    })
    .eq('stripe_customer_id', customerId)
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient,
) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id
  if (!customerId) return

  await supabase
    .from('user_settings')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId)
}
