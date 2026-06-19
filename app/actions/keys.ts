'use server'

// Persist and read the ENVELOPE only — the wrapped DEK blobs and public salts.
// No key, password, recovery code, or PRF output ever reaches these functions.
// Every action verifies the session and operates RLS-scoped to the caller.
//
// Spec: docs/specs/private-content-encryption.md (Phase 2 — key lifecycle).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Plain wire shapes (mirror lib/crypto/keys.ts, kept local so this server module
// doesn't pull the browser crypto graph).
export type WrappedSlot = { wrapped: string; salt: string }
export type PasskeySlotWire = {
  credentialId: string
  encDekPasskey: string
  prfSalt: string
  label?: string | null
}

export type EncSetupState = {
  complete: boolean
  hasPasskey: boolean
  hasRecovery: boolean
  hasPassword: boolean
  encEnabled: boolean
}

// Setup is "complete" once the mandatory recovery slot exists AND at least one
// primary unlock (passkey preferred, password fallback) is present.
export async function getEncSetupState(): Promise<EncSetupState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { complete: false, hasPasskey: false, hasRecovery: false, hasPassword: false, encEnabled: false }

  const [{ data: settings }, { count: passkeyCount }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('enc_enabled, enc_dek_recovery, enc_dek_password')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_key_passkeys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const hasPasskey = (passkeyCount ?? 0) > 0
  const hasRecovery = !!settings?.enc_dek_recovery
  const hasPassword = !!settings?.enc_dek_password
  return {
    complete: hasRecovery && (hasPasskey || hasPassword),
    hasPasskey,
    hasRecovery,
    hasPassword,
    encEnabled: !!settings?.enc_enabled,
  }
}

// Lightweight per-user flag: are this user's content rows in ciphertext mode?
// Drives the client-side write/read encryption gate. False until migration.
export async function getEncEnabled(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('user_settings')
    .select('enc_enabled')
    .eq('user_id', user.id)
    .single()
  return !!data?.enc_enabled
}

// Everything the browser needs to UNLOCK the DEK. Still no secrets — these are
// the wrapped blobs and the public salts; useless without the user's secret.
export async function getKeyEnvelope(): Promise<{
  recovery: WrappedSlot | null
  password: WrappedSlot | null
  passkeys: PasskeySlotWire[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { recovery: null, password: null, passkeys: [] }

  const [{ data: settings }, { data: passkeys }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('enc_dek_recovery, enc_recovery_salt, enc_dek_password, enc_kdf_salt')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_key_passkeys')
      .select('credential_id, enc_dek_passkey, prf_salt, label')
      .eq('user_id', user.id),
  ])

  return {
    recovery: settings?.enc_dek_recovery && settings?.enc_recovery_salt
      ? { wrapped: settings.enc_dek_recovery, salt: settings.enc_recovery_salt }
      : null,
    password: settings?.enc_dek_password && settings?.enc_kdf_salt
      ? { wrapped: settings.enc_dek_password, salt: settings.enc_kdf_salt }
      : null,
    passkeys: (passkeys ?? []).map(p => ({
      credentialId: p.credential_id,
      encDekPasskey: p.enc_dek_passkey,
      prfSalt: p.prf_salt,
      label: p.label,
    })),
  }
}

// Write the recovery slot (mandatory) and, only when supplied, the password
// fallback slot. Upsert keyed on user_id — a settings row already exists from
// signup. Never flips enc_enabled (that's the migration phase).
export async function persistCoreSlots(input: {
  recovery: WrappedSlot
  password?: WrappedSlot
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const row: Record<string, unknown> = {
    user_id: user.id,
    enc_dek_recovery: input.recovery.wrapped,
    enc_recovery_salt: input.recovery.salt,
  }
  if (input.password) {
    row.enc_dek_password = input.password.wrapped
    row.enc_kdf_salt = input.password.salt
  }

  const { error } = await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  return {}
}

// Add a passkey slot. During first-time setup pass replaceExisting so a bailed
// earlier attempt can't leave a dead slot wrapping a stale DEK; in Settings
// (adding another device) pass false to keep existing passkeys.
export async function persistPasskeySlot(
  slot: PasskeySlotWire,
  opts: { replaceExisting?: boolean } = {},
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (opts.replaceExisting) {
    const { error: delErr } = await supabase.from('user_key_passkeys').delete().eq('user_id', user.id)
    if (delErr) return { error: delErr.message }
  }

  const { error } = await supabase.from('user_key_passkeys').insert({
    user_id: user.id,
    credential_id: slot.credentialId,
    enc_dek_passkey: slot.encDekPasskey,
    prf_salt: slot.prfSalt,
    label: slot.label ?? null,
  })
  if (error) return { error: error.message }
  return {}
}

// Add a password fallback slot to an already-set-up account (Tier-2 opt-in or
// a password change re-wrap). Separate from persistCoreSlots so it can't wipe
// the recovery slot.
export async function persistPasswordSlot(password: WrappedSlot): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_settings')
    .update({ enc_dek_password: password.wrapped, enc_kdf_salt: password.salt })
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

// Re-wrap the recovery slot under a freshly generated recovery code (Settings:
// "regenerate recovery code"). Overwrites the recovery columns only — the old
// code stops working the moment its salt is replaced. Never touches passkey or
// password slots, and never flips enc_enabled.
export async function persistRecoverySlot(recovery: WrappedSlot): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_settings')
    .update({ enc_dek_recovery: recovery.wrapped, enc_recovery_salt: recovery.salt })
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

// Remove the password fallback slot (Settings: "reduce my risk surface").
export async function removePasswordSlot(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_settings')
    .update({ enc_dek_password: null, enc_kdf_salt: null })
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

export async function removePasskeySlot(credentialId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_key_passkeys')
    .delete()
    .eq('user_id', user.id)
    .eq('credential_id', credentialId)
  if (error) return { error: error.message }
  return {}
}

// Last-resort lockout escape. A user who can't unlock their encrypted content
// (no working passkey, no password, no recovery code) has data that is
// unrecoverable by ANYONE, us included — that's the E2EE guarantee. Rather than
// trap them, wipe the unreadable content + all key material and reset to a
// clean, keyless, pre-onboarding account so they can start over and set up new
// protection. DESTRUCTIVE and irreversible. RLS-scoped to the caller; plain
// preferences (theme, tracking mode, daily goals, haptics, celebration) survive.
// Spec: docs/specs/private-content-encryption.md (Recovery — option B).
export async function startFreshAfterLockout(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Delete ALL chapters (active + archived). The chapter_id ON DELETE CASCADE
  //    removes every chapter-scoped table — motions, swells, groups, logs,
  //    wave_checkins, reflections — and their children (motion_swells,
  //    milestones, milestone_hits) transitively.
  const { error: chErr } = await supabase.from('chapters').delete().eq('user_id', user.id)
  if (chErr) return { error: chErr.message }

  // 2. Drop every passkey key-slot.
  const { error: pkErr } = await supabase.from('user_key_passkeys').delete().eq('user_id', user.id)
  if (pkErr) return { error: pkErr.message }

  // 3. Reset encryption + onboarding state to brand-new. enc_enabled goes false
  //    so the write/read paths and the unlock gate stand down; the user re-sets
  //    keys at /protect and re-onboards.
  const { error: setErr } = await supabase
    .from('user_settings')
    .update({
      enc_enabled: false,
      enc_dek_recovery: null,
      enc_recovery_salt: null,
      enc_dek_password: null,
      enc_kdf_salt: null,
      onboarding_complete: false,
      primary_build: null,
      secondary_build: null,
      mvs_motions: null,
      welcome_back_mode: null,
      welcome_back_started_at: null,
    })
    .eq('user_id', user.id)
  if (setErr) return { error: setErr.message }

  revalidatePath('/', 'layout')
  return {}
}
