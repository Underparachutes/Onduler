// Client-side content encryption (operator-blind E2EE).
//
// Spec: docs/specs/private-content-encryption.md
//
// This module encrypts a small set of content fields (motion/swell/group/
// milestone names + anchor journal text) in the browser, so the server only
// ever stores ciphertext the operator cannot read. It runs in the browser
// (Web Crypto) and in Node 20+ (for tests) — both expose the same standard
// `crypto.subtle` API. It never imports node:crypto and has no dependencies.
//
// Envelope model (multi-slot): a per-user random DEK encrypts the fields. The
// DEK is itself wrapped by one or more KEKs — one per unlock method (passkey,
// recovery code, password). The server stores only the wrapped DEK(s); no KEK
// or password ever leaves the browser.
//
// Phase 1 ships these primitives only — nothing is wired into the app yet.

const PREFIX = 'enc:'
const VERSION = 'v1'
const KEY_BITS = 256
const IV_BYTES = 12 // 96-bit nonce, the standard size for AES-GCM
const SALT_BYTES = 16
// PBKDF2 work factor. Tunable: higher = slower to brute-force a stolen wrapped
// DEK, but also slower to unlock on a weak phone. ~OWASP 2023 floor for SHA-256.
const PBKDF2_ITERATIONS = 600_000

const enc = new TextEncoder()
const dec = new TextDecoder()

// The fields we encrypt, per table. Single source of truth — read by the
// write/read paths in later phases. Everything else stays plaintext.
export const ENCRYPTED_FIELDS = {
  motions: ['name'],
  swells: ['name'],
  groups: ['name'],
  milestones: ['name'],
  reflections: ['expectation_text', 'observation_text', 'intention_text', 'body_text', 'prompt_text'],
} as const

// ---------------------------------------------------------------------------
// low-level helpers
// ---------------------------------------------------------------------------

function getSubtle(): SubtleCrypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('Web Crypto (crypto.subtle) is unavailable in this environment.')
  return c.subtle
}

function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n))
}

// Copy into a fresh ArrayBuffer. Web Crypto wants BufferSource, and TS's
// generic Uint8Array<ArrayBufferLike> isn't assignable to it across lib
// versions; a plain ArrayBuffer always is. Field-sized data, so the copy is free.
function toArrayBuffer(b: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(b.byteLength)
  new Uint8Array(ab).set(b)
  return ab
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// On-disk format: `enc:v1:<base64url-iv>:<base64url-ciphertext+tag>`.
// base64url contains no ':' so splitting on ':' is unambiguous.
async function aesGcmEncrypt(key: CryptoKey, data: Uint8Array): Promise<string> {
  const iv = randomBytes(IV_BYTES)
  const ct = await getSubtle().encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(data))
  return `${PREFIX}${VERSION}:${bytesToB64url(iv)}:${bytesToB64url(new Uint8Array(ct))}`
}

async function aesGcmDecrypt(key: CryptoKey, blob: string): Promise<Uint8Array> {
  const parts = blob.split(':')
  if (parts.length !== 4 || `${parts[0]}:` !== PREFIX || parts[1] !== VERSION) {
    throw new Error('Not a recognized encrypted value.')
  }
  const iv = b64urlToBytes(parts[2])
  const pt = await getSubtle().decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(b64urlToBytes(parts[3])))
  return new Uint8Array(pt)
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

// True for values this module produced. Anything else (legacy plaintext, null)
// is passed through untouched — this is what makes lazy migration safe.
export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

// A fresh random Data Encryption Key. Extractable so it can be wrapped into
// key slots; held only in browser memory at runtime, never sent to the server.
export function generateDek(): Promise<CryptoKey> {
  return getSubtle().generateKey({ name: 'AES-GCM', length: KEY_BITS }, true, ['encrypt', 'decrypt'])
}

// Derive a Key-Encryption-Key from an unlock secret (password / recovery code /
// passkey PRF output) and a per-slot salt. The KEK only wraps/unwraps the DEK.
export async function deriveKek(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await getSubtle().importKey('raw', toArrayBuffer(enc.encode(secret)), 'PBKDF2', false, ['deriveKey'])
  return getSubtle().deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Wrap the DEK with a KEK -> a storable blob (one key slot). Wrapping a key is
// just encrypting its raw bytes.
export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await getSubtle().exportKey('raw', dek))
  return aesGcmEncrypt(kek, raw)
}

// Reverse of wrapDek. Throws if the KEK is wrong (wrong password / code) — the
// GCM tag check fails, which is how we detect a bad unlock attempt.
export async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<CryptoKey> {
  const raw = await aesGcmDecrypt(kek, wrapped)
  return getSubtle().importKey('raw', toArrayBuffer(raw), { name: 'AES-GCM', length: KEY_BITS }, true, ['encrypt', 'decrypt'])
}

export async function encryptField(dek: CryptoKey, plaintext: string): Promise<string> {
  return aesGcmEncrypt(dek, enc.encode(plaintext))
}

// Pass-through on anything not produced by this module (legacy plaintext rows
// mid-migration, or already-decrypted values).
export async function decryptField(dek: CryptoKey, value: string): Promise<string> {
  if (!isEncrypted(value)) return value
  return dec.decode(await aesGcmDecrypt(dek, value))
}

// Encrypt only the named string fields of a row; leave numbers, nulls, and
// everything else untouched. Mirror of decryptRow.
export async function encryptRow<T extends Record<string, unknown>>(
  dek: CryptoKey,
  row: T,
  fields: readonly (keyof T)[],
): Promise<T> {
  const out = { ...row }
  for (const f of fields) {
    const v = row[f]
    if (typeof v === 'string') out[f] = (await encryptField(dek, v)) as T[keyof T]
  }
  return out
}

export async function decryptRow<T extends Record<string, unknown>>(
  dek: CryptoKey,
  row: T,
  fields: readonly (keyof T)[],
): Promise<T> {
  const out = { ...row }
  for (const f of fields) {
    const v = row[f]
    if (typeof v === 'string') out[f] = (await decryptField(dek, v)) as T[keyof T]
  }
  return out
}

// Salt helpers — salts are public, stored alongside each wrapped DEK as text.
export function newSalt(): Uint8Array {
  return randomBytes(SALT_BYTES)
}

export function saltToString(salt: Uint8Array): string {
  return bytesToB64url(salt)
}

export function saltFromString(s: string): Uint8Array {
  return b64urlToBytes(s)
}
