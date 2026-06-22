// Relabel-in-place: the gentler alternative to a full wipe when a user has lost
// every way to unlock their encrypted content. Their logs, dates, colors, and
// structure are NOT encrypted and stay perfectly intact — only the names/journal
// text are sealed under the lost key. So instead of deleting everything, the user
// sets up a FRESH key and we rewrite just the unreadable content under it:
//   - a name still sealed under the old key  -> a blank placeholder to rename
//   - a name that's readable (plaintext, or already under the NEW key) -> kept
//   - journal text sealed under the old key  -> cleared (there's no meaningful
//     placeholder for prose, and the words themselves are gone either way)
//
// This module is PURE (Web Crypto only, no server imports) so the classify/encrypt
// logic is unit-testable. Orchestration lives in app/protect/runRelabel.ts.
//
// Idempotency / crash-safety: we never trust the `enc:` prefix to tell old-key
// from new-key ciphertext (both look identical). Instead we TRY to decrypt each
// field with the new key — success means it's already readable under the new key
// (a partial re-run, or a preserved value) and we leave it; failure means it's
// stale old-key ciphertext and we replace it. So a re-run after a crash never
// clobbers a label the user already fixed.

import { encryptField, decryptField, isEncrypted } from './content'
import { REFLECTION_FIELDS, type MigrationContent, type ReflectionField } from './migrate'

// Blank names the user can rename at their own pace. User-facing vocabulary:
// "bucket" (table `groups`) and "waypoint" (table `milestones`).
export const RELABEL_PLACEHOLDERS = {
  motions: 'Untitled motion',
  swells: 'Untitled swell',
  groups: 'Untitled bucket',
  milestones: 'Untitled waypoint',
} as const

type NameTable = keyof typeof RELABEL_PLACEHOLDERS

// Names are always written as ciphertext strings; reflection text fields may be
// cleared to null when their old text is unrecoverable.
export type RelabelUpdates = {
  motions: { id: string; name: string }[]
  swells: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  milestones: { id: string; name: string }[]
  reflections: { id: string; fields: Partial<Record<ReflectionField, string | null>> }[]
}

const SKIP = Symbol('skip')

// Decide what to write for a name field under the new DEK.
//   SKIP            -> leave the row untouched
//   string          -> write this ciphertext (a placeholder, or a preserved value)
async function nameDecision(
  dek: CryptoKey,
  value: string | null,
  placeholder: string,
): Promise<string | typeof SKIP> {
  if (typeof value !== 'string' || value === '') return SKIP
  if (isEncrypted(value)) {
    try {
      await decryptField(dek, value) // readable under the new key already → keep
      return SKIP
    } catch {
      return encryptField(dek, placeholder) // sealed under the lost key → blank it
    }
  }
  return encryptField(dek, value) // readable plaintext → preserve under the new key
}

// Decide what to write for a journal text field under the new DEK.
//   SKIP   -> leave untouched
//   null   -> clear (old text is unrecoverable)
//   string -> write this ciphertext (a preserved plaintext value)
async function textDecision(
  dek: CryptoKey,
  value: string | null,
): Promise<string | null | typeof SKIP> {
  if (typeof value !== 'string' || value === '') return SKIP
  if (isEncrypted(value)) {
    try {
      await decryptField(dek, value)
      return SKIP
    } catch {
      return null
    }
  }
  return encryptField(dek, value)
}

// Build the rewrite set from the server's content, using the freshly created DEK.
// Pure: no network, no flag flips.
export async function buildRelabelUpdates(
  dek: CryptoKey,
  content: MigrationContent,
): Promise<RelabelUpdates> {
  const updates: RelabelUpdates = { motions: [], swells: [], groups: [], milestones: [], reflections: [] }

  for (const table of ['motions', 'swells', 'groups', 'milestones'] as const) {
    for (const row of content[table]) {
      const d = await nameDecision(dek, row.name, RELABEL_PLACEHOLDERS[table as NameTable])
      if (d !== SKIP) updates[table].push({ id: row.id, name: d })
    }
  }

  for (const row of content.reflections) {
    const fields: Partial<Record<ReflectionField, string | null>> = {}
    for (const f of REFLECTION_FIELDS) {
      const d = await textDecision(dek, row[f])
      if (d !== SKIP) fields[f] = d
    }
    if (Object.keys(fields).length > 0) updates.reflections.push({ id: row.id, fields })
  }

  return updates
}

export function hasRelabelWork(updates: RelabelUpdates): boolean {
  return (
    updates.motions.length > 0 ||
    updates.swells.length > 0 ||
    updates.groups.length > 0 ||
    updates.milestones.length > 0 ||
    updates.reflections.length > 0
  )
}
