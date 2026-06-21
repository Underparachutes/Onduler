'use client'

// The write/read encryption API for content fields, gated on `encActive`
// (a DEK is held AND this user is in ciphertext mode). When inactive, every
// helper is a pass-through, so call sites are safe to adopt now and stay inert
// until migration flips `enc_enabled`. Spec: docs/specs/private-content-encryption.md

import { useCallback } from 'react'
import { useDek } from '@/app/components/DekProvider'
import { encryptField, decryptField } from '@/lib/crypto/content'

export function useContentCrypto() {
  const { dek, encEnabled } = useDek()
  const active = !!dek && encEnabled
  // Locked: this account is in ciphertext mode but no key is loaded. Writes must
  // be refused — otherwise a save would either store plaintext into an encrypted
  // account or persist the "🔒 Locked" placeholder over a real name. Edit UIs
  // disable themselves while locked (useLocked); this is the last-line guard.
  const locked = encEnabled && !dek

  // Encrypt one value (pass-through when inactive). Empty strings pass through
  // so "is it empty?" checks (required-name guards, nullable optional text)
  // keep working once encryption is active.
  const encryptContent = useCallback(
    async (value: string): Promise<string> => {
      if (locked) throw new Error('Content is locked — unlock to make changes.')
      return active && dek && value ? encryptField(dek, value) : value
    },
    [active, dek, locked],
  )

  // Encrypt the named string fields of a FormData in place, then return it —
  // for wrapping `<form action={…}>` server actions without reshaping the form.
  const encryptFormData = useCallback(
    async (fd: FormData, fields: readonly string[]): Promise<FormData> => {
      if (locked) throw new Error('Content is locked — unlock to make changes.')
      if (!active || !dek) return fd
      for (const f of fields) {
        const v = fd.get(f)
        if (typeof v === 'string' && v !== '') fd.set(f, await encryptField(dek, v))
      }
      return fd
    },
    [active, dek, locked],
  )

  // Decrypt one value (pass-through on plaintext / when inactive). Used by the
  // Phase 4 read paths and by duplicate-style flows that re-encrypt.
  const decryptContent = useCallback(
    async (value: string | null | undefined): Promise<string> => {
      if (value == null) return ''
      if (!dek) return value
      return decryptField(dek, value)
    },
    [dek],
  )

  return { encActive: active, encryptContent, encryptFormData, decryptContent }
}
