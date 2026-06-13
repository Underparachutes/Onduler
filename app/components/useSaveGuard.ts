'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/Toast'

type ActionResult = { error?: string } | void | null

// Shared failure surface for fire-and-forget server-action writes.
//
// Most mutations in the app update local state optimistically and call their
// server action inside startTransition without looking at the result. When
// the write fails, the UI keeps showing the optimistic state and the truth
// quietly disagrees — the user finds out on the next refresh, which reads
// as data loss.
//
// Two failure shapes are covered:
// 1. The action ran and returned { error } (DB write failed server-side).
// 2. The request never reached the server — offline, dropped connection —
//    in which case the action call THROWS (Failed to fetch) instead of
//    returning. That's why guard takes the promise itself, not an awaited
//    result: the try/catch has to wrap the await.
//
// Usage:
//   const guard = useSaveGuard()
//   startTransition(async () => {
//     await guard(someAction(...))
//   })
//
// On failure: shows a quiet toast and refreshes the route so server truth
// replaces any stale optimistic state. Resolves false on failure, true
// otherwise, for callers that gate follow-up work:
//   if (await guard(action(...))) { router.push(...) }
export function useSaveGuard() {
  const toast = useToast()
  const router = useRouter()

  return useCallback(
    async (input: Promise<ActionResult> | ActionResult): Promise<boolean> => {
      const fail = () => {
        toast.show({ message: "That didn't save. Check your connection and try again." })
        router.refresh()
        return false
      }
      let result: ActionResult
      try {
        result = await input
      } catch {
        return fail()
      }
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        return fail()
      }
      return true
    },
    [toast, router]
  )
}
