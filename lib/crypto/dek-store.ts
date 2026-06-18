// Holds the unlocked DEK for the session. Two layers:
//   - in memory: the live key used this session (kept extractable so new slots
//     can be wrapped from it — e.g. adding a passkey after a password unlock).
//   - IndexedDB: a NON-extractable cached copy so a reload doesn't force a
//     re-unlock. It can still encrypt/decrypt (Phase 3/4); to add a slot from
//     it, the user re-unlocks. Cleared on logout.
//
// No plaintext key ever touches localStorage or the network. Spec:
// docs/specs/private-content-encryption.md

let memoryDek: CryptoKey | null = null

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

function idbPut(key: CryptoKey): Promise<void> {
  return openDb().then(
    db =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(key, RECORD)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function idbGet(): Promise<CryptoKey | null> {
  return openDb().then(
    db =>
      new Promise<CryptoKey | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(RECORD)
        req.onsuccess = () => resolve((req.result as CryptoKey) ?? null)
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

export async function setDek(dek: CryptoKey): Promise<void> {
  memoryDek = dek
  if (!hasIdb()) return
  try {
    await idbPut(await nonExtractableClone(dek))
  } catch {
    // Non-extractable original or IndexedDB unavailable (private mode, etc.):
    // fall back to memory-only. A reload then just needs a fresh unlock.
  }
}

export async function getDek(): Promise<CryptoKey | null> {
  if (memoryDek) return memoryDek
  if (!hasIdb()) return null
  try {
    memoryDek = await idbGet()
  } catch {
    memoryDek = null
  }
  return memoryDek
}

export function hasDekInMemory(): boolean {
  return memoryDek !== null
}

export async function clearDek(): Promise<void> {
  memoryDek = null
  if (!hasIdb()) return
  try {
    await idbDelete()
  } catch {
    // best-effort
  }
}
