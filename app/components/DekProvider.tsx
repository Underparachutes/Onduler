'use client'

// Holds the unlocked DEK for client components this session. In Phase 2 nothing
// reads it yet (no content is encrypted); the write/read paths in later phases
// consume `useDek()`. Hydrates from the dek-store cache on mount and clears the
// cache when Supabase reports a sign-out, so a logged-out device keeps no key.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDek, setDek as storeDek, clearDek as storeClearDek, hasDekInMemory } from '@/lib/crypto/dek-store'
import { getEncEnabled } from '@/app/actions/keys'

type DekContextValue = {
  dek: CryptoKey | null
  /** True until the initial cache lookup resolves. */
  loading: boolean
  /** Whether this user's content rows are in ciphertext mode (the write/read
   *  encryption gate). False until migration flips it. */
  encEnabled: boolean
  /** Adopt a freshly unlocked/created DEK (also caches it). */
  setDek: (dek: CryptoKey) => Promise<void>
  /** Forget the DEK in memory and cache (e.g. manual lock). */
  clearDek: () => Promise<void>
  /** Re-read enc_enabled (e.g. right after migration flips it) so the write/
   *  read paths activate without a full reload. */
  refreshEncEnabled: () => Promise<void>
}

const DekContext = createContext<DekContextValue | null>(null)

export function DekProvider({ children }: { children: ReactNode }) {
  const [dek, setDekState] = useState<CryptoKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [encEnabled, setEncEnabled] = useState(false)
  // Current session's user id — used to scope the cached DEK so a stale/foreign
  // key from a prior account on this device is never reused.
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()

    ;(async () => {
      try {
        // Resolve the user FIRST: getDek is user-scoped, and we want the cache
        // read to be gated on identity. getSession is a local read (no network).
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id ?? null
        userIdRef.current = uid

        const k = await getDek(uid)
        if (!active) return
        setDekState(k)

        // Learn enc_enabled for ANY authenticated session — even one with no
        // cached DEK — so the unlock gate can spot a locked-but-encrypted
        // session (e.g. after a password reset on a fresh device). getEncEnabled
        // is the only round trip and runs only when a session exists, so public
        // pages and logged-out users still pay nothing.
        if (active && uid) {
          try { setEncEnabled(await getEncEnabled()) } catch { /* keep default */ }
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Drop the cached key on sign-out so it never outlives the session.
        userIdRef.current = null
        void storeClearDek()
        setDekState(null)
        setEncEnabled(false)
      } else if (session?.user?.id) {
        const uid = session.user.id
        userIdRef.current = uid
        // The initial getSession() above can resolve before the session is
        // hydrated, or getEncEnabled() can transiently see a not-yet-refreshed
        // token and return false — leaving encEnabled stuck false (no unlock
        // pill, edit guards inert) even though the account IS encrypted. When a
        // session arrives/refreshes (INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED),
        // backfill the enc flag and the cached DEK so the locked state resolves.
        void (async () => {
          try {
            if (!hasDekInMemory()) {
              const k = await getDek(uid)
              if (k && active) setDekState(k)
            }
            if (active) setEncEnabled(await getEncEnabled())
          } catch {
            /* keep current values */
          }
        })()
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const setDek = async (k: CryptoKey) => {
    // Ensure we know who we're caching for (setDek is only called post-auth).
    let uid = userIdRef.current
    if (!uid) {
      const { data: { session } } = await createClient().auth.getSession()
      uid = session?.user?.id ?? null
      userIdRef.current = uid
    }
    if (uid) await storeDek(k, uid)
    setDekState(k)
    try {
      setEncEnabled(await getEncEnabled())
    } catch {
      // leave the prior flag value
    }
  }

  const clearDek = async () => {
    await storeClearDek()
    setDekState(null)
    setEncEnabled(false)
  }

  const refreshEncEnabled = async () => {
    try {
      setEncEnabled(await getEncEnabled())
    } catch {
      // leave the prior flag value
    }
  }

  return (
    <DekContext.Provider value={{ dek, loading, encEnabled, setDek, clearDek, refreshEncEnabled }}>
      {children}
    </DekContext.Provider>
  )
}

export function useDek(): DekContextValue {
  const ctx = useContext(DekContext)
  if (!ctx) throw new Error('useDek must be used within a DekProvider')
  return ctx
}
