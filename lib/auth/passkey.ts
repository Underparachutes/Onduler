'use client'

// Passkey ceremonies routed through Supabase Auth (experimental passkey API).
//
// One credential, one Face ID, two jobs: it authenticates the account (Supabase
// issues a session) AND yields the content-encryption secret via the WebAuthn
// PRF extension. We use Supabase's two-step API (start* → run the ceremony
// ourselves → verify*) precisely so we can add the `prf` extension to the
// ceremony Supabase otherwise controls. Verified working end-to-end against the
// beta (see the throwaway spike). Spec: docs/specs/private-content-encryption.md
//
// The PRF salt is a fixed app-level constant (NOT per-credential): discoverable
// sign-in doesn't know the credential up front, so a constant salt lets login
// derive the same secret in a single ceremony. Safe — PRF entropy comes from the
// authenticator's internal secret; the salt only domain-separates.

import { createClient } from '@/lib/supabase/client'
import {
  wrapWithPrf,
  passkeySupported,
  PasskeyUnsupportedError,
  PrfUnavailableError,
  type PasskeySlot,
} from '@/lib/crypto/keys'
import { bytesToB64url, b64urlToBytes } from '@/lib/crypto/content'

const PRF_SALT = new TextEncoder().encode('onduler-content-key-v1')

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- prf + experimental passkey API aren't typed yet
type Any = any

function toBuf(b: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(b.byteLength)
  new Uint8Array(ab).set(b)
  return ab
}
const b64urlToBuf = (s: string): ArrayBuffer => toBuf(b64urlToBytes(s))
const PRF_SALT_BUF = () => toBuf(PRF_SALT)

function passkeyApi() {
  const api = (createClient().auth as Any).passkey
  if (!api) throw new PasskeyUnsupportedError()
  return api
}

function readPrf(cred: PublicKeyCredential): Uint8Array | undefined {
  const ext = cred.getClientExtensionResults() as Any
  const first = ext?.prf?.results?.first
  return first ? new Uint8Array(first) : undefined
}

// Strip clientExtensionResults so the PRF secret never reaches Supabase and an
// unexpected extension can't trip its verifier. toJSON() (when present) is the
// W3C serialization Supabase's server library expects.
function serialize(cred: PublicKeyCredential): unknown {
  const c = cred as Any
  let json: Any
  if (typeof c.toJSON === 'function') {
    json = c.toJSON()
  } else {
    const r = cred.response as Any
    const base = { id: cred.id, rawId: bytesToB64url(new Uint8Array(cred.rawId)), type: cred.type }
    json = r.attestationObject
      ? { ...base, response: { clientDataJSON: bytesToB64url(new Uint8Array(r.clientDataJSON)), attestationObject: bytesToB64url(new Uint8Array(r.attestationObject)), transports: r.getTransports?.() ?? [] } }
      : { ...base, response: { clientDataJSON: bytesToB64url(new Uint8Array(r.clientDataJSON)), authenticatorData: bytesToB64url(new Uint8Array(r.authenticatorData)), signature: bytesToB64url(new Uint8Array(r.signature)), userHandle: r.userHandle ? bytesToB64url(new Uint8Array(r.userHandle)) : null } }
  }
  return { ...json, clientExtensionResults: {} }
}

function withPrf(opts: Any): Any {
  return { ...(opts.extensions ?? {}), prf: { eval: { first: PRF_SALT_BUF() } } }
}

// Some platforms surface PRF only on a follow-up get(); re-assert against the
// just-created credential to read it.
async function evalPrf(rawId: ArrayBuffer): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: toBuf(crypto.getRandomValues(new Uint8Array(16))),
      allowCredentials: [{ type: 'public-key', id: rawId }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: PRF_SALT_BUF() } } } as Any,
    },
  })) as PublicKeyCredential | null
  const prf = assertion ? readPrf(assertion) : undefined
  if (!prf || prf.length < 32) throw new PrfUnavailableError()
  return prf
}

// Register a passkey with Supabase Auth AND wrap the DEK into it (one ceremony).
// Requires a confirmed, signed-in user (Supabase rule) — call from key setup
// right after email-OTP signup.
export async function registerPasskey(dek: CryptoKey): Promise<PasskeySlot> {
  if (!passkeySupported()) throw new PasskeyUnsupportedError()
  const api = passkeyApi()

  const { data, error } = await api.startRegistration()
  if (error) throw error
  const opts = data.options as Any
  const publicKey: Any = {
    ...opts,
    challenge: b64urlToBuf(opts.challenge),
    user: { ...opts.user, id: b64urlToBuf(opts.user.id) },
    excludeCredentials: (opts.excludeCredentials ?? []).map((c: Any) => ({ ...c, id: b64urlToBuf(c.id) })),
    extensions: withPrf(opts),
  }
  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!cred) throw new PrfUnavailableError()

  let prf = readPrf(cred)
  if (!prf || prf.length < 32) prf = await evalPrf(cred.rawId)

  const v = await api.verifyRegistration({ challengeId: data.challenge_id, credential: serialize(cred) })
  if (v.error) throw v.error

  return {
    credentialId: bytesToB64url(new Uint8Array(cred.rawId)),
    encDekPasskey: await wrapWithPrf(dek, prf),
    prfSalt: bytesToB64url(PRF_SALT),
  }
}

// Sign in with a passkey (discoverable) AND read the content secret in the same
// ceremony. Supabase issues + persists the session via verifyAuthentication;
// the returned prfOutput unwraps the DEK (caller fetches the wrapped blob after).
export async function authenticatePasskey(): Promise<{ credentialId: string; prfOutput: Uint8Array }> {
  if (!passkeySupported()) throw new PasskeyUnsupportedError()
  const api = passkeyApi()

  const { data, error } = await api.startAuthentication()
  if (error) throw error
  const opts = data.options as Any
  const publicKey: Any = {
    ...opts,
    challenge: b64urlToBuf(opts.challenge),
    allowCredentials: (opts.allowCredentials ?? []).map((c: Any) => ({ ...c, id: b64urlToBuf(c.id) })),
    extensions: withPrf(opts),
  }
  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
  if (!assertion) throw new PrfUnavailableError()

  const prf = readPrf(assertion)
  if (!prf || prf.length < 32) throw new PrfUnavailableError()

  const v = await api.verifyAuthentication({ challengeId: data.challenge_id, credential: serialize(assertion) })
  if (v.error) throw v.error

  return { credentialId: bytesToB64url(new Uint8Array(assertion.rawId)), prfOutput: prf }
}
