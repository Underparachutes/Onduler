// Holds the unlocked DEK for the session. Two layers:
//   - in memory: the live key used this session (kept extractable so new slots
//     can be wrapped from it — e.g. adding a passkey after a password unlock).
//   - IndexedDB: a NON-extractable cached copy so a reload doesn't force a
//     re-unlock. It can still encrypt/decrypt (Phase 3/4); to add a slot from
//     it, the user re-unlocks. Cleared on logout.
//
// The cache is SCOPED TO THE USER id. A device that's seen more than one account
// (or an account that was deleted + recreated) must never reuse a stale/foreign
// DEK: a wrong key silently "succeeds" as unlocked but can't actually decrypt,
// so content renders blank with no unlock prompt. getDek therefore returns the
// cached key only when its stored userId matches the caller's, and drops any
// mismatched or legacy (unkeyed) record. The OTP password-reset path doesn't
// fire SIGNED_OUT, so this scoping — not logout — is what guarantees safety.
//
// No plaintext key ever touches localStorage or the network. Spec:
// docs/specs/private-content-encryption.md

let memoryDek: CryptoKey | null = null
let memoryUserId: string | null = null

type DekRecord = { key: CryptoKey; userId: string }

const DB_NAME = 'onduler-keys'
const STORE = 'dek'
const RECORD = 'current'

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(rec: DekRecord): Promise<void> {
  return openDb().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(rec, RECORD)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function idbGet(): Promise<DekRecord | null> {
  return openDb().then(
    db =>
      new Promise<DekRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(RECORD)
        req.onsuccess = () => {
          const v = req.result as DekRecord | CryptoKey | undefined
          // Legacy records were a bare CryptoKey (no userId) — treat as no match.
          resolve(v && typeof (v as DekRecord).userId === 'string' ? (v as DekRecord) : null)
        }
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbDelete(): Promise<void> {
  return openDb().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(RECORD)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

// Cache a NON-extractable clone of the DEK for at-rest safety in IndexedDB,
// while keeping the extractable original live in memory for this session.
async function nonExtractableClone(dek: CryptoKey): Promise<CryptoKey> {
  const raw = await crypto.subtle.exportKey('raw', dek) // requires the original to be extractable
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function setDek(dek: CryptoKey, userId: string): Promise<void> {
  memoryDek = dek
  memoryUserId = userId
  if (!hasIdb()) return
  try {
    await idbPut({ key: await nonExtractableClone(dek), userId })
  } catch {
    // Non-extractable original or IndexedDB unavailable (private mode, etc.):
    // fall back to memory-only. A reload then just needs a fresh unlock.
  }
}

// Returns the cached DEK only for the SAME user. A null/empty userId (no
// session) never serves a cached key; a mismatched or legacy record is dropped.
export async function getDek(userId: string | null): Promise<CryptoKey | null> {
  if (!userId) return null
  if (memoryDek && memoryUserId === userId) return memoryDek
  if (!hasIdb()) return null
  try {
    const rec = await idbGet()
    if (rec && rec.userId === userId) {
      memoryDek = rec.key
      memoryUserId = userId
      return memoryDek
    }
    // Foreign / stale / legacy record — purge so it can't masquerade as unlocked.
    memoryDek = null
    memoryUserId = null
    await idbDelete()
    return null
  } catch {
    return null
  }
}

export function hasDekInMemory(): boolean {
  return memoryDek !== null
}

export async function clearDek(): Promise<void> {
  memoryDek = null
  memoryUserId = null
  if (!hasIdb()) return
  try {
    await idbDelete()
  } catch {
    // best-effort
  }
}
