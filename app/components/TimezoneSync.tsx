'use client'

import { useEffect } from 'react'
import { syncTimezone } from '@/app/actions/settings'

// Auto-follow-the-device timezone capture. On app load, read the browser's IANA
// zone; if it differs from what's stored, persist it — so opening the app in a
// new zone (travel) updates the user's day-reset and ceremony time. Only
// rendered for authenticated users (see AppShell), and only writes on a real
// change, so it's near-free on the common path. Part of the per-user-timezone
// effort. See docs/specs/per-user-timezone-2026-07-03.md.
export function TimezoneSync({ storedTimezone }: { storedTimezone: string | null }) {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && tz !== storedTimezone) {
      void syncTimezone(tz)
    }
  }, [storedTimezone])
  return null
}
