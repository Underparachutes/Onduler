'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/Toast'

// Shared failure surface for fire-and-forget server-action writes.
//
// Most mutations in the app update local state optimistically and call their
// server action inside startTransition without looking at the result. When
// the write fails (offline, RLS hiccup, anything), the UI keeps showing the
// optimistic state and the truth quietly disagrees — the user finds out on
// the next refresh, which reads as data loss.
//
// Usage:
//   const guard = useSaveGuard()
//   startTransition(async () => {
//     guard(await someAction(...))
//   })
//
// On error: shows a quiet toast and refreshes the route so server truth
// replaces any stale optimistic state. Returns false on error, true
// otherwise, for callers that want to branch.
export function useSaveGuard() {
  const toast = useToast()
  const router = useRouter()

  return useCallback(
    (result: { error?: string } | void | null): boolean => {
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        toast.show({ message: "That didn't save. Check your connection and try again." })
        router.refresh()
        return false
      }
      return true
    },
    [toast, router]
  )
}
