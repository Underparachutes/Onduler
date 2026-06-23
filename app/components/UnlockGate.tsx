'use client'

// Locked-state alert for an encrypted account whose DEK isn't loaded on this
// device (the reset-password-on-a-fresh-device case, or a cached key that turned
// out to be wrong). Their content labels render as "🔒 Locked" (see useDecrypted)
// while numbers, colors, dates, and the radar still show normally. Rather than a
// quiet floating pill, a persistent top banner states plainly that the key is
// missing, what's hidden, and that editing is paused — with an Unlock button that
// opens the passkey / recovery / password panel. On success the DEK lands in
// DekProvider, the banner clears, and the locked labels decrypt live — no
// navigation. Spec: docs/specs/private-content-encryption.md (step 7).
//
// Mounted once in the root layout (inside DekProvider). It self-suppresses on
// auth/setup routes — /protect already owns its own unlock UI, and the public
// auth pages have no content to unlock.

import { useEffect, useRef, useState } from 'react'
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
  const bannerRef = useRef<HTMLDivElement>(null)

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

  // Push page content down by the banner's real height so the fixed banner never
  // covers the top of the page. Re-measures if the banner wraps to more lines.
  useEffect(() => {
    if (!needsUnlock) return
    const el = bannerRef.current
    if (!el) return
    const apply = () => document.body.style.setProperty('padding-top', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.body.style.removeProperty('padding-top')
    }
  }, [needsUnlock, envelope])

  if (!needsUnlock) return null

  return (
    <>
      {/* Persistent top banner — opaque and above the z-10 page headers, so a
          scrolled header tucks cleanly behind it rather than overlapping. */}
      <div
        ref={bannerRef}
        className="fixed inset-x-0 top-0 z-40 border-b border-th-border bg-th-surface px-4 pb-2.5 shadow-sm"
        style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3 desktop:ml-12 desktop:mr-auto desktop:lg:max-w-4xl">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-th-text">🔒 Your encryption key isn&rsquo;t on this device.</p>
            <p className="text-xs leading-snug text-th-muted">
              Your private names and journal entries are hidden, and editing is paused until you unlock.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full bg-th-btn px-4 py-1.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
          >
            Unlock
          </button>
        </div>
      </div>

      {/* Unlock overlay — the passkey / recovery / password panel. */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-th-bg">
          <Shell>
            <button
              onClick={() => setOpen(false)}
              className="mb-6 text-sm text-th-muted transition-colors hover:text-th-text"
            >
              ← Back
            </button>
            <h1 className="mb-3 text-2xl font-semibold text-th-text">Unlock your content</h1>
            <p className="mb-4 text-sm leading-relaxed text-th-muted">
              Your private labels and journal entries are locked on this device. Your data is all still
              here — unlock once with whichever you set up to see the names again.
            </p>
            <div className="mb-6 rounded-lg border border-th-border bg-th-surface px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-th-faint">What&rsquo;s affected</p>
              <p className="text-xs leading-relaxed text-th-muted">
                Motion, swell, group, and milestone names, plus your journal and reflection text, stay
                hidden until you unlock. Your numbers, colors, dates, and radar are unaffected.
              </p>
            </div>
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
      )}
    </>
  )
}
