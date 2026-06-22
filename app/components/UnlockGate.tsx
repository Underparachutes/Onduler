'use client'

// Unlock affordance for the locked state. When a logged-in user's content is
// encrypted (`enc_enabled`) but no DEK is loaded on this device — the classic
// reset-password-on-a-fresh-device case — their labels render as "🔒 Locked"
// (see useDecrypted) rather than blank, and the rest of their data (numbers,
// colors, dates, radar) shows normally. Instead of walling the whole app, this
// surfaces a gentle floating pill; tapping it opens the unlock panel (passkey /
// recovery / password). On success the DEK lands in DekProvider, the panel
// closes, and the locked labels decrypt live — no navigation. Spec:
// docs/specs/private-content-encryption.md (step 7).
//
// Mounted once in the root layout (inside DekProvider). It self-suppresses on
// auth/setup routes — /protect already owns its own unlock UI, and the public
// auth pages have no content to unlock.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useDek } from '@/app/components/DekProvider'
import { getKeyEnvelope } from '@/app/actions/keys'
import { UnlockPanel, type UnlockEnvelope } from '@/app/components/UnlockPanel'
import { LockoutRecovery } from '@/app/components/LockoutRecovery'
import { Shell } from '@/app/components/KeySetup'

const EXEMPT = ['/protect', '/login', '/signup', '/forgot-password', '/reset-password']

export function UnlockGate() {
  const { dek, loading, encEnabled, setDek } = useDek()
  const pathname = usePathname()
  const [envelope, setEnvelope] = useState<UnlockEnvelope | null>(null)
  const [open, setOpen] = useState(false)

  const exempt = EXEMPT.some(r => pathname === r || pathname.startsWith(r + '/'))
  const needsUnlock = encEnabled && !loading && !dek && !exempt

  useEffect(() => {
    if (!needsUnlock) return
    let active = true
    getKeyEnvelope()
      .then(env => {
        if (active) setEnvelope({ passkeys: env.passkeys, recovery: env.recovery, password: env.password })
      })
      .catch(() => {})
    return () => { active = false }
  }, [needsUnlock])

  if (!needsUnlock) return null

  // Floating pill — non-blocking, sits above the bottom nav on mobile and clears
  // the sidebar at md+. The app stays visible and navigable behind it.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed left-1/2 z-40 -translate-x-1/2 rounded-full border border-th-border bg-th-surface px-4 py-2 text-sm font-medium text-th-text shadow-lg transition-colors hover:bg-th-surface-2 md:left-auto md:right-6 md:translate-x-0"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        🔒 Unlock your labels
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-th-bg">
      <Shell>
        <button
          onClick={() => setOpen(false)}
          className="mb-6 text-sm text-th-muted transition-colors hover:text-th-text"
        >
          ← Back
        </button>
        <h1 className="mb-3 text-2xl font-semibold text-th-text">Unlock your content</h1>
        <p className="mb-6 text-sm leading-relaxed text-th-muted">
          Your private labels and journal entries are locked on this device. Your data is all still
          here — unlock once with whichever you set up to see the names again.
        </p>
        {envelope ? (
          <UnlockPanel
            envelope={envelope}
            onUnlock={async k => { await setDek(k); setOpen(false) }}
            showUnavailable
          />
        ) : (
          <p className="text-sm text-th-muted">Loading…</p>
        )}
        <LockoutRecovery />
      </Shell>
    </div>
  )
}
