'use client'

import { useTransition } from 'react'
import { createCheckoutSession, createCustomerPortalSession } from '@/app/actions/billing'

const PLANS = [
  { id: 'monthly' as const, label: '$5 / month', desc: 'Cancel anytime' },
  { id: 'annual' as const, label: '$36 / year', desc: 'Save 40%' },
  { id: 'lifetime' as const, label: '$99 once', desc: 'Lifetime access' },
  { id: 'custom' as const, label: 'Donate', desc: 'Support the cause ($100+)' },
]

type Props = {
  subscriptionStatus: string
  currentPeriodEnd: string | null
}

export function BillingPanel({ subscriptionStatus, currentPeriodEnd }: Props) {
  const [isPending, startTransition] = useTransition()

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
  const isLifetime = subscriptionStatus === 'lifetime'
  const isPastDue = subscriptionStatus === 'past_due'

  function handleCheckout(priceType: 'monthly' | 'annual' | 'lifetime' | 'custom') {
    startTransition(async () => {
      const result = await createCheckoutSession(priceType)
      if ('url' in result) {
        window.location.href = result.url
      }
    })
  }

  function handleManage() {
    startTransition(async () => {
      const result = await createCustomerPortalSession()
      if ('url' in result) {
        window.location.href = result.url
      }
    })
  }

  if (isLifetime) {
    return (
      <div className="rounded-lg border border-th-border bg-th-surface px-4 py-6 text-center">
        <p className="text-sm font-medium text-th-text">You're crew for life.</p>
        <p className="mt-1 text-xs text-th-muted">Thank you for supporting Onduler.</p>
      </div>
    )
  }

  if (isActive || isPastDue) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-th-border bg-th-surface px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-th-text">
                {isPastDue ? 'Payment issue' : 'Active member'}
              </p>
              {currentPeriodEnd && (
                <p className="text-xs text-th-muted">
                  {isPastDue ? 'Please update your payment method' : `Renews ${new Date(currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
            </div>
            <button
              onClick={handleManage}
              disabled={isPending}
              className="text-sm text-th-secondary hover:underline disabled:opacity-40"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {PLANS.map(plan => (
        <button
          key={plan.id}
          onClick={() => handleCheckout(plan.id)}
          disabled={isPending}
          className="flex items-center justify-between rounded-lg border border-th-border px-4 py-4 text-left transition-colors hover:bg-th-surface active:scale-[0.99] disabled:opacity-40"
        >
          <div>
            <p className="text-sm font-medium text-th-text">{plan.label}</p>
            <p className="text-xs text-th-muted">{plan.desc}</p>
          </div>
          <span className="text-sm text-th-faint">→</span>
        </button>
      ))}
    </div>
  )
}
