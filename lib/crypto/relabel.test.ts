import { describe, it, expect } from 'vitest'
import { generateDek, encryptField, decryptField, isEncrypted } from './content'
import { buildRelabelUpdates, hasRelabelWork, RELABEL_PLACEHOLDERS, type RelabelUpdates } from './relabel'
import type { MigrationContent } from './migrate'

function emptyContent(): MigrationContent {
  return { motions: [], swells: [], groups: [], milestones: [], reflections: [] }
}

describe('buildRelabelUpdates', () => {
  it('blanks names sealed under the LOST key with a placeholder under the new key', async () => {
    const oldDek = await generateDek() // the lost key
    const newDek = await generateDek() // the freshly set-up key
    const content: MigrationContent = {
      ...emptyContent(),
      motions: [{ id: 'm1', name: await encryptField(oldDek, 'therapy') }],
      swells: [{ id: 's1', name: await encryptField(oldDek, 'Health') }],
      groups: [{ id: 'g1', name: await encryptField(oldDek, 'Morning') }],
      milestones: [{ id: 'w1', name: await encryptField(oldDek, 'publish weekly') }],
    }

    const updates = await buildRelabelUpdates(newDek, content)

    expect(isEncrypted(updates.motions[0].name)).toBe(true)
    expect(await decryptField(newDek, updates.motions[0].name)).toBe(RELABEL_PLACEHOLDERS.motions)
    expect(await decryptField(newDek, updates.swells[0].name)).toBe(RELABEL_PLACEHOLDERS.swells)
    expect(await decryptField(newDek, updates.groups[0].name)).toBe(RELABEL_PLACEHOLDERS.groups)
    expect(await decryptField(newDek, updates.milestones[0].name)).toBe(RELABEL_PLACEHOLDERS.milestones)
  })

  it('preserves readable plaintext names by re-encrypting under the new key', async () => {
    const newDek = await generateDek()
    const content: MigrationContent = {
      ...emptyContent(),
      motions: [{ id: 'm1', name: 'job hunt' }], // plaintext (e.g. token-refresh-race fallout)
    }

    const updates = await buildRelabelUpdates(newDek, content)
    expect(updates.motions).toHaveLength(1)
    expect(await decryptField(newDek, updates.motions[0].name)).toBe('job hunt')
  })

  it('is idempotent: names already readable under the new key are skipped', async () => {
    const newDek = await generateDek()
    const already = await encryptField(newDek, 'Untitled motion')
    const content: MigrationContent = {
      ...emptyContent(),
      motions: [{ id: 'm1', name: already }],
    }

    const updates = await buildRelabelUpdates(newDek, content)
    expect(updates.motions).toHaveLength(0) // a re-run leaves the fixed row alone
  })

  it('clears unrecoverable journal text but preserves readable text', async () => {
    const oldDek = await generateDek()
    const newDek = await generateDek()
    const content: MigrationContent = {
      ...emptyContent(),
      reflections: [
        {
          id: 'r1',
          expectation_text: await encryptField(oldDek, 'a steady week'), // lost → cleared
          observation_text: 'plaintext note', // readable → preserved
          intention_text: '', // empty → skip
          body_text: await encryptField(newDek, 'already fixed'), // new key → skip
          prompt_text: null, // null → skip
        },
      ],
    }

    const updates = await buildRelabelUpdates(newDek, content)
    const { fields } = updates.reflections[0]
    expect(Object.keys(fields).sort()).toEqual(['expectation_text', 'observation_text'])
    expect(fields.expectation_text).toBeNull()
    expect(await decryptField(newDek, fields.observation_text!)).toBe('plaintext note')
  })

  it('produces no work when every field is already readable under the new key', async () => {
    const newDek = await generateDek()
    const content: MigrationContent = {
      ...emptyContent(),
      swells: [{ id: 's1', name: await encryptField(newDek, 'Health') }],
      reflections: [
        { id: 'r1', expectation_text: null, observation_text: '', intention_text: null, body_text: null, prompt_text: null },
      ],
    }

    const updates: RelabelUpdates = await buildRelabelUpdates(newDek, content)
    expect(hasRelabelWork(updates)).toBe(false)
  })
})
