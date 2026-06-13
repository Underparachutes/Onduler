'use client'

import { useState } from 'react'
import { getIsIOS, getIsAndroid, getIsIOSSafari, triggerAndroidInstall, hasDeferredPrompt } from '@/lib/install'

export function InstallInstructions({ onDone }: { onDone?: () => void }) {
  const [installOutcome, setInstallOutcome] = useState<string | null>(null)
  const isIOS = getIsIOS()
  const isAndroid = getIsAndroid()

  async function handleAndroidInstall() {
    const outcome = await triggerAndroidInstall()
    if (outcome) setInstallOutcome(outcome)
    if (outcome === 'accepted' && onDone) onDone()
  }

  if (isAndroid && hasDeferredPrompt()) {
    return (
      <div className="flex flex-col gap-4">
        {installOutcome === 'accepted' ? (
          <p className="text-sm text-th-text">Installed. You can open Onduler from your home screen.</p>
        ) : (
          <>
            <button
              onClick={handleAndroidInstall}
              className="w-full rounded-lg bg-th-btn py-3 text-sm font-medium text-th-btn-text transition-all hover:bg-th-btn-hover active:scale-[0.97]"
            >
              Install
            </button>
            <p className="text-xs text-th-faint">Adds Onduler to your home screen. Opens like an app.</p>
          </>
        )}
      </div>
    )
  }

  if (isAndroid) {
    return (
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-th-muted">Android</h2>
        <ol className="flex flex-col gap-3 text-sm text-th-text">
          <li className="flex gap-3">
            <span className="shrink-0 text-th-faint">1.</span>
            <span>Tap the <strong>three-dot menu</strong> in the top right</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-th-faint">2.</span>
            <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-th-faint">3.</span>
            <span>Tap <strong>Install</strong></span>
          </li>
        </ol>
      </div>
    )
  }

  if (isIOS) {
    const isSafari = getIsIOSSafari()
    return (
      <div>
        <ol className="flex flex-col gap-3 text-sm text-th-text">
          <li className="flex gap-3">
            <span className="shrink-0 text-th-faint">1.</span>
            <span>
              Tap the <strong>Share</strong> button
              <span className="ml-1 inline-block align-middle text-th-muted" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-th-faint">2.</span>
            <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 text-th-faint">3.</span>
            <span>Tap <strong>Add</strong> in the top right</span>
          </li>
        </ol>
        {!isSafari && (
          <p className="mt-3 text-xs text-th-faint">In Chrome or Firefox, the Share button is in the address bar or the three-dot menu.</p>
        )}
        <div className="mt-6 flex justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce text-th-muted">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </div>
      </div>
    )
  }

  return null
}
