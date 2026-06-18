import { describe, it, expect } from 'vitest'
import { encryptField, decryptField } from './content'
import {
  buildCoreSlots,
  addPasswordSlot,
  unlockWithPassword,
  unlockWithRecoveryCode,
  generateRecoveryCode,
  canonicalizeRecoveryCode,
  wrapWithPrf,
  unwrapWithPrf,
} from './keys'

// Two DEKs are "the same key" if a token encrypted by one decrypts under the
// other. CryptoKey objects aren't comparable directly, so we prove it by use.
async function sameKey(a: CryptoKey, b: CryptoKey): Promise<boolean> {
  const token = 'identity-probe ☕ 日本語'
  try {
    return (await decryptField(b, await encryptField(a, token))) === token
  } catch {
    return false
  }
}

describe('recovery code', () => {
  it('generates a grouped Crockford-base32 code', () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/)
  })

  it('generates distinct codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRecoveryCode()))
    expect(codes.size).toBe(50)
  })

  it('canonicalizes typos: case, dashes, spaces, and ambiguous O/I/L', () => {
    // O→0, I→1, L→1; dashes and spaces stripped; uppercased.
    expect(canonicalizeRecoveryCode('o1lI Ab-cd ')).toBe('011' + '1ABCD')
    expect(canonicalizeRecoveryCode('ABCDE-FGHJK')).toBe('ABCDEFGHJK')
  })
})

describe('core slots (recovery + optional password)', () => {
  it('recovery slot unlocks the same DEK', async () => {
    const core = await buildCoreSlots()
    expect(core.password).toBeUndefined()
    const unlocked = await unlockWithRecoveryCode(core.recoveryCode, core.recovery)
    expect(await sameKey(core.dek, unlocked)).toBe(true)
  })

  it('recovery unlocks even when the code is re-typed messily', async () => {
    const core = await buildCoreSlots()
    const messy = core.recoveryCode.toLowerCase().replace(/-/g, ' ')
    const unlocked = await unlockWithRecoveryCode(messy, core.recovery)
    expect(await sameKey(core.dek, unlocked)).toBe(true)
  })

  it('builds a password slot when a password is supplied, and both slots open the same DEK', async () => {
    const core = await buildCoreSlots({ password: 'correct horse battery staple' })
    expect(core.password).toBeDefined()
    const viaPw = await unlockWithPassword('correct horse battery staple', core.password!)
    const viaRecovery = await unlockWithRecoveryCode(core.recoveryCode, core.recovery)
    expect(await sameKey(core.dek, viaPw)).toBe(true)
    expect(await sameKey(core.dek, viaRecovery)).toBe(true)
    expect(await sameKey(viaPw, viaRecovery)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const core = await buildCoreSlots({ password: 'right-password' })
    await expect(unlockWithPassword('wrong-password', core.password!)).rejects.toThrow()
  })

  it('rejects a wrong recovery code', async () => {
    const core = await buildCoreSlots()
    await expect(unlockWithRecoveryCode('AAAAA-BBBBB-CCCCC-DDDDD', core.recovery)).rejects.toThrow()
  })
})

describe('adding a password slot later (Tier 2 opt-in / password change)', () => {
  it('wraps the existing DEK so the new password opens it', async () => {
    const core = await buildCoreSlots()
    const slot = await addPasswordSlot(core.dek, 'added-later')
    const unlocked = await unlockWithPassword('added-later', slot)
    expect(await sameKey(core.dek, unlocked)).toBe(true)
  })
})

describe('passkey PRF path (KEK-from-bytes core)', () => {
  it('wraps and unwraps the DEK with a simulated 32-byte PRF output', async () => {
    const core = await buildCoreSlots()
    const prf = crypto.getRandomValues(new Uint8Array(32))
    const wrapped = await wrapWithPrf(core.dek, prf)
    const unlocked = await unwrapWithPrf(wrapped, prf)
    expect(await sameKey(core.dek, unlocked)).toBe(true)
  })

  it('rejects a wrong PRF output', async () => {
    const core = await buildCoreSlots()
    const wrapped = await wrapWithPrf(core.dek, crypto.getRandomValues(new Uint8Array(32)))
    await expect(unwrapWithPrf(wrapped, crypto.getRandomValues(new Uint8Array(32)))).rejects.toThrow()
  })
})
