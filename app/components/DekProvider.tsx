'use client'

// Holds the unlocked DEK for client components this session. In Phase 2 nothing
// reads it yet (no content is encrypted); the write/read paths in later phases
// consume `useDek()`. Hydrates from the dek-store cache on mount and clears the
// cache when Supabase reports a sign-out, so a logged-out device keeps no key.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDek, setDek as storeDek, clearDek as storeClearDek } from '@/lib/crypto/dek-store'
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

  useEffect(() => {
    let active = true
    getDek()
      .then(k => {
        if (!active) return
        setDekState(k)
        // Only pay for the flag read when a DEK exists (i.e. an authenticated,
        // set-up user) — public pages and logged-out users skip it entirely.
        if (k) getEncEnabled().then(v => { if (active) setEncEnabled(v) }).catch(() => {})
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    // Drop the cached key on sign-out so it never outlives the session.
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void storeClearDek()
        setDekState(null)
        setEncEnabled(false)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const setDek = async (k: CryptoKey) => {
    await storeDek(k)
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
