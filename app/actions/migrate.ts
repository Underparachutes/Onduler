'use server'

// Server side of the content migration (step 6). It only ever moves CIPHERTEXT:
// it hands the client the user's current rows and writes back the encrypted
// values the client returns. No key, password, or plaintext-decision logic lives
// here. RLS scopes everything to the caller; the explicit user_id filters are
// defense in depth. Spec: docs/specs/private-content-encryption.md
//
// Covers ALL chapters (no chapter filter) — archived chapters carry content too,
// and the journal renders past-chapter names/text.

import { createClient } from '@/lib/supabase/server'
import { REFLECTION_FIELDS, type MigrationContent, type MigrationUpdates } from '@/lib/crypto/migrate'
import type { RelabelUpdates } from '@/lib/crypto/relabel'

export async function getContentForMigration(): Promise<MigrationContent> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const reflectionCols = ['id', ...REFLECTION_FIELDS].join(', ')
  const [motions, swells, groups, milestones, reflections] = await Promise.all([
    supabase.from('motions').select('id, name').eq('user_id', user.id),
    supabase.from('swells').select('id, name').eq('user_id', user.id),
    supabase.from('groups').select('id, name').eq('user_id', user.id),
    supabase.from('milestones').select('id, name').eq('user_id', user.id),
    supabase.from('reflections').select(reflectionCols).eq('user_id', user.id),
  ])

  const firstErr = [motions, swells, groups, milestones, reflections].find(r => r.error)
  if (firstErr?.error) throw new Error(firstErr.error.message)

  return {
    motions: (motions.data ?? []) as MigrationContent['motions'],
    swells: (swells.data ?? []) as MigrationContent['swells'],
    groups: (groups.data ?? []) as MigrationContent['groups'],
    milestones: (milestones.data ?? []) as MigrationContent['milestones'],
    reflections: (reflections.data ?? []) as unknown as MigrationContent['reflections'],
  }
}

// Blind per-row writes. ~100 rows for a heavy tester, so a flat Promise.all of
// targeted updates is fine — and far simpler than a bulk upsert (which would
// need every NOT NULL column in the payload). The server can't read any value.
export async function writeMigratedContent(updates: MigrationUpdates): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const uid = user.id

  const tasks: PromiseLike<{ error: { message: string } | null }>[] = []
  for (const m of updates.motions) tasks.push(supabase.from('motions').update({ name: m.name }).eq('id', m.id).eq('user_id', uid))
  for (const s of updates.swells) tasks.push(supabase.from('swells').update({ name: s.name }).eq('id', s.id).eq('user_id', uid))
  for (const g of updates.groups) tasks.push(supabase.from('groups').update({ name: g.name }).eq('id', g.id).eq('user_id', uid))
  for (const ms of updates.milestones) tasks.push(supabase.from('milestones').update({ name: ms.name }).eq('id', ms.id).eq('user_id', uid))
  for (const r of updates.reflections) tasks.push(supabase.from('reflections').update(r.fields).eq('id', r.id).eq('user_id', uid))

  const results = await Promise.all(tasks)
  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }
  return {}
}

// Blind per-row rewrite for the relabel-after-lockout flow. Same shape as
// writeMigratedContent, but reflection fields may be null (the user's old journal
// text was sealed under the lost key and can't be recovered, so it's cleared).
// The server still can't read any value it writes.
export async function writeRelabeledContent(updates: RelabelUpdates): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const uid = user.id

  const tasks: PromiseLike<{ error: { message: string } | null }>[] = []
  for (const m of updates.motions) tasks.push(supabase.from('motions').update({ name: m.name }).eq('id', m.id).eq('user_id', uid))
  for (const s of updates.swells) tasks.push(supabase.from('swells').update({ name: s.name }).eq('id', s.id).eq('user_id', uid))
  for (const g of updates.groups) tasks.push(supabase.from('groups').update({ name: g.name }).eq('id', g.id).eq('user_id', uid))
  for (const ms of updates.milestones) tasks.push(supabase.from('milestones').update({ name: ms.name }).eq('id', ms.id).eq('user_id', uid))
  for (const r of updates.reflections) tasks.push(supabase.from('reflections').update(r.fields).eq('id', r.id).eq('user_id', uid))

  const results = await Promise.all(tasks)
  const failed = results.find(r => r.error)
  if (failed?.error) return { error: failed.error.message }
  return {}
}

// Flip the user into ciphertext mode — the LAST step, only after the rows are
// written. Guarded: refuse to flip unless an unlockable envelope exists (a
// recovery slot plus at least one primary slot), so we can never strand a user
// in ciphertext mode with no key.
export async function setEncEnabled(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const [{ data: settings }, { count: passkeyCount }] = await Promise.all([
    supabase.from('user_settings').select('enc_dek_recovery, enc_dek_password').eq('user_id', user.id).single(),
    supabase.from('user_key_passkeys').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const hasRecovery = !!settings?.enc_dek_recovery
  const hasPrimary = (passkeyCount ?? 0) > 0 || !!settings?.enc_dek_password
  if (!hasRecovery || !hasPrimary) {
    return { error: 'Encryption keys are not fully set up; refusing to enable encryption.' }
  }

  const { error } = await supabase.from('user_settings').update({ enc_enabled: true }).eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}
