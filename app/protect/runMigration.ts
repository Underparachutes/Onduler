// Orchestrates the one-time content migration from the browser: pull the user's
// rows, encrypt them with the in-memory DEK, write the ciphertext back, then —
// and only then — flip enc_enabled. Import this from the client component that
// drives the "Securing your content" step. Spec: docs/specs/private-content-encryption.md

import { buildMigrationUpdates, hasMigrationWork } from '@/lib/crypto/migrate'
import { getContentForMigration, writeMigratedContent, setEncEnabled } from '@/app/actions/migrate'

export async function runMigration(dek: CryptoKey): Promise<void> {
  const content = await getContentForMigration()
  const updates = await buildMigrationUpdates(dek, content)

  if (hasMigrationWork(updates)) {
    const res = await writeMigratedContent(updates)
    if (res.error) throw new Error(res.error)
  }

  // Last step: now that every row is ciphertext, switch the user into encrypted
  // mode. If this throws, a re-run re-encrypts nothing (idempotent) and retries.
  const flip = await setEncEnabled()
  if (flip.error) throw new Error(flip.error)
}
