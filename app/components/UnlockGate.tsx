'use client'

// Auto-unlock prompt. When a logged-in user's content is encrypted
// (`enc_enabled`) but no DEK is loaded on this device — the classic
// reset-password-on-a-fresh-device case — their labels and journal entries
// render blank with no hint why. This overlay detects that state and asks them
// to unlock once (passkey / recovery / password). On success the DEK lands in
// DekProvider, the overlay unmounts, and the content behind it decrypts live —
// no navigation. Spec: docs/specs/private-content-encryption.md (step 7).
//
// Mounted once in the root layout (inside DekProvider). It self-suppresses on
// auth/setup routes — /protect already owns its own unlock UI, and the public
// auth pages have no content to unlock.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useDek } from '@/app/components/DekProvider'
import { getKeyEnvelope } from '@/app/actions/keys'
import { UnlockPanel, type UnlockEnvelope } from '@/app/components/UnlockPanel'
import { Shell } from '@/app/components/KeySetup'

const EXEMPT = ['/protect', '/login', '/signup', '/forgot-password', '/reset-password']

export function UnlockGate() {
  const { dek, loading, encEnabled, setDek } = useDek()
  const pathname = usePathname()
  const [envelope, setEnvelope] = useState<UnlockEnvelope | null>(null)

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-th-bg">
      <Shell>
        <h1 className="mb-3 text-2xl font-semibold text-th-text">Unlock your content</h1>
        <p className="mb-6 text-sm leading-relaxed text-th-muted">
          Your private labels and journal entries are locked on this device. Unlock them once with
          your passkey or recovery code.
        </p>
        {envelope ? (
          <UnlockPanel envelope={envelope} onUnlock={setDek} />
        ) : (
          <p className="text-sm text-th-muted">Loading…</p>
        )}
      </Shell>
    </div>
  )
}
