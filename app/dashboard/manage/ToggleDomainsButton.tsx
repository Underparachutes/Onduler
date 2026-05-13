'use client'

import { useTransition } from 'react'
import { setDomainsEnabled } from '@/app/actions/settings'

export function ToggleDomainsButton({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { await setDomainsEnabled(!enabled) })}
      disabled={isPending}
      className="text-xs text-th-faint hover:text-th-muted transition-colors disabled:opacity-50"
    >
      {enabled ? 'Disable domains' : 'Enable domains'}
    </button>
  )
}
