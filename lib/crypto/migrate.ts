// Lazy, per-user content migration: turn a user's existing PLAINTEXT content
// rows into ciphertext, in the browser, with their unlocked DEK. The server
// never sees a key — it hands back plaintext rows here and writes back the
// ciphertext blindly. Spec: docs/specs/private-content-encryption.md (step 6).
//
// This module is PURE (Web Crypto only, no server imports) so the encrypt/skip
// logic is unit-testable. The orchestration that calls the server actions lives
// in app/protect/runMigration.ts.
//
// Idempotency is the whole safety story: every field is encrypted only when it
// is a non-empty string that isn't ALREADY ciphertext. So a re-run after a
// crash never double-encrypts, and a mixed plaintext/ciphertext table is always
// readable (decryptField passes plaintext through). enc_enabled flips true only
// after the rows are written, never before.

import { encryptField, isEncrypted } from './content'

// Mirrors ENCRYPTED_FIELDS.reflections in content.ts — the journal text fields.
export const REFLECTION_FIELDS = [
  'expectation_text',
  'observation_text',
  'intention_text',
  'body_text',
  'prompt_text',
] as const

export type ReflectionField = (typeof REFLECTION_FIELDS)[number]

// The plaintext (or mixed) rows the server returns for migration. Every content
// table the spec encrypts, across ALL chapters (archived ones carry content too).
export type MigrationContent = {
  motions: { id: string; name: string }[]
  swells: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  milestones: { id: string; name: string }[]
  reflections: ({ id: string } & Record<ReflectionField, string | null>)[]
}

// The ciphertext the client sends back — only the rows/fields that actually
// changed, so an already-migrated row contributes nothing to the write.
export type MigrationUpdates = {
  motions: { id: string; name: string }[]
  swells: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  milestones: { id: string; name: string }[]
  reflections: { id: string; fields: Partial<Record<ReflectionField, string>> }[]
}

// Encrypt a value unless there's nothing to do: null/empty (keep "is it empty?"
// checks valid — the live write path skips empties too) or already ciphertext
// (the idempotency guard). Returns null to mean "leave this field untouched".
async function encIfNeeded(dek: CryptoKey, value: string | null): Promise<string | null> {
  if (typeof value !== 'string' || value === '' || isEncrypted(value)) return null
  return encryptField(dek, value)
}

// Build the ciphertext write set from the server's content. Pure: no network,
// no flag flips — just the per-field encrypt/skip decision for every row.
export async function buildMigrationUpdates(
  dek: CryptoKey,
  content: MigrationContent,
): Promise<MigrationUpdates> {
  const updates: MigrationUpdates = { motions: [], swells: [], groups: [], milestones: [], reflections: [] }

  for (const table of ['motions', 'swells', 'groups', 'milestones'] as const) {
    for (const row of content[table]) {
      const enc = await encIfNeeded(dek, row.name)
      if (enc !== null) updates[table].push({ id: row.id, name: enc })
    }
  }

  for (const row of content.reflections) {
    const fields: Partial<Record<ReflectionField, string>> = {}
    for (const f of REFLECTION_FIELDS) {
      const enc = await encIfNeeded(dek, row[f])
      if (enc !== null) fields[f] = enc
    }
    if (Object.keys(fields).length > 0) updates.reflections.push({ id: row.id, fields })
  }

  return updates
}

// True when the updates carry at least one row to write.
export function hasMigrationWork(updates: MigrationUpdates): boolean {
  return (
    updates.motions.length > 0 ||
    updates.swells.length > 0 ||
    updates.groups.length > 0 ||
    updates.milestones.length > 0 ||
    updates.reflections.length > 0
  )
}
