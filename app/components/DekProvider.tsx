'use client'

// Holds the unlocked DEK for client components this session. In Phase 2 nothing
// reads it yet (no content is encrypted); the write/read paths in later phases
// consume `useDek()`. Hydrates from the dek-store cache on mount and clears the
// cache when Supabase reports a sign-out, so a logged-out device keeps no key.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDek, setDek as storeDek, clearDek as storeClearDek } from '@/lib/crypto/dek-store'

type DekContextValue = {
  dek: CryptoKey | null
  /** True until the initial cache lookup resolves. */
  loading: boolean
  /** Adopt a freshly unlocked/created DEK (also caches it). */
  setDek: (dek: CryptoKey) => Promise<void>
  /** Forget the DEK in memory and cache (e.g. manual lock). */
  clearDek: () => Promise<void>
}

const DekContext = createContext<DekContextValue | null>(null)

export function DekProvider({ children }: { children: ReactNode }) {
  const [dek, setDekState] = useState<CryptoKey | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getDek()
      .then(k => {
        if (active) setDekState(k)
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
  }

  const clearDek = async () => {
    await storeClearDek()
    setDekState(null)
  }

  return (
    <DekContext.Provider value={{ dek, loading, setDek, clearDek }}>
      {children}
    </DekContext.Provider>
  )
}

export function useDek(): DekContextValue {
  const ctx = useContext(DekContext)
  if (!ctx) throw new Error('useDek must be used within a DekProvider')
  return ctx
}
