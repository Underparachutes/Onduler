import { describe, it, expect } from 'vitest'
import {
  generateDek,
  deriveKek,
  encryptField,
  decryptField,
  isEncrypted,
  wrapDek,
  unwrapDek,
  encryptRow,
  decryptRow,
  newSalt,
  ENCRYPTED_FIELDS,
} from './content'

describe('field encryption', () => {
  it('round-trips a string', async () => {
    const dek = await generateDek()
    const blob = await encryptField(dek, 'drinking less')
    expect(isEncrypted(blob)).toBe(true)
    expect(blob.startsWith('enc:v1:')).toBe(true)
    expect(blob).not.toContain('drinking') // plaintext is not present
    expect(await decryptField(dek, blob)).toBe('drinking less')
  })

  it('round-trips unicode and emoji', async () => {
    const dek = await generateDek()
    const text = 'café ☕ 日本語 — therapy 🫶'
    expect(await decryptField(dek, await encryptField(dek, text))).toBe(text)
  })

  it('uses a fresh IV each time', async () => {
    const dek = await generateDek()
    const a = await encryptField(dek, 'same')
    const b = await encryptField(dek, 'same')
    expect(a).not.toBe(b) // different ciphertext...
    expect(await decryptField(dek, a)).toBe('same') // ...same plaintext
    expect(await decryptField(dek, b)).toBe('same')
  })

  it('passes through legacy plaintext and empty values', async () => {
    const dek = await generateDek()
    expect(await decryptField(dek, 'plain legacy name')).toBe('plain legacy name')
    expect(await decryptField(dek, '')).toBe('')
    expect(isEncrypted('plain')).toBe(false)
    expect(isEncrypted(null)).toBe(false)
  })

  it('rejects tampered ciphertext', async () => {
    const dek = await generateDek()
    const parts = (await encryptField(dek, 'secret')).split(':') // enc:v1:iv:ct
    parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1) // alter first ciphertext byte
    await expect(decryptField(dek, parts.join(':'))).rejects.toThrow()
  })

  it('fails to decrypt with a different key', async () => {
    const dek1 = await generateDek()
    const dek2 = await generateDek()
    const blob = await encryptField(dek1, 'secret')
    await expect(decryptField(dek2, blob)).rejects.toThrow()
  })
})

describe('envelope: wrap/unwrap DEK with KEK (key slots)', () => {
  it('a wrapped DEK unwraps with the right KEK and decrypts fields', async () => {
    const dek = await generateDek()
    const blob = await encryptField(dek, 'job hunt')
    const salt = newSalt()
    const wrapped = await wrapDek(dek, await deriveKek('correct horse battery', salt))
    expect(isEncrypted(wrapped)).toBe(true)

    // unlock from scratch: same secret + salt -> same KEK -> recovers the DEK
    const recovered = await unwrapDek(wrapped, await deriveKek('correct horse battery', salt))
    expect(await decryptField(recovered, blob)).toBe('job hunt')
  })

  it('unwrap fails with the wrong password', async () => {
    const dek = await generateDek()
    const salt = newSalt()
    const wrapped = await wrapDek(dek, await deriveKek('right', salt))
    await expect(unwrapDek(wrapped, await deriveKek('wrong', salt))).rejects.toThrow()
  })

  it('multi-slot: the same DEK wrapped by two KEKs both recover it', async () => {
    const dek = await generateDek()
    const blob = await encryptField(dek, 'therapy')
    const pwSalt = newSalt()
    const rcSalt = newSalt()
    const pwWrapped = await wrapDek(dek, await deriveKek('password', pwSalt))
    const rcWrapped = await wrapDek(dek, await deriveKek('recovery-code', rcSalt))

    const viaPw = await unwrapDek(pwWrapped, await deriveKek('password', pwSalt))
    const viaRc = await unwrapDek(rcWrapped, await deriveKek('recovery-code', rcSalt))
    expect(await decryptField(viaPw, blob)).toBe('therapy')
    expect(await decryptField(viaRc, blob)).toBe('therapy')
  })
})

describe('row helpers', () => {
  it('encrypts only the listed fields and round-trips', async () => {
    const dek = await generateDek()
    const motion = { id: 'm1', name: 'Meditate', points: 3, group_id: null as string | null }
    const encrypted = await encryptRow(dek, motion, ENCRYPTED_FIELDS.motions)
    expect(isEncrypted(encrypted.name)).toBe(true)
    expect(encrypted.points).toBe(3) // untouched
    expect(encrypted.group_id).toBe(null) // untouched
    const decrypted = await decryptRow(dek, encrypted, ENCRYPTED_FIELDS.motions)
    expect(decrypted.name).toBe('Meditate')
  })

  it('leaves null and legacy-plaintext fields untouched (migration safety)', async () => {
    const dek = await generateDek()
    const fields = ['expectation_text', 'observation_text', 'body_text'] as const
    const row = {
      expectation_text: null as string | null,
      observation_text: 'legacy plaintext entry', // written before encryption shipped
      body_text: await encryptField(dek, 'encrypted entry'),
    }
    const decrypted = await decryptRow(dek, row, fields)
    expect(decrypted.expectation_text).toBe(null)
    expect(decrypted.observation_text).toBe('legacy plaintext entry')
    expect(decrypted.body_text).toBe('encrypted entry')
  })
})
