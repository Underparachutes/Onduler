// Orchestrates the relabel-after-lockout rewrite from the browser. Runs AFTER a
// fresh key has been set up (so `dek` is the new key): pull the user's content,
// rewrite the unreadable fields under the new key (blank placeholders for lost
// names, cleared text for lost journal entries, preserved values for anything
// still readable), and write it back. enc_enabled stayed true throughout the
// flow, so there's no flag to flip. Spec: docs/specs/private-content-encryption.md

import { buildRelabelUpdates, hasRelabelWork } from '@/lib/crypto/relabel'
import { getContentForMigration, writeRelabeledContent } from '@/app/actions/migrate'

export async function runRelabel(dek: CryptoKey): Promise<void> {
  const content = await getContentForMigration()
  const updates = await buildRelabelUpdates(dek, content)

  if (hasRelabelWork(updates)) {
    const res = await writeRelabeledContent(updates)
    if (res.error) throw new Error(res.error)
  }
  // The decrypt-test classifier makes this idempotent: a re-run leaves the rows
  // it already rewrote (now readable under the new key) untouched.
}
