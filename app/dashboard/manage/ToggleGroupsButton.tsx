'use client'

import { useTransition } from 'react'
import { setGroupsEnabled } from '@/app/actions/settings'

export function ToggleGroupsButton({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { await setGroupsEnabled(!enabled) })}
      disabled={isPending}
      className="text-xs text-th-faint transition-colors hover:text-th-muted disabled:opacity-50"
    >
      {enabled ? 'Disable groups' : 'Enable groups'}
    </button>
  )
}
