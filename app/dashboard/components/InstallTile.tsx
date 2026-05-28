'use client'

import { useState } from 'react'
import { useInstallState } from '@/lib/install'
import { InstallInstructions } from '@/app/components/InstallInstructions'

export function InstallTile() {
  const { showTile, dismiss } = useInstallState()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!showTile) return null

  if (sheetOpen) {
    return (
      <div className="mt-4 rounded-lg border border-th-border-soft bg-th-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-th-text">Install Onduler</p>
          <button
            onClick={() => setSheetOpen(false)}
            className="text-sm text-th-muted transition-colors hover:text-th-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <InstallInstructions onDone={dismiss} />
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-lg border border-th-border-soft p-4">
      <p className="mb-3 text-sm text-th-secondary">Onduler lives best on your home screen.</p>
      <div className="flex gap-3">
        <button
          onClick={() => setSheetOpen(true)}
          className="rounded-lg bg-th-btn px-3 py-1.5 text-sm font-medium text-th-btn-text transition-colors hover:bg-th-btn-hover active:scale-[0.97]"
        >
          Show me how
        </button>
        <button
          onClick={dismiss}
          className="text-sm text-th-faint transition-colors hover:text-th-muted"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
