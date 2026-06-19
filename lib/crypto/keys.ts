// Key lifecycle: build, wrap, unwrap, and manage the per-user DEK across unlock
// slots. Phase 2 — NO content is encrypted yet; this only stands up the keys.
//
// Spec: docs/specs/private-content-encryption.md
//
// Slot model (passkey-first):
//   - Passkey  (preferred, default): WebAuthn PRF output -> KEK. No password.
//   - Recovery (mandatory backup):   human recovery code -> PBKDF2 KEK.
//   - Password (optional fallback):  the account password -> PBKDF2 KEK.
//
// Tiers (enforced by the UI/wiring layer, not here — this module just provides
// the slot primitives, with the password slot always optional):
//   1  passkey + recovery              (best; no password surface)
//   2  passkey + recovery + password   (more recoverable, more surface)
//   3  password + recovery             (passkey unsupported / setup failed)
//
// Only WRAPPED blobs and PUBLIC salts ever leave the browser. The DEK, the
// password, the recovery code, and the PRF output never touch the network.

import {
  generateDek,
  deriveKek,
  wrapDek,
  unwrapDek,
  kekFromBytes,
  newSalt,
  saltToString,
  saltFromString,
  b64urlToBytes,
} from './content'

// Web Crypto wants a real ArrayBuffer; a sliced/over-allocated Uint8Array isn't
// always assignable to BufferSource across lib versions. Small data, free copy.
function toBuf(b: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(b.byteLength)
  new Uint8Array(ab).set(b)
  return ab
}

// A storable key slot: the DEK wrapped by a KEK, plus the KEK's public salt.
export type WrappedSlot = { wrapped: string; salt: string }

// ---------------------------------------------------------------------------
// recovery code
// ---------------------------------------------------------------------------

// Crockford base32 — no I, L, O, U, so it reads cleanly and decodes leniently.
const RECOVERY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const RECOVERY_LEN = 20 // 20 symbols × 5 bits ≈ 100 bits of entropy
const RECOVERY_GROUP = 5

// 256 % 32 === 0, so `% 32` over a random byte is unbiased across the alphabet.
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_LEN))
  let raw = ''
  for (let i = 0; i < RECOVERY_LEN; i++) raw += RECOVERY_ALPHABET[bytes[i] % 32]
  return raw.match(new RegExp(`.{1,${RECOVERY_GROUP}}`, 'g'))!.join('-')
}

// Fold a typed-back code to the canonical form the KEK was derived from:
// uppercase, Crockford's lenient O→0 / I,L→1, then drop dashes/spaces/anything
// else. A genuinely wrong code just yields a wrong KEK and fails the GCM tag.
export function canonicalizeRecoveryCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^0-9A-Z]/g, '')
}

// ---------------------------------------------------------------------------
// slot builders (return storable blobs; the DEK stays with the caller)
// ---------------------------------------------------------------------------

async function wrapWithSecret(dek: CryptoKey, secret: string): Promise<WrappedSlot> {
  const salt = newSalt()
  const kek = await deriveKek(secret, salt)
  return { wrapped: await wrapDek(dek, kek), salt: saltToString(salt) }
}

// The two secret-derived slots a brand-new user always gets: a fresh DEK, a
// mandatory recovery slot, and — only if a password was supplied — a password
// slot. Passkey is layered on separately (it needs a browser ceremony).
export type CoreSlots = {
  dek: CryptoKey
  recoveryCode: string // surface once; the user must save it
  recovery: WrappedSlot
  password?: WrappedSlot
}

export async function buildCoreSlots(opts: { password?: string } = {}): Promise<CoreSlots> {
  const dek = await generateDek()
  const recoveryCode = generateRecoveryCode()
  const recovery = await wrapWithSecret(dek, canonicalizeRecoveryCode(recoveryCode))
  const password = opts.password ? await wrapWithSecret(dek, opts.password) : undefined
  return { dek, recoveryCode, recovery, password }
}

// Add (or re-wrap, on password change) a password slot for an already-unlocked
// DEK — the Tier-2 opt-in and the Tier-3 path both land here.
export function addPasswordSlot(dek: CryptoKey, password: string): Promise<WrappedSlot> {
  return wrapWithSecret(dek, password)
}

// ---------------------------------------------------------------------------
// unlock (password / recovery)
// ---------------------------------------------------------------------------

export async function unlockWithPassword(password: string, slot: WrappedSlot): Promise<CryptoKey> {
  const kek = await deriveKek(password, saltFromString(slot.salt))
  return unwrapDek(slot.wrapped, kek)
}

export async function unlockWithRecoveryCode(code: string, slot: WrappedSlot): Promise<CryptoKey> {
  const kek = await deriveKek(canonicalizeRecoveryCode(code), saltFromString(slot.salt))
  return unwrapDek(slot.wrapped, kek)
}

// ---------------------------------------------------------------------------
// passkey (WebAuthn PRF) — browser-only; the ceremonies aren't unit-tested,
// but the PRF-output → KEK → wrap/unwrap path below is.
// ---------------------------------------------------------------------------

export class PasskeyUnsupportedError extends Error {
  constructor() {
    super('Passkeys are not supported on this device or browser.')
    this.name = 'PasskeyUnsupportedError'
  }
}

export class PrfUnavailableError extends Error {
  constructor() {
    super('This passkey did not return a usable PRF secret.')
    this.name = 'PrfUnavailableError'
  }
}

export function passkeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.credentials
  )
}

// The 32-byte PRF output is already a uniform secret, so it becomes the KEK
// directly (no PBKDF2). These two are the unit-testable core of the passkey path.
export async function wrapWithPrf(dek: CryptoKey, prfOutput: Uint8Array): Promise<string> {
  return wrapDek(dek, await kekFromBytes(prfOutput))
}

export async function unwrapWithPrf(wrapped: string, prfOutput: Uint8Array): Promise<CryptoKey> {
  return unwrapDek(wrapped, await kekFromBytes(prfOutput))
}

export type PasskeySlot = {
  credentialId: string // base64url WebAuthn credential id
  encDekPasskey: string // DEK wrapped by the PRF-derived KEK
  prfSalt: string // base64url salt fed to the PRF eval
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `prf` isn't in lib.dom yet
type PrfExtResults = any

function readPrfFirst(cred: PublicKeyCredential): Uint8Array | undefined {
  const ext = cred.getClientExtensionResults() as PrfExtResults
  const first = ext?.prf?.results?.first
  return first ? new Uint8Array(first) : undefined
}

// Run an assertion purely to read the PRF secret for a known credential.
async function evalPrf(credentialId: ArrayBuffer, prfSalt: Uint8Array): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: toBuf(newSalt()),
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prf extension
      extensions: { prf: { eval: { first: toBuf(prfSalt) } } } as any,
    },
  })) as PublicKeyCredential | null
  if (!assertion) throw new PrfUnavailableError()
  const out = readPrfFirst(assertion)
  if (!out || out.length < 32) throw new PrfUnavailableError()
  return out
}

// Passkey REGISTRATION now lives in lib/auth/passkey.ts — it routes through
// Supabase's WebAuthn ceremony (so the passkey is also a login credential) while
// requesting the PRF extension for the content key. This module keeps only the
// PRF wrap/unwrap primitives + the logged-in unlock below.

export async function unlockWithPasskey(slot: PasskeySlot): Promise<CryptoKey> {
  if (!passkeySupported()) throw new PasskeyUnsupportedError()
  const prfOut = await evalPrf(toBuf(b64urlToBytes(slot.credentialId)), saltFromString(slot.prfSalt))
  return unwrapWithPrf(slot.encDekPasskey, prfOut)
}
