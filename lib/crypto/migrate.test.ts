import { describe, it, expect } from 'vitest'
import { generateDek, encryptField, decryptField, isEncrypted } from './content'
import { buildMigrationUpdates, hasMigrationWork, type MigrationContent } from './migrate'

function emptyContent(): MigrationContent {
  return { motions: [], swells: [], groups: [], milestones: [], reflections: [] }
}

describe('buildMigrationUpdates', () => {
  it('encrypts plaintext name fields across the simple tables', async () => {
    const dek = await generateDek()
    const content: MigrationContent = {
      ...emptyContent(),
      motions: [{ id: 'm1', name: 'therapy' }],
      swells: [{ id: 's1', name: 'Health' }],
      groups: [{ id: 'g1', name: 'Morning' }],
      milestones: [{ id: 'w1', name: 'publish weekly' }],
    }

    const updates = await buildMigrationUpdates(dek, content)

    expect(updates.motions).toHaveLength(1)
    expect(isEncrypted(updates.motions[0].name)).toBe(true)
    expect(await decryptField(dek, updates.motions[0].name)).toBe('therapy')
    expect(await decryptField(dek, updates.swells[0].name)).toBe('Health')
    expect(await decryptField(dek, updates.groups[0].name)).toBe('Morning')
    expect(await decryptField(dek, updates.milestones[0].name)).toBe('publish weekly')
  })

  it('encrypts only the non-null reflection text fields', async () => {
    const dek = await generateDek()
    const content: MigrationContent = {
      ...emptyContent(),
      reflections: [
        {
          id: 'r1',
          expectation_text: 'a steady week',
          observation_text: null,
          intention_text: '',
          body_text: 'felt off on tuesday',
          prompt_text: null,
        },
      ],
    }

    const updates = await buildMigrationUpdates(dek, content)
    expect(updates.reflections).toHaveLength(1)
    const { fields } = updates.reflections[0]
    // Only the two non-empty, non-null fields are present.
    expect(Object.keys(fields).sort()).toEqual(['body_text', 'expectation_text'])
    expect(await decryptField(dek, fields.expectation_text!)).toBe('a steady week')
    expect(await decryptField(dek, fields.body_text!)).toBe('felt off on tuesday')
  })

  it('is idempotent: already-encrypted fields are skipped (no double-encrypt)', async () => {
    const dek = await generateDek()
    const already = await encryptField(dek, 'therapy')
    const content: MigrationContent = {
      ...emptyContent(),
      motions: [
        { id: 'm1', name: already }, // already ciphertext
        { id: 'm2', name: 'job hunt' }, // still plaintext
      ],
    }

    const updates = await buildMigrationUpdates(dek, content)
    // Only the plaintext row is in the write set.
    expect(updates.motions).toHaveLength(1)
    expect(updates.motions[0].id).toBe('m2')
    // And the skipped one still decrypts in a single pass (was not re-wrapped).
    expect(await decryptField(dek, already)).toBe('therapy')
  })

  it('produces no work for an already-migrated / empty dataset', async () => {
    const dek = await generateDek()
    const already = await encryptField(dek, 'Health')
    const content: MigrationContent = {
      ...emptyContent(),
      swells: [{ id: 's1', name: already }],
      reflections: [
        { id: 'r1', expectation_text: null, observation_text: '', intention_text: null, body_text: null, prompt_text: null },
      ],
    }

    const updates = await buildMigrationUpdates(dek, content)
    expect(hasMigrationWork(updates)).toBe(false)
    expect(updates.swells).toHaveLength(0)
    expect(updates.reflections).toHaveLength(0)
  })
})
