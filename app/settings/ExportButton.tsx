'use client'

import { useState } from 'react'
import { getExportData } from '@/app/actions/export-data'
import { useContentCrypto } from '@/app/components/useContentCrypto'
import { assembleExport } from '@/lib/export-build'

// Client-side export: the server hands back ciphertext rows, the browser
// decrypts the content fields with the in-memory key, assembles the v2 payload,
// and downloads it. So the user's backup is plaintext and readable even after
// migration (when the server itself can no longer read the data). Pre-migration
// the decrypt is a pass-through, so the file is identical to before plus
// anchors. Spec: docs/specs/private-content-encryption.md (client-side export).
export function ExportButton() {
  const { decryptContent } = useContentCrypto()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setBusy(true)
    setError(null)
    try {
      const raw = await getExportData()
      if (!raw) {
        setError('Could not load your data. Try again.')
        return
      }

      const payload = await assembleExport(raw, v => decryptContent(v), new Date().toISOString())

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `onduler-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={busy}
        className="text-sm text-th-secondary hover:underline disabled:opacity-50"
      >
        {busy ? 'Preparing…' : 'Download'}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  )
}
